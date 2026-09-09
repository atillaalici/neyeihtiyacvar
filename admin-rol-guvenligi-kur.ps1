$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar"
$backendRoot = Join-Path $root "backend\NeyeIhtiyacVar.Api"
$frontendRoot = Join-Path $root "frontend"

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

# -------------------------------------------------------------------
# 1) BACKEND: /api/admin altindaki tum endpointleri merkezi olarak koru
# -------------------------------------------------------------------

$programPath = Join-Path $backendRoot "Program.cs"
$program = Get-Content -Raw -Encoding UTF8 $programPath

$oldAuthorization = 'builder.Services.AddAuthorization();'
$newAuthorization = @'
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole(UserRole.Admin.ToString());
    });
});
'@

if ($program.Contains($oldAuthorization)) {
    $program = $program.Replace($oldAuthorization, $newAuthorization)
}

$authAnchor = @'
app.UseAuthentication();
app.UseAuthorization();
'@

$authReplacement = @'
app.UseAuthentication();

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/admin"))
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        if (!context.User.IsInRole(UserRole.Admin.ToString()))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
    }

    await next();
});

app.UseAuthorization();
'@

if ($program -notmatch 'StartsWithSegments\("/api/admin"\)') {
    if (-not $program.Contains($authAnchor)) {
        throw "Program.cs authentication/authorization blogu bulunamadi."
    }

    $program = $program.Replace($authAnchor, $authReplacement)
}

if ($program -notmatch 'MapDevelopmentAdminEndpoints\(\)') {
    $devAnchor = '    app.MapAdminDashboardEndpoints();'

    if (-not $program.Contains($devAnchor)) {
        throw "Program.cs Development admin blogu bulunamadi."
    }

    $program = $program.Replace(
        $devAnchor,
        $devAnchor + "`r`n" + '    app.MapDevelopmentAdminEndpoints();'
    )
}

Write-Utf8NoBom $programPath $program

# -------------------------------------------------------------------
# 2) BACKEND: Development ortaminda ilk admin hesabi icin bootstrap
#    Production'da map edilmez.
# -------------------------------------------------------------------

$devAdminPath = Join-Path $backendRoot "Endpoints\DevelopmentAdminEndpoints.cs"

$devAdminContent = @'
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class DevelopmentAdminEndpoints
{
    public static IEndpointRouteBuilder MapDevelopmentAdminEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/development/admin")
            .RequireAuthorization();

        group.MapPost("/promote-current", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdValue, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == userId &&
                    x.IsActive);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Kullanıcı bulunamadı."
                });
            }

            if (user.Role == UserRole.Admin)
            {
                return Results.Ok(new
                {
                    message = "Bu hesap zaten Admin rolünde.",
                    requiresRelogin = false
                });
            }

            user.Role = UserRole.Admin;
            user.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Hesap Development ortamında Admin yapıldı. Yeni rolün JWT'ye yansıması için çıkış yapıp tekrar giriş yapın.",
                requiresRelogin = true
            });
        });

        return app;
    }
}
'@

Write-Utf8NoBom $devAdminPath $devAdminContent

# -------------------------------------------------------------------
# 3) FRONTEND: /admin ve tum alt rotalar icin ortak rol guard'i
# -------------------------------------------------------------------

$layoutPath = Join-Path $frontendRoot "src\app\admin\layout.tsx"

$layoutContent = @'
"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
} from "@/lib/auth";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [developmentNonAdmin, setDevelopmentNonAdmin] =
    useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace(
        `/giris?returnUrl=${encodeURIComponent(pathname)}`,
      );
      return;
    }

    if (user.role === "admin") {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      setDevelopmentNonAdmin(true);
      setChecking(false);
      return;
    }

    router.replace(
      user.role === "provider" ? "/panel" : "/hesabim",
    );
  }, [pathname, router]);

  async function promoteCurrentUser() {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    setPromoting(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/development/admin/promote-current`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ??
            "Admin yetkisi verilemedi.",
        );
        return;
      }

      clearAuth();
      router.replace(
        `/giris?returnUrl=${encodeURIComponent("/admin")}`,
      );
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setPromoting(false);
    }
  }

  if (checking) {
    return (
      <div className="section-shell py-12">
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  if (developmentNonAdmin) {
    return (
      <div className="section-shell py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </div>

          <h1 className="mt-4 font-display text-2xl font-bold">
            Admin yetkisi gerekli
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Bu hesap Admin rolünde değil. Development ortamında
            geliştirme hesabını bir kez Admin yapabilirsin.
            Production ortamında bu seçenek bulunmaz.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="button"
            className="mt-5"
            disabled={promoting}
            onClick={() => void promoteCurrentUser()}
          >
            {promoting
              ? "Admin yetkisi veriliyor..."
              : "Bu Geliştirme Hesabını Admin Yap"}
          </Button>

          <p className="mt-3 text-xs text-muted-foreground">
            İşlemden sonra yeni rolün JWT'ye yansıması için
            tekrar giriş yapacaksın.
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return children;
}
'@

Write-Utf8NoBom $layoutPath $layoutContent

# -------------------------------------------------------------------
# 4) FRONTEND: Admin hesabi navbar'dan panele kolay ulassin
# -------------------------------------------------------------------

$authMenuPath = Join-Path $frontendRoot "src\components\site\AuthMenu.tsx"
$authMenu = Get-Content -Raw -Encoding UTF8 $authMenuPath

if ($authMenu -notmatch 'user\.role === "admin"') {
    $providerBlockPattern = '(?s)(\{user\.role === "provider" && \(\s*<Link.*?</Link>\s*\)\})'
    $match = [regex]::Match($authMenu, $providerBlockPattern)

    if (-not $match.Success) {
        throw "AuthMenu icinde provider menu blogu bulunamadi."
    }

    $adminBlock = @'

        {user.role === "admin" && (
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Yönetim Paneli
          </Link>
        )}
'@

    $authMenu = $authMenu.Insert(
        $match.Index + $match.Length,
        $adminBlock
    )

    Write-Utf8NoBom $authMenuPath $authMenu
}

Write-Host ""
Write-Host "Admin rol guvenligi kuruldu." -ForegroundColor Green
Write-Host ""
Write-Host "Backend guvenligi:" -ForegroundColor Cyan
Write-Host "  /api/admin/* -> kimlik dogrulama zorunlu"
Write-Host "  /api/admin/* -> Admin rolu zorunlu"
Write-Host "  Yetkisiz -> 401"
Write-Host "  Admin olmayan -> 403"
Write-Host ""
Write-Host "Frontend guvenligi:" -ForegroundColor Cyan
Write-Host "  /admin ve tum alt sayfalar Admin guard ile korunuyor"
Write-Host "  Admin hesapta navbar'da Yonetim Paneli linki gorunur"
Write-Host ""
Write-Host "Development ilk admin:" -ForegroundColor Cyan
Write-Host "  Admin olmayan hesap /admin'e girerse"
Write-Host "  'Bu Gelistirme Hesabini Admin Yap' butonu gorunur"
Write-Host "  Bu endpoint Production ortaminda map edilmez"
Write-Host ""
Write-Host "Simdi:" -ForegroundColor Yellow
Write-Host "  1) Backend calisiyorsa durdur"
Write-Host "  2) backend -> dotnet build"
Write-Host "  3) frontend -> pnpm exec tsc --noEmit"
Write-Host "  4) backend -> dotnet run"
Write-Host "  5) /admin sayfasini test et"
