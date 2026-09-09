$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"
$appSettingsPath = Join-Path $projectRoot "appsettings.json"
$tempJsonPath = Join-Path $env:TEMP "turkiye-il-ilce.json"
$tempSqlPath = Join-Path $env:TEMP "neyeihtiyacvar-turkiye-konum.sql"

$sourceUrl = "https://raw.githubusercontent.com/talhaekrem/TurkiyeSehirVeIlcelerJSON/refs/heads/main/Turkey%20Cities%20and%20Districts.json"

function Convert-ToSlug([string]$value) {
    $culture = [System.Globalization.CultureInfo]::GetCultureInfo("tr-TR")
    $slug = $value.ToLower($culture)

    $slug = $slug.Replace("ı", "i")
    $slug = $slug.Replace("ğ", "g")
    $slug = $slug.Replace("ü", "u")
    $slug = $slug.Replace("ş", "s")
    $slug = $slug.Replace("ö", "o")
    $slug = $slug.Replace("ç", "c")

    $slug = [System.Text.RegularExpressions.Regex]::Replace($slug, "[^a-z0-9]+", "-")
    return $slug.Trim("-")
}

function Escape-Sql([string]$value) {
    return $value.Replace("'", "''")
}

function Read-ConnectionValue([string]$connectionString, [string]$key) {
    $parts = $connectionString -split ";"

    foreach ($part in $parts) {
        if ([string]::IsNullOrWhiteSpace($part)) {
            continue
        }

        $pair = $part -split "=", 2

        if ($pair.Count -eq 2 -and $pair[0].Trim().Equals($key, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $pair[1].Trim()
        }
    }

    return $null
}

if (-not (Test-Path $appSettingsPath)) {
    throw "appsettings.json bulunamadi: $appSettingsPath"
}

Write-Host ""
Write-Host "Turkiye il/ilce verisi indiriliyor..." -ForegroundColor Cyan

Invoke-WebRequest `
    -Uri $sourceUrl `
    -OutFile $tempJsonPath `
    -UseBasicParsing

$data = Get-Content $tempJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

$cityCount = @($data.cities).Count
$districtCount = @($data.districts).Count

if ($cityCount -ne 81) {
    throw "Beklenen 81 il yerine $cityCount il bulundu. Islem durduruldu."
}

if ($districtCount -lt 922) {
    throw "Ilce sayisi beklenenden dusuk: $districtCount. Islem durduruldu."
}

Write-Host "Veri dogrulandi: $cityCount il, $districtCount ilce." -ForegroundColor Green

$appSettings = Get-Content $appSettingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
$connectionString = $appSettings.ConnectionStrings.DefaultConnection

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    throw "DefaultConnection bulunamadi."
}

$hostName = Read-ConnectionValue $connectionString "Host"
$port = Read-ConnectionValue $connectionString "Port"
$database = Read-ConnectionValue $connectionString "Database"
$username = Read-ConnectionValue $connectionString "Username"
$password = Read-ConnectionValue $connectionString "Password"

if ([string]::IsNullOrWhiteSpace($hostName)) { $hostName = "localhost" }
if ([string]::IsNullOrWhiteSpace($port)) { $port = "5432" }

if ([string]::IsNullOrWhiteSpace($database) -or
    [string]::IsNullOrWhiteSpace($username) -or
    [string]::IsNullOrWhiteSpace($password)) {
    throw "appsettings.json icindeki PostgreSQL baglanti bilgileri okunamadi."
}

$psqlCandidates = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe"
)

$psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $psql) {
    $command = Get-Command psql.exe -ErrorAction SilentlyContinue

    if ($command) {
        $psql = $command.Source
    }
}

if (-not $psql) {
    throw "psql.exe bulunamadi."
}

$cityByPlate = @{}

foreach ($city in $data.cities) {
    $cityByPlate[[int]$city.Id] = $city
}

$sql = New-Object System.Collections.Generic.List[string]

$sql.Add("BEGIN;")
$sql.Add("")

foreach ($city in ($data.cities | Sort-Object {[int]$_.Id})) {
    $slug = Escape-Sql (Convert-ToSlug $city.name)
    $name = Escape-Sql ([string]$city.name)
    $sortOrder = [int]$city.Id
    $id = [guid]::NewGuid().ToString()

    $sql.Add(@"
INSERT INTO "Cities" ("Id", "Slug", "Name", "SortOrder", "IsActive")
VALUES ('$id', '$slug', '$name', $sortOrder, TRUE)
ON CONFLICT ("Slug")
DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "SortOrder" = EXCLUDED."SortOrder",
    "IsActive" = TRUE;
"@)
}

$sql.Add("")

$districtGroups = $data.districts | Group-Object cityId

foreach ($group in $districtGroups) {
    $plate = [int]$group.Name

    if (-not $cityByPlate.ContainsKey($plate)) {
        throw "Ilcesi bulunan il kodu sehir listesinde yok: $plate"
    }

    $city = $cityByPlate[$plate]
    $citySlug = Escape-Sql (Convert-ToSlug $city.name)
    $order = 1

    foreach ($district in ($group.Group | Sort-Object name)) {
        $districtSlug = Escape-Sql (Convert-ToSlug $district.name)
        $districtName = Escape-Sql ([string]$district.name)
        $id = [guid]::NewGuid().ToString()

        $sql.Add(@"
INSERT INTO "Districts" ("Id", "CityId", "Slug", "Name", "SortOrder", "IsActive")
SELECT
    '$id',
    "Id",
    '$districtSlug',
    '$districtName',
    $order,
    TRUE
FROM "Cities"
WHERE "Slug" = '$citySlug'
ON CONFLICT ("CityId", "Slug")
DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "SortOrder" = EXCLUDED."SortOrder",
    "IsActive" = TRUE;
"@)

        $order++
    }
}

$sql.Add("")
$sql.Add("COMMIT;")

[System.IO.File]::WriteAllLines(
    $tempSqlPath,
    $sql,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "PostgreSQL veritabani guncelleniyor..." -ForegroundColor Cyan

$oldPassword = $env:PGPASSWORD
$oldEncoding = $env:PGCLIENTENCODING

try {
    $env:PGPASSWORD = $password
    $env:PGCLIENTENCODING = "UTF8"

    & $psql `
        -h $hostName `
        -p $port `
        -U $username `
        -d $database `
        -v ON_ERROR_STOP=1 `
        -f $tempSqlPath

    if ($LASTEXITCODE -ne 0) {
        throw "psql islemi basarisiz oldu. Cikis kodu: $LASTEXITCODE"
    }
}
finally {
    $env:PGPASSWORD = $oldPassword
    $env:PGCLIENTENCODING = $oldEncoding
}

Write-Host ""
Write-Host "Turkiye konum verileri basariyla yuklendi." -ForegroundColor Green
Write-Host "Kaynak veride: $cityCount il, $districtCount ilce." -ForegroundColor Green
Write-Host ""
Write-Host "Kontrol icin backend calisirken su adresi ac:" -ForegroundColor Cyan
Write-Host "http://localhost:5155/api/locations"
