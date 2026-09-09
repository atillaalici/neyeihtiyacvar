$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
$path = Join-Path $root "src\app\panel\page.tsx"

if (-not (Test-Path $path)) {
    throw "Panel dosyasi bulunamadi: $path"
}

$content = Get-Content -Raw -Encoding UTF8 $path

if ($content -match 'Teklifi Geri Çek') {
    Write-Host "Teklifi Geri Cek butonu zaten dosyada var. Degisiklik yapilmadi." -ForegroundColor Yellow
    exit 0
}

$target = @'
                      {offer.status === "accepted" && (
                        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                          Müşteri teklifinizi kabul etti.
                        </div>
                      )}
'@

$replacement = @'
                      {offer.status === "pending" && (
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={withdrawingOfferId === offer.id}
                            onClick={() => void withdrawOffer(offer.id)}
                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                          >
                            {withdrawingOfferId === offer.id
                              ? "Geri Çekiliyor..."
                              : "Teklifi Geri Çek"}
                          </Button>
                        </div>
                      )}

                      {offer.status === "accepted" && (
                        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                          Müşteri teklifinizi kabul etti.
                        </div>
                      )}

                      {offer.status === "withdrawn" && (
                        <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                          Bu teklif geri çekildi.
                        </div>
                      )}
'@

if (-not $content.Contains($target)) {
    throw "Verilen teklifler bolumundeki hedef blok bulunamadi."
}

$content = $content.Replace($target, $replacement)

[System.IO.File]::WriteAllText(
    $path,
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Teklifi Geri Cek butonu eklendi." -ForegroundColor Green
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
