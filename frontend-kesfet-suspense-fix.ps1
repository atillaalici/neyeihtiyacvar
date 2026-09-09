$ErrorActionPreference = "Stop"

$path = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend\src\app\kesfet\page.tsx"

function Write-Utf8NoBom([string]$targetPath, [string]$content) {
    [System.IO.File]::WriteAllText(
        $targetPath,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

if (-not (Test-Path -LiteralPath $path)) {
    throw "Dosya bulunamadi: $path"
}

$content = Get-Content -LiteralPath $path -Raw -Encoding UTF8

if ($content -notmatch 'useSearchParams') {
    throw "kesfet/page.tsx icinde useSearchParams bulunamadi."
}

# Suspense importunu guvenli bicimde ekle
if ($content -notmatch '\bSuspense\b') {
    if ($content -match 'import\s*\{([^}]*)\}\s*from\s*"react";') {
        $content = [regex]::Replace(
            $content,
            'import\s*\{([^}]*)\}\s*from\s*"react";',
            {
                param($m)
                $inside = $m.Groups[1].Value.Trim()
                if ([string]::IsNullOrWhiteSpace($inside)) {
                    'import { Suspense } from "react";'
                } else {
                    'import { ' + $inside.TrimEnd() + ', Suspense } from "react";'
                }
            },
            1
        )
    }
    else {
        $content = 'import { Suspense } from "react";' + "`r`n" + $content
    }
}

# Default export edilen page component adini bul
$match = [regex]::Match(
    $content,
    'export\s+default\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\('
)

if (-not $match.Success) {
    throw "kesfet/page.tsx icinde 'export default function ...' bulunamadi."
}

$componentName = $match.Groups[1].Value
$contentName = "${componentName}Content"

# Daha once uygulanmadiysa inner component'e cevir
if ($content -notmatch [regex]::Escape("function $contentName(")) {
    $content = [regex]::Replace(
        $content,
        'export\s+default\s+function\s+' + [regex]::Escape($componentName) + '\s*\(',
        'function ' + $contentName + '(',
        1
    )
}

# Wrapper zaten yoksa ekle
if ($content -notmatch 'export\s+default\s+function\s+' + [regex]::Escape($componentName) + '\s*\(') {
    $wrapper = @"

export default function $componentName() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <section className="section-shell py-10 sm:py-14">
            <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
          </section>
        </SiteLayout>
      }
    >
      <$contentName />
    </Suspense>
  );
}
"@

    $content = $content.TrimEnd() + "`r`n" + $wrapper
}

Write-Utf8NoBom $path $content

Write-Host ""
Write-Host "kesfet production build hatasi duzeltildi." -ForegroundColor Green
Write-Host ""
Write-Host "Yapilanlar:" -ForegroundColor Cyan
Write-Host "  useSearchParams kullanan /kesfet sayfasi Suspense boundary altina alindi"
Write-Host "  Mevcut filtreleme ve arama davranisi korunuyor"
Write-Host ""
Write-Host "Simdi:" -ForegroundColor Yellow
Write-Host "  cd C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
Write-Host "  pnpm exec tsc --noEmit"
Write-Host "  pnpm build"
