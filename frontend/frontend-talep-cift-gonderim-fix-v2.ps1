$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
$path = Join-Path $root "src\app\ihtiyac-olustur\page.tsx"

if (-not (Test-Path $path)) {
    throw "Dosya bulunamadi: $path"
}

$content = Get-Content -Raw -Encoding UTF8 $path

# 1) Submit esnasinda ayni talebin ikinci kez gonderilmesini engelle
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

    $newContent = [regex]::Replace($content, $pattern, $replacement, 1)

    if ($newContent -eq $content) {
        throw "handleSubmit baslangic blogu bulunamadi."
    }

    $content = $newContent
}

# 2) Aciklama degisirse onceki basari durumunu temizle
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

# 3) Kategori degisirse onceki basari durumunu temizle
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

# 4) Hizmet degisirse onceki basari durumunu temizle
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

# 5) Il degisirse onceki basari durumunu temizle
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

# 6) Ilce degisirse onceki basari durumunu temizle
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

# 7) Submit butonunu success sonrasinda pasiflestir
$content = [regex]::Replace(
    $content,
    'disabled=\{loading \|\| catalogLoading\}',
    'disabled={loading || catalogLoading || !!success}',
    1
)

# 8) Buton metnini success durumuna gore degistir
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

$newContent = [regex]::Replace(
    $content,
    $buttonPattern,
    $buttonReplacement,
    1,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

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
Write-Host "Talep cift gonderim sorunu v2 ile duzeltildi." -ForegroundColor Green
Write-Host ""
Write-Host "Yeni davranis:" -ForegroundColor Cyan
Write-Host "  Talep basarili olunca buton pasif olur."
Write-Host "  Butonda 'Talep Olusturuldu' yazar."
Write-Host "  Ayni form ikinci kez gonderilemez."
Write-Host "  Formdaki herhangi bir alan degisirse yeni talep icin buton tekrar aktif olur."
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
