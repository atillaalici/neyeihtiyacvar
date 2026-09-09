$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
$path = Join-Path $root "src\app\panel\page.tsx"

if (-not (Test-Path $path)) {
    throw "Panel dosyasi bulunamadi: $path"
}

$content = Get-Content -Raw -Encoding UTF8 $path

# 1) Teklif verilen talepleri Eşleşen İhtiyaç Talepleri listesinden gizle
if ($content -notmatch 'const visibleNeeds = useMemo') {
    $needle = @'
  const offeredNeedIds = useMemo(
    () => new Set(offers.map((offer) => offer.needRequestId)),
    [offers],
  );
'@

    $replacement = @'
  const offeredNeedIds = useMemo(
    () => new Set(offers.map((offer) => offer.needRequestId)),
    [offers],
  );

  const visibleNeeds = useMemo(
    () => needs.filter((need) => !offeredNeedIds.has(need.id)),
    [needs, offeredNeedIds],
  );
'@

    if (-not $content.Contains($needle)) {
        throw "offeredNeedIds blogu bulunamadi."
    }

    $content = $content.Replace($needle, $replacement)
}

# 2) Liste boşluk ve map işlemlerini visibleNeeds'e geçir
$content = $content.Replace(
    '{needs.length === 0 ? (',
    '{visibleNeeds.length === 0 ? ('
)

$content = $content.Replace(
    '{needs.map((need) => {',
    '{visibleNeeds.map((need) => {'
)

# 3) Bekleyen tekliflerde kırmızı "Teklifi Geri Çek" butonu
if ($content -notmatch '"Teklifi Geri Çek"') {
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
                            className="border-red-600 bg-red-600 text-white hover:bg-red-700 hover:text-white"
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
        throw "Verilen teklifler durum blogu bulunamadi."
    }

    $content = $content.Replace($target, $replacement)
}

# 4) Metni netleştir
$content = $content.Replace(
    'Yalnızca giriş yapmış kullanıcıların yeni ve sonuçlanmamış' + "`r`n" +
    '                taleplerine teklif verilebilir.',
    'Yalnızca henüz teklif vermediğin, giriş yapmış kullanıcıların yeni ve sonuçlanmamış' + "`r`n" +
    '                talepleri burada gösterilir.'
)

[System.IO.File]::WriteAllText(
    $path,
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Panel akisi guncellendi." -ForegroundColor Green
Write-Host ""
Write-Host "Yeni davranis:" -ForegroundColor Cyan
Write-Host "  Teklif verdigin talep Eslesen Ihtiyac Talepleri listesinden kaybolur."
Write-Host "  Teklif Verdigim Teklifler bolumunde gorunur."
Write-Host "  Bekleyen tekliflerde kirmizi Teklifi Geri Cek butonu gorunur."
Write-Host "  Kabul edilen tekliflerde geri cek butonu cikmaz."
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
