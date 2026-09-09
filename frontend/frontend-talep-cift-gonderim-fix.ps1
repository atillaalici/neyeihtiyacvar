$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
$path = Join-Path $root "src\app\ihtiyac-olustur\page.tsx"

if (-not (Test-Path $path)) {
    throw "Dosya bulunamadi: $path"
}

$content = Get-Content -Raw -Encoding UTF8 $path

# Submit başında success varsa tekrar gönderme
$submitAnchor = @'
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(null);
    setMatches(null);
'@

$submitReplacement = @'
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || success) {
      return;
    }

    setError("");
    setMatches(null);
'@

if (-not $content.Contains($submitAnchor)) {
    throw "handleSubmit hedef blogu bulunamadi."
}
$content = $content.Replace($submitAnchor, $submitReplacement)

# Form alanlarından biri değişirse success sıfırlansın
$content = $content.Replace(
    'onChange={(event) => setDescription(event.target.value)}',
    'onChange={(event) => {' + "`r`n" +
    '                  setDescription(event.target.value);' + "`r`n" +
    '                  setSuccess(null);' + "`r`n" +
    '                  setMatches(null);' + "`r`n" +
    '                }}'
)

$content = $content.Replace(
    'setCategorySlug(value);' + "`r`n" +
    '                    setServiceSlug("");',
    'setCategorySlug(value);' + "`r`n" +
    '                    setServiceSlug("");' + "`r`n" +
    '                    setSuccess(null);' + "`r`n" +
    '                    setMatches(null);'
)

$content = $content.Replace(
    'onValueChange={setServiceSlug}',
    'onValueChange={(value) => {' + "`r`n" +
    '                    setServiceSlug(value);' + "`r`n" +
    '                    setSuccess(null);' + "`r`n" +
    '                    setMatches(null);' + "`r`n" +
    '                  }}'
)

$content = $content.Replace(
    'setCitySlug(value);' + "`r`n" +
    '                    setDistrictSlug("");',
    'setCitySlug(value);' + "`r`n" +
    '                    setDistrictSlug("");' + "`r`n" +
    '                    setSuccess(null);' + "`r`n" +
    '                    setMatches(null);'
)

$content = $content.Replace(
    'onValueChange={setDistrictSlug}',
    'onValueChange={(value) => {' + "`r`n" +
    '                    setDistrictSlug(value);' + "`r`n" +
    '                    setSuccess(null);' + "`r`n" +
    '                    setMatches(null);' + "`r`n" +
    '                  }}'
)

# Butonu success sonrası pasifleştir ve metni değiştir
$buttonOld = @'
            <Button
              type="submit"
              size="lg"
              disabled={loading || catalogLoading}
              className="w-full"
            >
              {loading
                ? "Talep olu┼şturuluyor..."
                : catalogLoading
                  ? "Bilgiler y├╝kleniyor..."
                  : "Talebi G├Ânder"}
            </Button>
'@

$buttonNew = @'
            <Button
              type="submit"
              size="lg"
              disabled={loading || catalogLoading || !!success}
              className="w-full"
            >
              {loading
                ? "Talep oluşturuluyor..."
                : catalogLoading
                  ? "Bilgiler yükleniyor..."
                  : success
                    ? "Talep Oluşturuldu"
                    : "Talebi Gönder"}
            </Button>
'@

if (-not $content.Contains($buttonOld)) {
    throw "Submit butonu hedef blogu bulunamadi."
}
$content = $content.Replace($buttonOld, $buttonNew)

[System.IO.File]::WriteAllText(
    $path,
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Talep tekrar gonderme sorunu duzeltildi." -ForegroundColor Green
Write-Host ""
Write-Host "Yeni davranis:" -ForegroundColor Cyan
Write-Host "  Talep basarili olunca buton pasif olur."
Write-Host "  Buton metni Talep Olusturuldu olur."
Write-Host "  Ayni form tekrar gonderilemez."
Write-Host "  Herhangi bir alan degisirse yeni talep icin buton tekrar aktif olur."
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
