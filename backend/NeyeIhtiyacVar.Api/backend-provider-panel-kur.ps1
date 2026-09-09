$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"

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

$endpoint = @'
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderPanelEndpoints
{
    public static IEndpointRouteBuilder MapProviderPanelEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/provider-panel")
            .RequireAuthorization();

        group.MapGet("/me", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba bağlı işletme bulunamadı."
                });
            }

            var matchedNeedCount = await dbContext.NeedRequests
                .AsNoTracking()
                .CountAsync(x =>
                    x.CategorySlug == provider.CategorySlug &&
                    x.ServiceSlug == provider.ServiceSlug &&
                    x.CitySlug == provider.CitySlug &&
                    x.DistrictSlug == provider.DistrictSlug);

            return Results.Ok(new
            {
                provider.Id,
                provider.Slug,
                provider.BusinessName,
                provider.ShortDescription,
                provider.Description,
                provider.CategorySlug,
                provider.ServiceSlug,
                provider.AdditionalServices,
                provider.CitySlug,
                provider.DistrictSlug,
                provider.PublicPhone,
                provider.PublicWhatsapp,
                provider.PublicAddress,
                provider.WorkingHours,
                provider.ExperienceYears,
                provider.EmergencyService,
                provider.OnsiteService,
                publicationStatus =
                    provider.PublicationStatus.ToString().ToLowerInvariant(),
                provider.PublishedAtUtc,
                provider.Version,
                matchedNeedCount
            });
        });

        group.MapGet("/needs", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba bağlı işletme bulunamadı."
                });
            }

            var needs = await dbContext.NeedRequests
                .AsNoTracking()
                .Where(x =>
                    x.CategorySlug == provider.CategorySlug &&
                    x.ServiceSlug == provider.ServiceSlug &&
                    x.CitySlug == provider.CitySlug &&
                    x.DistrictSlug == provider.DistrictSlug)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.Title,
                    x.Description,
                    x.Category,
                    x.City,
                    x.District,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(needs);
        });

        return app;
    }

    public static IEndpointRouteBuilder MapDevelopmentProviderOwnerEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin");

        group.MapPost("/providers/{id:guid}/link-owner", async (
            Guid id,
            LinkProviderOwnerRequest request,
            AppDbContext dbContext) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return Results.BadRequest(new
                {
                    message = "E-posta zorunludur."
                });
            }

            var normalizedEmail =
                request.Email.Trim().ToLowerInvariant().ToUpperInvariant();

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.NormalizedEmail == normalizedEmail);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Kullanıcı bulunamadı."
                });
            }

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme profili bulunamadı."
                });
            }

            var anotherProvider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.OwnerUserId == user.Id &&
                    x.Id != provider.Id);

            if (anotherProvider is not null)
            {
                return Results.Conflict(new
                {
                    message = "Bu kullanıcı başka bir işletmeye bağlı."
                });
            }

            provider.OwnerUserId = user.Id;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            user.Role = UserRole.Provider;
            user.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                providerId = provider.Id,
                providerSlug = provider.Slug,
                ownerUserId = user.Id,
                user.Email,
                user.DisplayName,
                role = user.Role.ToString().ToLowerInvariant(),
                providerVersion = provider.Version
            });
        });

        return app;
    }

    private static bool TryGetUserId(
        ClaimsPrincipal principal,
        out Guid userId)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(value, out userId);
    }
}

public sealed record LinkProviderOwnerRequest(
    string Email);
'@

Write-Utf8NoBom "$root\Endpoints\ProviderPanelEndpoints.cs" $endpoint

$programPath = "$root\Program.cs"
$program = Get-Content -Raw -Encoding UTF8 $programPath

if ($program -notmatch 'MapProviderPanelEndpoints\(\)') {
    $program = $program -replace `
        'app\.MapAuthEndpoints\(\);', `
        "app.MapAuthEndpoints();`r`napp.MapProviderPanelEndpoints();"
}

if ($program -notmatch 'MapDevelopmentProviderOwnerEndpoints\(\)') {
    $program = $program -replace `
        'app\.MapAdminProviderWorkflowEndpoints\(\);', `
        "app.MapAdminProviderWorkflowEndpoints();`r`n    app.MapDevelopmentProviderOwnerEndpoints();"
}

Write-Utf8NoBom $programPath $program

Write-Host ""
Write-Host "Isletme paneli backend endpointleri hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Yeni endpointler:" -ForegroundColor Cyan
Write-Host "  GET  /api/provider-panel/me"
Write-Host "  GET  /api/provider-panel/needs"
Write-Host "  POST /api/admin/providers/{id}/link-owner   (sadece Development)"
Write-Host ""
Write-Host "Simdi: dotnet build" -ForegroundColor Yellow
