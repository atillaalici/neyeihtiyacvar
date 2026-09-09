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
# Ortak Admin Navigation component
# ------------------------------------------------------------

$componentPath = Join-Path $frontendRoot "src\components\admin\AdminNav.tsx"

$componentContent = @'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Store,
} from "lucide-react";

const items = [
  {
    href: "/admin/talepler",
    label: "İhtiyaç Talepleri",
    icon: ClipboardList,
  },
  {
    href: "/admin/basvurular",
    label: "İşletme Başvuruları",
    icon: Building2,
  },
  {
    href: "/admin/isletmeler",
    label: "İşletmeler",
    icon: Store,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-background">
      <div className="section-shell py-3">
        <nav
          aria-label="Yönetim menüsü"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {items.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50",
                ].join(" ")}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
'@

Write-Utf8NoBom $componentPath $componentContent

# ------------------------------------------------------------
# Admin sayfalarina ortak menu ekle
# ------------------------------------------------------------

$pages = @(
    "src\app\admin\basvurular\page.tsx",
    "src\app\admin\isletmeler\page.tsx",
    "src\app\admin\isletmeler\[id]\page.tsx",
    "src\app\admin\talepler\page.tsx",
    "src\app\admin\talepler\[id]\page.tsx"
)

foreach ($relativePath in $pages) {
    $path = Join-Path $frontendRoot $relativePath

    if (-not (Test-Path -LiteralPath $path)) {
        throw "Admin sayfasi bulunamadi: $relativePath"
    }

    $content = Get-Content -LiteralPath $path -Raw -Encoding UTF8

    if ($content -notmatch 'from "@/components/admin/AdminNav"') {
        $siteLayoutImport = 'import { SiteLayout } from "@/components/site/SiteLayout";'

        if (-not $content.Contains($siteLayoutImport)) {
            throw "SiteLayout importu bulunamadi: $relativePath"
        }

        $content = $content.Replace(
            $siteLayoutImport,
            'import { AdminNav } from "@/components/admin/AdminNav";' + "`r`n" +
            $siteLayoutImport
        )
    }

    if ($content -notmatch '<AdminNav\s*/>') {
        $siteLayoutOpen = '<SiteLayout>'

        if (-not $content.Contains($siteLayoutOpen)) {
            throw "SiteLayout acilis etiketi bulunamadi: $relativePath"
        }

        $content = $content.Replace(
            $siteLayoutOpen,
            '<SiteLayout>' + "`r`n" + '      <AdminNav />'
        )
    }

    Write-Utf8NoBom $path $content
}

Write-Host ""
Write-Host "Ortak admin yonetim menusu eklendi." -ForegroundColor Green
Write-Host ""
Write-Host "Menuler:" -ForegroundColor Cyan
Write-Host "  Ihtiyac Talepleri"
Write-Host "  Isletme Basvurulari"
Write-Host "  Isletmeler"
Write-Host ""
Write-Host "Ozellikler:" -ForegroundColor Cyan
Write-Host "  Aktif sayfa turuncu vurgulu"
Write-Host "  Detay sayfalarinda da aktif menu korunur"
Write-Host "  Mobilde yatay kaydirilabilir"
Write-Host "  Mevcut SiteLayout ile uyumlu"
Write-Host ""
Write-Host "Simdi:" -ForegroundColor Yellow
Write-Host "  cd C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
Write-Host "  pnpm exec tsc --noEmit"
