using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Notifications;

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

            var providerOwnerUserId = await dbContext.Providers
                .AsNoTracking()
                .Where(x => x.Id == acceptedOffer.ProviderId)
                .Select(x => x.OwnerUserId)
                .FirstOrDefaultAsync();

            if (providerOwnerUserId is Guid ownerUserId)
            {
                NotificationWriter.Add(
                    dbContext,
                    ownerUserId,
                    "new_review_received",
                    "Yeni müşteri değerlendirmesi",
                    $"\"{need.Title}\" işi için {request.Rating}/5 puanlı yeni bir değerlendirme aldınız.",
                    "/panel");
            }

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