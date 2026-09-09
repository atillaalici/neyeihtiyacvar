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

$providerReview = @'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderReview
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NeedRequestId { get; set; }

    public NeedRequest NeedRequest { get; set; } = null!;

    public Guid ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public int Rating { get; set; }

    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
'@

$reviewEndpoints = @'
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ReviewEndpoints
{
    public static IEndpointRouteBuilder MapReviewEndpoints(
        this IEndpointRouteBuilder app)
    {
        var myNeeds = app
            .MapGroup("/api/my-needs")
            .RequireAuthorization();

        myNeeds.MapGet("/{needId:guid}/review", async (
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

            var review = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x =>
                    x.NeedRequestId == needId &&
                    x.UserId == userId)
                .Select(x => new
                {
                    x.Id,
                    x.NeedRequestId,
                    x.ProviderId,
                    providerSlug = x.Provider.Slug,
                    businessName = x.Provider.BusinessName,
                    x.Rating,
                    x.Comment,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc
                })
                .FirstOrDefaultAsync();

            return review is null
                ? Results.NoContent()
                : Results.Ok(review);
        });

        myNeeds.MapPost("/{needId:guid}/review", async (
            Guid needId,
            CreateProviderReviewRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var need = await dbContext.NeedRequests
                .AsNoTracking()
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

            if (need.Status != NeedStatus.Completed)
            {
                return Results.BadRequest(new
                {
                    message = "Yalnızca sonuçlanmış talepler değerlendirilebilir."
                });
            }

            var acceptedOffer = await dbContext.ProviderOffers
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.NeedRequestId == needId &&
                    x.Status == OfferStatus.Accepted);

            if (acceptedOffer is null)
            {
                return Results.BadRequest(new
                {
                    message = "Bu talep için kabul edilmiş teklif bulunamadı."
                });
            }

            var alreadyReviewed = await dbContext.ProviderReviews
                .AnyAsync(x => x.NeedRequestId == needId);

            if (alreadyReviewed)
            {
                return Results.Conflict(new
                {
                    message = "Bu talep için daha önce değerlendirme yaptınız."
                });
            }

            if (request.Rating is < 1 or > 5)
            {
                return Results.BadRequest(new
                {
                    message = "Puan 1 ile 5 arasında olmalıdır."
                });
            }

            var comment = request.Comment?.Trim() ?? string.Empty;

            if (comment.Length < 3 || comment.Length > 2000)
            {
                return Results.BadRequest(new
                {
                    message = "Yorum 3 ile 2000 karakter arasında olmalıdır."
                });
            }

            var now = DateTime.UtcNow;

            var review = new ProviderReview
            {
                NeedRequestId = need.Id,
                ProviderId = acceptedOffer.ProviderId,
                UserId = userId,
                Rating = request.Rating,
                Comment = comment,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.ProviderReviews.Add(review);
            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/my-needs/{need.Id}/review",
                new
                {
                    review.Id,
                    review.NeedRequestId,
                    review.ProviderId,
                    review.Rating,
                    review.Comment,
                    review.CreatedAtUtc
                });
        });

        app.MapGet("/api/providers/{slug}/reviews", async (
            string slug,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Slug == slug &&
                    x.PublicationStatus == PublicationStatus.Published);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme bulunamadı."
                });
            }

            var summary = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    averageRating = g.Average(x => x.Rating),
                    reviewCount = g.Count()
                })
                .FirstOrDefaultAsync();

            var reviews = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.Rating,
                    x.Comment,
                    reviewerName = x.User.DisplayName,
                    x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(new
            {
                providerId = provider.Id,
                providerSlug = provider.Slug,
                averageRating = summary?.averageRating ?? 0,
                reviewCount = summary?.reviewCount ?? 0,
                reviews
            });
        });

        var providerPanel = app
            .MapGroup("/api/provider-panel")
            .RequireAuthorization();

        providerPanel.MapGet("/reviews", async (
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

            var summary = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    averageRating = g.Average(x => x.Rating),
                    reviewCount = g.Count()
                })
                .FirstOrDefaultAsync();

            var reviews = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.NeedRequestId,
                    needTitle = x.NeedRequest.Title,
                    x.Rating,
                    x.Comment,
                    reviewerName = x.User.DisplayName,
                    x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(new
            {
                providerId = provider.Id,
                averageRating = summary?.averageRating ?? 0,
                reviewCount = summary?.reviewCount ?? 0,
                reviews
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

public sealed record CreateProviderReviewRequest(
    int Rating,
    string? Comment);
'@

Write-Utf8NoBom "$root\Domain\ProviderReview.cs" $providerReview
Write-Utf8NoBom "$root\Endpoints\ReviewEndpoints.cs" $reviewEndpoints

$appDbPath = Join-Path $root "Infrastructure\AppDbContext.cs"
$appDb = Get-Content -Raw -Encoding UTF8 $appDbPath

if ($appDb -notmatch 'DbSet<ProviderReview>') {
    $appDb = $appDb.Replace(
        '    public DbSet<ProviderOffer> ProviderOffers => Set<ProviderOffer>();',
        '    public DbSet<ProviderOffer> ProviderOffers => Set<ProviderOffer>();' + "`r`n`r`n" +
        '    public DbSet<ProviderReview> ProviderReviews => Set<ProviderReview>();'
    )
}

if ($appDb -notmatch 'modelBuilder\.Entity<ProviderReview>') {
    $insert = @'

        modelBuilder.Entity<ProviderReview>(entity =>
        {
            entity.HasIndex(x => x.NeedRequestId).IsUnique();
            entity.HasIndex(x => x.ProviderId);
            entity.HasIndex(x => x.UserId);

            entity.Property(x => x.Rating)
                .IsRequired();

            entity.Property(x => x.Comment)
                .HasMaxLength(2000)
                .IsRequired();

            entity.HasOne(x => x.NeedRequest)
                .WithMany()
                .HasForeignKey(x => x.NeedRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Provider)
                .WithMany()
                .HasForeignKey(x => x.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
'@

    $needle = "`r`n    }`r`n}"
    $index = $appDb.LastIndexOf($needle)

    if ($index -lt 0) {
        throw "AppDbContext.cs kapanis blogu bulunamadi."
    }

    $appDb = $appDb.Insert($index, $insert)
}

Write-Utf8NoBom $appDbPath $appDb

$programPath = Join-Path $root "Program.cs"
$program = Get-Content -Raw -Encoding UTF8 $programPath

if ($program -notmatch 'MapReviewEndpoints\(\)') {
    if ($program -match 'app\.MapOfferEndpoints\(\);') {
        $program = $program.Replace(
            'app.MapOfferEndpoints();',
            'app.MapOfferEndpoints();' + "`r`n" +
            'app.MapReviewEndpoints();'
        )
    }
    else {
        throw "Program.cs icinde MapOfferEndpoints bulunamadi."
    }
}

Write-Utf8NoBom $programPath $program

Write-Host ""
Write-Host "Puanlama ve yorum backend altyapisi hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Yeni model:" -ForegroundColor Cyan
Write-Host "  ProviderReview"
Write-Host ""
Write-Host "Kurallar:" -ForegroundColor Cyan
Write-Host "  Sadece tamamlanmis talebin sahibi yorum yapabilir"
Write-Host "  Sadece kabul edilen isletmeye yorum gider"
Write-Host "  Her talep icin sadece 1 yorum"
Write-Host "  Puan 1-5"
Write-Host "  Yorum 3-2000 karakter"
Write-Host ""
Write-Host "Yeni endpointler:" -ForegroundColor Cyan
Write-Host "  GET  /api/my-needs/{needId}/review"
Write-Host "  POST /api/my-needs/{needId}/review"
Write-Host "  GET  /api/providers/{slug}/reviews"
Write-Host "  GET  /api/provider-panel/reviews"
Write-Host ""
Write-Host "Simdi: dotnet build" -ForegroundColor Yellow
