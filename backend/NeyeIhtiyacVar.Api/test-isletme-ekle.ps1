$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"
$appSettingsPath = Join-Path $projectRoot "appsettings.json"
$tempSqlPath = Join-Path $env:TEMP "neyeihtiyacvar-test-provider.sql"

function Read-ConnectionValue([string]$connectionString, [string]$key) {
    foreach ($part in ($connectionString -split ";")) {
        if ([string]::IsNullOrWhiteSpace($part)) { continue }

        $pair = $part -split "=", 2

        if ($pair.Count -eq 2 -and
            $pair[0].Trim().Equals($key, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $pair[1].Trim()
        }
    }

    return $null
}

if (-not (Test-Path $appSettingsPath)) {
    throw "appsettings.json bulunamadi: $appSettingsPath"
}

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

$psqlCandidates = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe"
)

$psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $psql) {
    $command = Get-Command psql.exe -ErrorAction SilentlyContinue
    if ($command) { $psql = $command.Source }
}

if (-not $psql) {
    throw "psql.exe bulunamadi."
}

$id = [guid]::NewGuid().ToString()

$sql = @"
INSERT INTO "Providers"
(
    "Id",
    "SourceApplicationId",
    "Slug",
    "BusinessName",
    "ShortDescription",
    "Description",
    "CategorySlug",
    "ServiceSlug",
    "AdditionalServices",
    "CitySlug",
    "DistrictSlug",
    "PublicPhone",
    "PublicWhatsapp",
    "PublicAddress",
    "WorkingHours",
    "ExperienceYears",
    "EmergencyService",
    "OnsiteService",
    "PublicationStatus",
    "PublishedAtUtc",
    "PublishedBy",
    "CreatedAtUtc",
    "UpdatedAtUtc",
    "Version"
)
VALUES
(
    '$id',
    NULL,
    'osmaniye-test-elektrik',
    'Osmaniye Test Elektrik',
    'Elektrik ariza, montaj ve bakim hizmetleri.',
    'Bu kayit Neye Ihtiyac Var yeni backend isletme altyapisini test etmek icin olusturulmustur.',
    'usta-tamir',
    'elektrikci',
    ARRAY['Elektrik ariza','Priz ve anahtar montaji']::text[],
    'osmaniye',
    'merkez',
    '03281234567',
    '05321234567',
    'Osmaniye Merkez',
    'Her gun 08:00 - 20:00',
    10,
    TRUE,
    TRUE,
    'Published',
    NOW(),
    'system-test',
    NOW(),
    NOW(),
    1
)
ON CONFLICT ("Slug")
DO UPDATE SET
    "BusinessName" = EXCLUDED."BusinessName",
    "ShortDescription" = EXCLUDED."ShortDescription",
    "Description" = EXCLUDED."Description",
    "CategorySlug" = EXCLUDED."CategorySlug",
    "ServiceSlug" = EXCLUDED."ServiceSlug",
    "AdditionalServices" = EXCLUDED."AdditionalServices",
    "CitySlug" = EXCLUDED."CitySlug",
    "DistrictSlug" = EXCLUDED."DistrictSlug",
    "PublicPhone" = EXCLUDED."PublicPhone",
    "PublicWhatsapp" = EXCLUDED."PublicWhatsapp",
    "PublicAddress" = EXCLUDED."PublicAddress",
    "WorkingHours" = EXCLUDED."WorkingHours",
    "ExperienceYears" = EXCLUDED."ExperienceYears",
    "EmergencyService" = EXCLUDED."EmergencyService",
    "OnsiteService" = EXCLUDED."OnsiteService",
    "PublicationStatus" = 'Published',
    "PublishedAtUtc" = NOW(),
    "UpdatedAtUtc" = NOW(),
    "Version" = "Providers"."Version" + 1;
"@

[System.IO.File]::WriteAllText(
    $tempSqlPath,
    $sql,
    (New-Object System.Text.UTF8Encoding($false))
)

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
        throw "Test isletmesi eklenemedi. psql cikis kodu: $LASTEXITCODE"
    }
}
finally {
    $env:PGPASSWORD = $oldPassword
    $env:PGCLIENTENCODING = $oldEncoding
}

Write-Host ""
Write-Host "Test isletmesi basariyla eklendi." -ForegroundColor Green
Write-Host "Slug: osmaniye-test-elektrik" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend calisirken kontrol et:" -ForegroundColor Yellow
Write-Host "http://localhost:5155/api/providers"
Write-Host "http://localhost:5155/api/providers/osmaniye-test-elektrik"
