$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"

function Write-Utf8NoBom([string]$path, [string]$content) {
    $directory = [System.IO.Path]::GetDirectoryName($path)
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    }

    [System.IO.File]::WriteAllText(
        $path,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

$taleplerimPath = Join-Path $root "src\app\taleplerim\page.tsx"
$panelPath = Join-Path $root "src\app\panel\page.tsx"

if (-not (Test-Path $taleplerimPath)) {
    throw "Taleplerim sayfasi bulunamadi: $taleplerimPath"
}

if (-not (Test-Path $panelPath)) {
    throw "Panel sayfasi bulunamadi: $panelPath"
}

$taleplerim = Get-Content -Raw -Encoding UTF8 $taleplerimPath
$panel = Get-Content -Raw -Encoding UTF8 $panelPath

# -----------------------------
# /taleplerim -> Talebi Iptal Et
# -----------------------------
$taleplerim = $taleplerim.Replace(
    'type NeedStatus = "open" | "offerreceived" | "completed";',
    'type NeedStatus = "open" | "offerreceived" | "completed" | "cancelled";'
)

if ($taleplerim -notmatch 'workingCancelNeedId') {
    $taleplerim = $taleplerim.Replace(
        '  const [workingReviewNeedId, setWorkingReviewNeedId] = useState<string | null>(',
        '  const [workingCancelNeedId, setWorkingCancelNeedId] = useState<string | null>(null);' + "`r`n" +
        '  const [workingReviewNeedId, setWorkingReviewNeedId] = useState<string | null>('
    )
}

$taleplerim = $taleplerim.Replace(
    '  if (status === "completed") return "Sonuçlandı";' + "`r`n" +
    '  if (status === "offerreceived") return "Teklif Alındı";',
    '  if (status === "completed") return "Sonuçlandı";' + "`r`n" +
    '  if (status === "cancelled") return "İptal Edildi";' + "`r`n" +
    '  if (status === "offerreceived") return "Teklif Alındı";'
)

$taleplerim = $taleplerim.Replace(
    '  if (status === "completed")' + "`r`n" +
    '    return "border-green-200 bg-green-50 text-green-700";' + "`r`n" +
    '  if (status === "offerreceived")',
    '  if (status === "completed")' + "`r`n" +
    '    return "border-green-200 bg-green-50 text-green-700";' + "`r`n" +
    '  if (status === "cancelled")' + "`r`n" +
    '    return "border-red-200 bg-red-50 text-red-700";' + "`r`n" +
    '  if (status === "offerreceived")'
)

if ($taleplerim -notmatch 'async function cancelNeed') {
    $insertPoint = '  async function submitReview(needId: string) {'
    $cancelFunction = @'
  async function cancelNeed(needId: string) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    const confirmed = window.confirm(
      "Bu ihtiyaç talebini iptal etmek istediğine emin misin?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setWorkingCancelNeedId(needId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/my-needs/${needId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Talep iptal edilemedi.");
        return;
      }

      setMessage("İhtiyaç talebin iptal edildi.");
      setLoading(true);
      await loadData();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWorkingCancelNeedId(null);
      setLoading(false);
    }
  }

'@

    if ($taleplerim.Contains($insertPoint)) {
        $taleplerim = $taleplerim.Replace(
            $insertPoint,
            $cancelFunction + $insertPoint
        )
    }
    else {
        throw "Taleplerim sayfasinda submitReview bulunamadi."
    }
}

$needle = @'
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
'@

if ($taleplerim -notmatch 'Talebi İptal Et') {
    $statusBlock = @'
                  {(need.status === "open" ||
                    need.status === "offerreceived") && (
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={workingCancelNeedId === need.id}
                        onClick={() => void cancelNeed(need.id)}
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      >
                        {workingCancelNeedId === need.id
                          ? "İptal Ediliyor..."
                          : "Talebi İptal Et"}
                      </Button>
                    </div>
                  )}

                  {need.status === "cancelled" && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      Bu ihtiyaç talebi iptal edildi.
                    </div>
                  )}

'@

    if ($taleplerim.Contains($needle)) {
        $taleplerim = $taleplerim.Replace(
            $needle,
            $statusBlock + $needle
        )
    }
    else {
        throw "Taleplerim sayfasinda hedef blok bulunamadi."
    }
}

# Cancelled talepte teklif aksiyonlarini kapat
$taleplerim = $taleplerim.Replace(
    'offer.status === "pending" &&' + "`r`n" +
    '                                need.status !== "completed"',
    'offer.status === "pending" &&' + "`r`n" +
    '                                need.status !== "completed" &&' + "`r`n" +
    '                                need.status !== "cancelled"'
)

# -----------------------------
# /panel -> Teklifi Geri Cek
# -----------------------------
if ($panel -notmatch 'withdrawingOfferId') {
    $panel = $panel.Replace(
        '  const [sendingNeedId, setSendingNeedId] = useState<string | null>(null);',
        '  const [sendingNeedId, setSendingNeedId] = useState<string | null>(null);' + "`r`n" +
        '  const [withdrawingOfferId, setWithdrawingOfferId] = useState<string | null>(null);'
    )
}

if ($panel -notmatch 'async function withdrawOffer') {
    $insertPoint = '  if (loading) {'
    $withdrawFunction = @'
  async function withdrawOffer(offerId: string) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    const confirmed = window.confirm(
      "Bu teklifi geri çekmek istediğine emin misin?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setWithdrawingOfferId(offerId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/offers/${offerId}/withdraw`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Teklif geri çekilemedi.");
        return;
      }

      setOffers((current) =>
        current.map((offer) =>
          offer.id === offerId
            ? {
                ...offer,
                status: "withdrawn",
                needStatus: data.needStatus,
                updatedAtUtc: new Date().toISOString(),
              }
            : offer,
        ),
      );

      setMessage("Teklif geri çekildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWithdrawingOfferId(null);
    }
  }

'@

    if ($panel.Contains($insertPoint)) {
        $panel = $panel.Replace(
            $insertPoint,
            $withdrawFunction + $insertPoint
        )
    }
    else {
        throw "Panel sayfasinda loading blogu bulunamadi."
    }
}

if ($panel -notmatch 'Teklifi Geri Çek') {
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

    if ($panel.Contains($target)) {
        $panel = $panel.Replace($target, $replacement)
    }
    else {
        throw "Panel sayfasinda teklif durum blogu bulunamadi."
    }
}

Write-Utf8NoBom $taleplerimPath $taleplerim
Write-Utf8NoBom $panelPath $panel

Write-Host ""
Write-Host "Frontend talep iptali ve teklif geri cekme ozellikleri eklendi." -ForegroundColor Green
Write-Host ""
Write-Host "Taleplerim:" -ForegroundColor Cyan
Write-Host "  Acik / Teklif Alindi -> Talebi Iptal Et"
Write-Host "  Iptal Edildi durumu"
Write-Host ""
Write-Host "Isletme Paneli:" -ForegroundColor Cyan
Write-Host "  Bekleyen teklif -> Teklifi Geri Cek"
Write-Host "  Geri Cekildi durumu"
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
