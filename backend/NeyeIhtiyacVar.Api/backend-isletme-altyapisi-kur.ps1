$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"

New-Item -ItemType Directory -Force "$root\Domain" | Out-Null
New-Item -ItemType Directory -Force "$root\Endpoints" | Out-Null

@'
namespace NeyeIhtiyacVar.Api.Domain;

public enum PublicationStatus
{
    Draft = 0,
    Published = 1,
    Unpublished = 2
}
'@ | Set-Content -Encoding UTF8 "$root\Domain\PublicationStatus.cs"

@'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class Provider
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? SourceApplicationId { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string BusinessName { get; set; } = string.Empty;

    public string ShortDescription { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string CategorySlug { get; set; } = string.Empty;

    public string ServiceSlug { get; set; } = string.Empty;

    public string[] AdditionalServices { get; set; } = [];

    public string CitySlug { get; set; } = string.Empty;

    public string DistrictSlug { get; set; } = string.Empty;

    public string? PublicPhone { get; set; }

    public string? PublicWhatsapp { get; set; }

    public string? PublicAddress { get; set; }

    public string? WorkingHours { get; set; }

    public int? ExperienceYears { get; set; }

    public bool EmergencyService { get; set; }

    public bool OnsiteService { get; set; }

    public PublicationStatus PublicationStatus { get; set; } = PublicationStatus.Draft;

    public DateTime? PublishedAtUtc { get; set; }

    public string? PublishedBy { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public int Version { get; set; }
}
'@ | Set-Content -Encoding UTF8 "$root\Domain\Provider.cs"

@'
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderEndpoints
{
    public static IEndpointRouteBuilder MapProviderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/providers");

        group.MapGet("/", async (
            string? q,
            string? il,
            string? ilce,
            string? kategori,
            string? hizmet,
            AppDbContext dbContext) =>
        {
            var query = dbContext.Providers
                .AsNoTracking()
                .Where(x => x.PublicationStatus == PublicationStatus.Published);

            if (!string.IsNullOrWhiteSpace(il))
            {
                query = query.Where(x => x.CitySlug == il.Trim());
            }

            if (!string.IsNullOrWhiteSpace(ilce))
            {
                query = query.Where(x => x.DistrictSlug == ilce.Trim());
            }

            if (!string.IsNullOrWhiteSpace(kategori))
            {
                query = query.Where(x => x.CategorySlug == kategori.Trim());
            }

            if (!string.IsNullOrWhiteSpace(hizmet))
            {
                query = query.Where(x => x.ServiceSlug == hizmet.Trim());
            }

            if (!string.IsNullOrWhiteSpace(q))
            {
                var search = $"%{q.Trim()}%";

                query = query.Where(x =>
                    EF.Functions.ILike(x.BusinessName, search) ||
                    EF.Functions.ILike(x.ShortDescription, search) ||
                    (x.Description != null && EF.Functions.ILike(x.Description, search)));
            }

            var providers = await query
                .OrderByDescending(x => x.PublishedAtUtc)
                .ThenBy(x => x.BusinessName)
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.BusinessName,
                    x.ShortDescription,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.PublicPhone,
                    x.PublicWhatsapp,
                    publicationStatus = x.PublicationStatus.ToString().ToLowerInvariant()
                })
                .ToListAsync();

            return Results.Ok(providers);
        });

        group.MapGet("/{slug}", async (
            string slug,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .AsNoTracking()
                .Where(x =>
                    x.Slug == slug &&
                    x.PublicationStatus == PublicationStatus.Published)
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.BusinessName,
                    x.ShortDescription,
                    x.Description,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.AdditionalServices,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.PublicPhone,
                    x.PublicWhatsapp,
                    x.PublicAddress,
                    x.WorkingHours,
                    x.ExperienceYears,
                    x.EmergencyService,
                    x.OnsiteService,
                    publicationStatus = x.PublicationStatus.ToString().ToLowerInvariant()
                })
                .FirstOrDefaultAsync();

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme profili bulunamadı."
                });
            }

            return Results.Ok(provider);
        });

        return app;
    }
}
'@ | Set-Content -Encoding UTF8 "$root\Endpoints\ProviderEndpoints.cs"

$appDbPath = "$root\Infrastructure\AppDbContext.cs"
$appDb = Get-Content -Raw -Encoding UTF8 $appDbPath

if ($appDb -notmatch 'DbSet<Provider>\s+Providers') {
    $appDb = $appDb -replace `
        'public DbSet<District> Districts => Set<District>\(\);', `
        "public DbSet<District> Districts => Set<District>();`r`n`r`n    public DbSet<Provider> Providers => Set<Provider>();"
}

if ($appDb -notmatch 'modelBuilder\.Entity<Provider>') {
    $providerConfig = @'

        modelBuilder.Entity<Provider>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.HasIndex(x => x.PublicationStatus);
            entity.HasIndex(x => new { x.CitySlug, x.DistrictSlug });
            entity.HasIndex(x => new { x.CategorySlug, x.ServiceSlug });

            entity.Property(x => x.Slug)
                .HasMaxLength(180)
                .IsRequired();

            entity.Property(x => x.BusinessName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.ShortDescription)
                .HasMaxLength(300)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(4000);

            entity.Property(x => x.CategorySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.ServiceSlug)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.CitySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.DistrictSlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.PublicPhone)
                .HasMaxLength(30);

            entity.Property(x => x.PublicWhatsapp)
                .HasMaxLength(30);

            entity.Property(x => x.PublicAddress)
                .HasMaxLength(500);

            entity.Property(x => x.WorkingHours)
                .HasMaxLength(500);

            entity.Property(x => x.PublishedBy)
                .HasMaxLength(200);

            entity.Property(x => x.PublicationStatus)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(x => x.Version)
                .IsConcurrencyToken();
        });
'@

    $appDb = $appDb -replace `
        '(\s*)\}\s*\z', `
        "$providerConfig`r`n    }`r`n}"
}

Set-Content -Encoding UTF8 $appDbPath $appDb

$programPath = "$root\Program.cs"
$program = Get-Content -Raw -Encoding UTF8 $programPath

if ($program -notmatch 'MapProviderEndpoints\(\)') {
    $program = $program -replace `
        'app\.MapLocationEndpoints\(\);', `
        "app.MapLocationEndpoints();`r`napp.MapProviderEndpoints();"
}

Set-Content -Encoding UTF8 $programPath $program

Write-Host ""
Write-Host "Isletme domain modeli ve public provider endpointleri hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Olusturulan dosyalar:" -ForegroundColor Cyan
Write-Host "  Domain\PublicationStatus.cs"
Write-Host "  Domain\Provider.cs"
Write-Host "  Endpoints\ProviderEndpoints.cs"
Write-Host "  Infrastructure\AppDbContext.cs guncellendi"
Write-Host "  Program.cs guncellendi"
Write-Host ""
Write-Host "Simdi sadece: dotnet build" -ForegroundColor Yellow
