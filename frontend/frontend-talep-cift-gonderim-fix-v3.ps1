$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
$path = Join-Path $root "src\app\ihtiyac-olustur\page.tsx"

if (-not (Test-Path $path)) {
    throw "Dosya bulunamadi: $path"
}

$content = Get-Content -Raw -Encoding UTF8 $path

# 1) Aynı talebin ikinci kez gönderilmesini engelle
if ($content -notmatch 'if \(loading \|\| success\)') {
    $pattern = 'event\.preventDefault\(\);\s*\r?\n\s*setError\(""\);\s*\r?\n\s*setSuccess\(null\);\s*\r?\n\s*setMatches\(null\);'
    $replacement = @'
event.preventDefault();

    if (loading || success) {
      return;
    }

    setError("");
    setMatches(null);
'@

    $regex = [System.Text.RegularExpressions.Regex]::new(
        $pattern,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    $newContent = $regex.Replace($content, $replacement, 1)

    if ($newContent -eq $content) {
        throw "handleSubmit baslangic blogu bulunamadi."
    }

    $content = $newContent
}

# 2) Açıklama değişirse önceki başarı durumunu temizle
if ($content -notmatch 'setDescription\(event\.target\.value\);\s*\r?\n\s*setSuccess\(null\);') {
    $content = $content.Replace(
        'onChange={(event) => setDescription(event.target.value)}',
        'onChange={(event) => {' + "`r`n" +
        '                  setDescription(event.target.value);' + "`r`n" +
        '                  setSuccess(null);' + "`r`n" +
        '                  setMatches(null);' + "`r`n" +
        '                }}'
    )
}

# 3) Kategori değişirse önceki başarı durumunu temizle
if ($content -notmatch 'setCategorySlug\(value\);\s*\r?\n\s*setServiceSlug\(""\);\s*\r?\n\s*setSuccess\(null\);') {
    $content = $content.Replace(
        'setCategorySlug(value);' + "`r`n" +
        '                    setServiceSlug("");',
        'setCategorySlug(value);' + "`r`n" +
        '                    setServiceSlug("");' + "`r`n" +
        '                    setSuccess(null);' + "`r`n" +
        '                    setMatches(null);'
    )
}

# 4) Hizmet değişirse önceki başarı durumunu temizle
if ($content -match 'onValueChange=\{setServiceSlug\}') {
    $content = $content.Replace(
        'onValueChange={setServiceSlug}',
        'onValueChange={(value) => {' + "`r`n" +
        '                    setServiceSlug(value);' + "`r`n" +
        '                    setSuccess(null);' + "`r`n" +
        '                    setMatches(null);' + "`r`n" +
        '                  }}'
    )
}

# 5) İl değişirse önceki başarı durumunu temizle
if ($content -notmatch 'setCitySlug\(value\);\s*\r?\n\s*setDistrictSlug\(""\);\s*\r?\n\s*setSuccess\(null\);') {
    $content = $content.Replace(
        'setCitySlug(value);' + "`r`n" +
        '                    setDistrictSlug("");',
        'setCitySlug(value);' + "`r`n" +
        '                    setDistrictSlug("");' + "`r`n" +
        '                    setSuccess(null);' + "`r`n" +
        '                    setMatches(null);'
    )
}

# 6) İlçe değişirse önceki başarı durumunu temizle
if ($content -match 'onValueChange=\{setDistrictSlug\}') {
    $content = $content.Replace(
        'onValueChange={setDistrictSlug}',
        'onValueChange={(value) => {' + "`r`n" +
        '                    setDistrictSlug(value);' + "`r`n" +
        '                    setSuccess(null);' + "`r`n" +
        '                    setMatches(null);' + "`r`n" +
        '                  }}'
    )
}

# 7) Submit butonunu success sonrasında pasifleştir
$content = $content.Replace(
    'disabled={loading || catalogLoading}',
    'disabled={loading || catalogLoading || !!success}'
)

# 8) Buton metnini success durumuna göre değiştir
$buttonPattern = '\{loading\s*\?\s*"[^"]*"\s*:\s*catalogLoading\s*\?\s*"[^"]*"\s*:\s*"[^"]*"\}'
$buttonReplacement = @'
{loading
                ? "Talep oluşturuluyor..."
                : catalogLoading
                  ? "Bilgiler yükleniyor..."
                  : success
                    ? "Talep Oluşturuldu"
                    : "Talebi Gönder"}
'@

$buttonRegex = [System.Text.RegularExpressions.Regex]::new(
    $buttonPattern,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$newContent = $buttonRegex.Replace($content, $buttonReplacement, 1)

if ($newContent -eq $content) {
    throw "Submit butonu metin blogu bulunamadi."
}

$content = $newContent

[System.IO.File]::WriteAllText(
    $path,
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Talep cift gonderim sorunu v3 ile duzeltildi." -ForegroundColor Green
Write-Host ""
Write-Host "Yeni davranis:" -ForegroundColor Cyan
Write-Host "  Talep basarili olunca buton pasif olur."
Write-Host "  Butonda 'Talep Olusturuldu' yazar."
Write-Host "  Ayni form ikinci kez gonderilemez."
Write-Host "  Formdaki herhangi bir alan degisirse yeni talep icin buton tekrar aktif olur."
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
