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

$needRequest = @'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class NeedRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? OwnerUserId { get; set; }

    public AppUser? OwnerUser { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string District { get; set; } = string.Empty;

    public string? CategorySlug { get; set; }

    public string? ServiceSlug { get; set; }

    public string? CitySlug { get; set; }

    public string? DistrictSlug { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<ProviderOffer> Offers { get; set; } = [];
}
'@

$offerStatus = @'
namespace NeyeIhtiyacVar.Api.Domain;

public enum OfferStatus
{
    Pending = 0,
    Accepted = 1,
    Rejected = 2,
    Withdrawn = 3
}
'@

$providerOffer = @'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderOffer
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NeedRequestId { get; set; }

    public NeedRequest NeedRequest { get; set; } = null!;

    public Guid ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public string Message { get; set; } = string.Empty;

    public decimal? Price { get; set; }

    public OfferStatus Status { get; set; } = OfferStatus.Pending;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
'@

$offerEndpoints = @'
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class OfferEndpoints
{
    public static IEndpointRouteBuilder MapOfferEndpoints(
        this IEndpointRouteBuilder app)
    {
        var providerGroup = app
            .MapGroup("/api/provider-panel")
            .RequireAuthorization();

        providerGroup.MapPost(
            "/needs/{needId:guid}/offers",
            async (
                Guid needId,
                CreateProviderOfferRequest request,
                ClaimsPrincipal principal,
                AppDbContext dbContext) =>
            {
                if (!TryGetUserId(principal, out var userId))
                {
                    return Results.Unauthorized();
                }

                var provider = await dbContext.Providers
                    .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

                if (provider is null)
                {
                    return Results.NotFound(new
                    {
                        message = "Bu hesaba bağlı işletme bulunamadı."
                    });
                }

                if (provider.PublicationStatus != PublicationStatus.Published)
                {
                    return Results.BadRequest(new
                    {
                        message = "Yalnızca yayındaki işletmeler teklif verebilir."
                    });
                }

                var need = await dbContext.NeedRequests
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == needId);

                if (need is null)
                {
                    return Results.NotFound(new
                    {
                        message = "İhtiyaç talebi bulunamadı."
                    });
                }

                var exactMatch =
                    need.CategorySlug == provider.CategorySlug &&
                    need.ServiceSlug == provider.ServiceSlug &&
                    need.CitySlug == provider.CitySlug &&
                    need.DistrictSlug == provider.DistrictSlug;

                if (!exactMatch)
                {
                    return Results.BadRequest(new
                    {
                        message = "Bu ihtiyaç talebi işletmenizle birebir eşleşmiyor."
                    });
                }

                if (need.OwnerUserId is null)
                {
                    return Results.BadRequest(new
                    {
                        message = "Bu eski/anonim talebe teklif verilemez."
                    });
                }

                var exists = await dbContext.ProviderOffers
                    .AnyAsync(x =>
                        x.NeedRequestId == needId &&
                        x.ProviderId == provider.Id &&
                        x.Status != OfferStatus.Withdrawn);

                if (exists)
                {
                    return Results.Conflict(new
                    {
                        message = "Bu ihtiyaç talebine zaten teklif verdiniz."
                    });
                }

                var message = request.Message?.Trim() ?? string.Empty;

                if (message.Length < 5 || message.Length > 2000)
                {
                    return Results.BadRequest(new
                    {
                        message = "Teklif mesajı 5 ile 2000 karakter arasında olmalıdır."
                    });
                }

                if (request.Price is < 0 or > 100000000)
                {
                    return Results.BadRequest(new
                    {
                        message = "Teklif tutarı geçerli değil."
                    });
                }

                var offer = new ProviderOffer
                {
                    NeedRequestId = need.Id,
                    ProviderId = provider.Id,
                    Message = message,
                    Price = request.Price,
                    Status = OfferStatus.Pending
                };

                dbContext.ProviderOffers.Add(offer);
                await dbContext.SaveChangesAsync();

                return Results.Created(
                    $"/api/provider-panel/offers/{offer.Id}",
                    new
                    {
                        offer.Id,
                        offer.NeedRequestId,
                        offer.ProviderId,
                        offer.Message,
                        offer.Price,
                        status = offer.Status.ToString().ToLowerInvariant(),
                        offer.CreatedAtUtc
                    });
            });

        providerGroup.MapGet(
            "/offers",
            async (
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

                var offers = await dbContext.ProviderOffers
                    .AsNoTracking()
                    .Where(x => x.ProviderId == provider.Id)
                    .OrderByDescending(x => x.CreatedAtUtc)
                    .Select(x => new
                    {
                        x.Id,
                        x.NeedRequestId,
                        needTitle = x.NeedRequest.Title,
                        x.Message,
                        x.Price,
                        status = x.Status.ToString().ToLowerInvariant(),
                        x.CreatedAtUtc,
                        x.UpdatedAtUtc
                    })
                    .ToListAsync();

                return Results.Ok(offers);
            });

        var myNeedsGroup = app
            .MapGroup("/api/my-needs")
            .RequireAuthorization();

        myNeedsGroup.MapGet(
            "/",
            async (
                ClaimsPrincipal principal,
                AppDbContext dbContext) =>
            {
                if (!TryGetUserId(principal, out var userId))
                {
                    return Results.Unauthorized();
                }

                var needs = await dbContext.NeedRequests
                    .AsNoTracking()
                    .Where(x => x.OwnerUserId == userId)
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
                        x.CreatedAtUtc,
                        offerCount = x.Offers.Count
                    })
                    .ToListAsync();

                return Results.Ok(needs);
            });

        myNeedsGroup.MapGet(
            "/{needId:guid}/offers",
            async (
                Guid needId,
                ClaimsPrincipal principal,
                AppDbContext dbContext) =>
            {
                if (!TryGetUserId(principal, out var userId))
                {
                    return Results.Unauthorized();
                }

                var ownsNeed = await dbContext.NeedRequests
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.Id == needId &&
                        x.OwnerUserId == userId);

                if (!ownsNeed)
                {
                    return Results.NotFound(new
                    {
                        message = "İhtiyaç talebi bulunamadı."
                    });
                }

                var offers = await dbContext.ProviderOffers
                    .AsNoTracking()
                    .Where(x =>
                        x.NeedRequestId == needId &&
                        x.Status != OfferStatus.Withdrawn)
                    .OrderByDescending(x => x.CreatedAtUtc)
                    .Select(x => new
                    {
                        x.Id,
                        x.NeedRequestId,
                        x.ProviderId,
                        providerSlug = x.Provider.Slug,
                        businessName = x.Provider.BusinessName,
                        shortDescription = x.Provider.ShortDescription,
                        publicPhone = x.Provider.PublicPhone,
                        publicWhatsapp = x.Provider.PublicWhatsapp,
                        x.Message,
                        x.Price,
                        status = x.Status.ToString().ToLowerInvariant(),
                        x.CreatedAtUtc
                    })
                    .ToListAsync();

                return Results.Ok(offers);
            });

        myNeedsGroup.MapPost(
            "/{needId:guid}/offers/{offerId:guid}/accept",
            async (
                Guid needId,
                Guid offerId,
                ClaimsPrincipal principal,
                AppDbContext dbContext) =>
            {
                if (!TryGetUserId(principal, out var userId))
                {
                    return Results.Unauthorized();
                }

                var need = await dbContext.NeedRequests
                    .FirstOrDefaultAsync(x =>
                        x.Id == needId &&
                        x.OwnerUserId == userId);

                if (need is null)
                {
                    return Results.NotFound(new
                    {
                        message = "İhtiyaç talebi bulunamadı."
                    });
                }

                var selectedOffer = await dbContext.ProviderOffers
                    .FirstOrDefaultAsync(x =>
                        x.Id == offerId &&
                        x.NeedRequestId == needId);

                if (selectedOffer is null)
                {
                    return Results.NotFound(new
                    {
                        message = "Teklif bulunamadı."
                    });
                }

                if (selectedOffer.Status == OfferStatus.Withdrawn)
                {
                    return Results.BadRequest(new
                    {
                        message = "Geri çekilmiş teklif kabul edilemez."
                    });
                }

                var allOffers = await dbContext.ProviderOffers
                    .Where(x =>
                        x.NeedRequestId == needId &&
                        x.Status != OfferStatus.Withdrawn)
                    .ToListAsync();

                foreach (var offer in allOffers)
                {
                    offer.Status =
                        offer.Id == selectedOffer.Id
                            ? OfferStatus.Accepted
                            : OfferStatus.Rejected;

                    offer.UpdatedAtUtc = DateTime.UtcNow;
                }

                await dbContext.SaveChangesAsync();

                return Results.Ok(new
                {
                    offerId = selectedOffer.Id,
                    status = "accepted"
                });
            });

        myNeedsGroup.MapPost(
            "/{needId:guid}/offers/{offerId:guid}/reject",
            async (
                Guid needId,
                Guid offerId,
                ClaimsPrincipal principal,
                AppDbContext dbContext) =>
            {
                if (!TryGetUserId(principal, out var userId))
                {
                    return Results.Unauthorized();
                }

                var ownsNeed = await dbContext.NeedRequests
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.Id == needId &&
                        x.OwnerUserId == userId);

                if (!ownsNeed)
                {
                    return Results.NotFound(new
                    {
                        message = "İhtiyaç talebi bulunamadı."
                    });
                }

                var offer = await dbContext.ProviderOffers
                    .FirstOrDefaultAsync(x =>
                        x.Id == offerId &&
                        x.NeedRequestId == needId);

                if (offer is null)
                {
                    return Results.NotFound(new
                    {
                        message = "Teklif bulunamadı."
                    });
                }

                if (offer.Status == OfferStatus.Accepted)
                {
                    return Results.BadRequest(new
                    {
                        message = "Kabul edilmiş teklif reddedilemez."
                    });
                }

                offer.Status = OfferStatus.Rejected;
                offer.UpdatedAtUtc = DateTime.UtcNow;

                await dbContext.SaveChangesAsync();

                return Results.Ok(new
                {
                    offerId = offer.Id,
                    status = "rejected"
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

public sealed record CreateProviderOfferRequest(
    string? Message,
    decimal? Price);
'@

$appDbPath = Join-Path $root "Infrastructure\AppDbContext.cs"
$appDb = Get-Content -Raw -Encoding UTF8 $appDbPath

if ($appDb -notmatch 'DbSet<ProviderOffer>') {
    $appDb = $appDb -replace `
        'public DbSet<AppUser> Users => Set<AppUser>\(\);', `
        "public DbSet<AppUser> Users => Set<AppUser>();`r`n`r`n    public DbSet<ProviderOffer> ProviderOffers => Set<ProviderOffer>();"
}

$needConfig = @'

        modelBuilder.Entity<NeedRequest>(entity =>
        {
            entity.HasIndex(x => x.OwnerUserId);

            entity.HasOne(x => x.OwnerUser)
                .WithMany()
                .HasForeignKey(x => x.OwnerUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProviderOffer>(entity =>
        {
            entity.HasIndex(x => new
            {
                x.NeedRequestId,
                x.ProviderId
            }).IsUnique();

            entity.HasIndex(x => x.Status);

            entity.Property(x => x.Message)
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(x => x.Price)
                .HasPrecision(12, 2);

            entity.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(x => x.NeedRequest)
                .WithMany(x => x.Offers)
                .HasForeignKey(x => x.NeedRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Provider)
                .WithMany()
                .HasForeignKey(x => x.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
'@

if ($appDb -notmatch 'modelBuilder\.Entity<ProviderOffer>') {
    $marker = "`r`n    }`r`n}"
    $index = $appDb.LastIndexOf($marker)

    if ($index -lt 0) {
        throw "AppDbContext.cs kapanis blogu bulunamadi."
    }

    $appDb = $appDb.Insert($index, $needConfig)
}

Write-Utf8NoBom "$root\Domain\NeedRequest.cs" $needRequest
Write-Utf8NoBom "$root\Domain\OfferStatus.cs" $offerStatus
Write-Utf8NoBom "$root\Domain\ProviderOffer.cs" $providerOffer
Write-Utf8NoBom "$root\Endpoints\OfferEndpoints.cs" $offerEndpoints
Write-Utf8NoBom $appDbPath $appDb

$programPath = Join-Path $root "Program.cs"
$program = Get-Content -Raw -Encoding UTF8 $programPath

if ($program -notmatch 'MapOfferEndpoints\(\)') {
    $program = $program -replace `
        'app\.MapProviderPanelEndpoints\(\);', `
        "app.MapProviderPanelEndpoints();`r`napp.MapOfferEndpoints();"
}

Write-Utf8NoBom $programPath $program

Write-Host ""
Write-Host "Teklif altyapisi backend'e eklendi." -ForegroundColor Green
Write-Host ""
Write-Host "Yeni alan:" -ForegroundColor Cyan
Write-Host "  NeedRequests.OwnerUserId"
Write-Host ""
Write-Host "Yeni tablo:" -ForegroundColor Cyan
Write-Host "  ProviderOffers"
Write-Host ""
Write-Host "Yeni endpointler:" -ForegroundColor Cyan
Write-Host "  POST /api/provider-panel/needs/{needId}/offers"
Write-Host "  GET  /api/provider-panel/offers"
Write-Host "  GET  /api/my-needs"
Write-Host "  GET  /api/my-needs/{needId}/offers"
Write-Host "  POST /api/my-needs/{needId}/offers/{offerId}/accept"
Write-Host "  POST /api/my-needs/{needId}/offers/{offerId}/reject"
Write-Host ""
Write-Host "Simdi: dotnet build" -ForegroundColor Yellow
