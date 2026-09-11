using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class FeaturedProviderEndpoints
{
    public static IEndpointRouteBuilder MapFeaturedProviderEndpoints(
        this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/featured-providers", async (
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var providers = await dbContext.Providers
                .AsNoTracking()
                .Where(x =>
                    x.IsActive &&
                    x.PublicationStatus == PublicationStatus.Published)
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
                    x.ExperienceYears,
                    x.EmergencyService,
                    x.OnsiteService,
                    x.PublishedAtUtc
                })
                .ToListAsync(cancellationToken);

            var providerIds = providers.Select(x => x.Id).ToArray();

            var reviewStats = providerIds.Length == 0
                ? new Dictionary<Guid, ReviewStat>()
                : await dbContext.ProviderReviews
                    .AsNoTracking()
                    .Where(x => providerIds.Contains(x.ProviderId))
                    .GroupBy(x => x.ProviderId)
                    .Select(group => new ReviewStat(
                        group.Key,
                        group.Count(),
                        Math.Round(group.Average(x => x.Rating), 1)))
                    .ToDictionaryAsync(x => x.ProviderId, cancellationToken);

            var ranked = providers
                .Select(x =>
                {
                    reviewStats.TryGetValue(x.Id, out var stats);

                    return new FeaturedProviderItem(
                        x.Id,
                        x.Slug,
                        x.BusinessName,
                        x.ShortDescription,
                        x.CategorySlug,
                        x.ServiceSlug,
                        x.CitySlug,
                        x.DistrictSlug,
                        x.ExperienceYears,
                        x.EmergencyService,
                        x.OnsiteService,
                        x.PublishedAtUtc,
                        stats?.ReviewCount ?? 0,
                        stats?.AverageRating);
                })
                // Guven sinyali olan isletmeler once.
                // Sonra ortalama puan, ardindan degerlendirme sayisi.
                // Esitlikte yayin tarihi ve isim deterministik siralama saglar.
                .OrderByDescending(x => x.ReviewCount > 0)
                .ThenByDescending(x => x.AverageRating ?? 0)
                .ThenByDescending(x => x.ReviewCount)
                .ThenBy(x => x.PublishedAtUtc ?? DateTime.MaxValue)
                .ThenBy(x => x.BusinessName)
                .ToList();

            const int showcaseSize = 8;

            var visible = ranked
                .Take(showcaseSize)
                .ToArray();

            return Results.Ok(new
            {
                count = visible.Length,
                totalEligible = ranked.Count,
                rotationActive = false,
                rankingMode = "trust",
                providers = visible
            });
        });

        return app;
    }

    private sealed record ReviewStat(
        Guid ProviderId,
        int ReviewCount,
        double AverageRating);

    private sealed record FeaturedProviderItem(
        Guid Id,
        string Slug,
        string BusinessName,
        string ShortDescription,
        string CategorySlug,
        string ServiceSlug,
        string CitySlug,
        string DistrictSlug,
        int? ExperienceYears,
        bool EmergencyService,
        bool OnsiteService,
        DateTime? PublishedAtUtc,
        int ReviewCount,
        double? AverageRating);
}