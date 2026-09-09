$ErrorActionPreference = "Stop"

$path = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend\src\app\ihtiyac-olustur\page.tsx"

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

# React importuna Suspense ekle
$content = $content.Replace(
    'import { FormEvent, useEffect, useMemo, useState } from "react";',
    'import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";'
)

# Mevcut default component'i inner component yap
$content = $content.Replace(
    'export default function NeedCreatePage() {',
    'function NeedCreatePageContent() {'
)

# Default wrapper yoksa ekle
if ($content -notmatch 'export default function NeedCreatePage\(\)') {
    $wrapper = @'

export default function NeedCreatePage() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <section className="section-shell py-10 sm:py-16">
            <div className="mx-auto max-w-2xl">
              <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
            </div>
          </section>
        </SiteLayout>
      }
    >
      <NeedCreatePageContent />
    </Suspense>
  );
}
'@

    $content = $content.TrimEnd() + "`r`n" + $wrapper
}

Write-Utf8NoBom $path $content

Write-Host ""
Write-Host "ihtiyac-olustur production build hatasi duzeltildi." -ForegroundColor Green
Write-Host ""
Write-Host "Yapilanlar:" -ForegroundColor Cyan
Write-Host "  useSearchParams kullanan icerik Suspense boundary altina alindi"
Write-Host "  Mevcut form davranisi korunuyor"
Write-Host ""
Write-Host "Simdi:" -ForegroundColor Yellow
Write-Host "  cd C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
Write-Host "  pnpm exec tsc --noEmit"
Write-Host "  pnpm build"
