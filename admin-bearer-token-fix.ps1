$ErrorActionPreference = "Stop"

$frontendRoot = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"

function Write-Utf8NoBom([string]$path, [string]$content) {
    $dir = [System.IO.Path]::GetDirectoryName($path)

    if (-not [string]::IsNullOrWhiteSpace($dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    [System.IO.File]::WriteAllText(
        $path,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

# ------------------------------------------------------------
# 1) Ortak admin fetch helper
# ------------------------------------------------------------

$helperPath = Join-Path $frontendRoot "src\lib\admin-api.ts"

$helperContent = @'
import { getAccessToken } from "@/lib/auth";

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
'@

Write-Utf8NoBom $helperPath $helperContent

# ------------------------------------------------------------
# 2) Tum admin page.tsx dosyalarinda fetch -> adminFetch
# ------------------------------------------------------------

$adminRoot = Join-Path $frontendRoot "src\app\admin"

$files = Get-ChildItem -LiteralPath $adminRoot -Recurse -Filter "page.tsx"

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    $original = $content

    if ($content -match '\bfetch\s*\(') {
        if ($content -notmatch 'from "@/lib/admin-api"') {
            $importAnchor = 'import { apiBaseUrl } from "@/lib/api";'

            if ($content.Contains($importAnchor)) {
                $content = $content.Replace(
                    $importAnchor,
                    'import { adminFetch } from "@/lib/admin-api";' + "`r`n" +
                    $importAnchor
                )
            }
            else {
                $siteLayoutAnchor = 'import { SiteLayout } from "@/components/site/SiteLayout";'

                if ($content.Contains($siteLayoutAnchor)) {
                    $content = $content.Replace(
                        $siteLayoutAnchor,
                        $siteLayoutAnchor + "`r`n" +
                        'import { adminFetch } from "@/lib/admin-api";'
                    )
                }
                else {
                    throw "Import ekleme noktasi bulunamadi: $($file.FullName)"
                }
            }
        }

        $content = [regex]::Replace(
            $content,
            '(?<![\w.])fetch\s*\(',
            'adminFetch('
        )
    }

    if ($content -ne $original) {
        Write-Utf8NoBom $file.FullName $content
    }
}

Write-Host ""
Write-Host "Admin API Bearer token duzeltmesi tamamlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Yapilanlar:" -ForegroundColor Cyan
Write-Host "  Ortak adminFetch helper eklendi"
Write-Host "  /admin altindaki tum page.tsx fetch istekleri adminFetch kullaniyor"
Write-Host "  Mevcut JWT otomatik Authorization: Bearer olarak gonderiliyor"
Write-Host "  Dashboard, Talepler, Basvurular ve Isletmeler birlikte duzeltildi"
Write-Host ""
Write-Host "Simdi:" -ForegroundColor Yellow
Write-Host "  cd C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
Write-Host "  pnpm exec tsc --noEmit"
