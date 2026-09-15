using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class SmartSearchEndpoints
{
    public static IEndpointRouteBuilder MapSmartSearchEndpoints(
        this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/search/smart", async (
            string? q,
            string? ihtiyac,
            string? text,
            string? il,
            string? ilce,
            int? limit,
            SmartSearchService smartSearch,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var queryText =
                FirstNonEmpty(
                    q,
                    ihtiyac,
                    text);

            if (string.IsNullOrWhiteSpace(
                queryText))
            {
                return Results.BadRequest(
                    new
                    {
                        message =
                            "Aramak istediğiniz ihtiyacı yazın."
                    });
            }

            var intent =
                await smartSearch.ResolveAsync(
                    queryText,
                    cancellationToken);

            if (intent.Confidence < 0.72)
            {
                var unmatchedText = queryText.Trim();
                var recentCutoff = DateTime.UtcNow.AddMinutes(-30);

                var alreadyLogged = await dbContext.AdminAuditLogs
                    .AsNoTracking()
                    .AnyAsync(
                        x =>
                            x.Action == "search.unmatched" &&
                            x.EntityName == unmatchedText &&
                            x.CreatedAtUtc >= recentCutoff,
                        cancellationToken);

                if (!alreadyLogged)
                {
                    dbContext.AdminAuditLogs.Add(new AdminAuditLog
                    {
                        AdminUserId = null,
                        AdminEmail = "system@neyeihtiyacvar.local",
                        Action = "search.unmatched",
                        EntityType = "search",
                        EntityId = Guid.NewGuid().ToString(),
                        EntityName = unmatchedText,
                        Details =
                            $"confidence={intent.Confidence:0.000}; " +
                            $"source={intent.Source}; " +
                            $"suggestedCategory={intent.CategorySlug ?? "-"}; " +
                            $"suggestedService={intent.ServiceSlug ?? "-"}",
                        CreatedAtUtc = DateTime.UtcNow
                    });

                    await dbContext.SaveChangesAsync(cancellationToken);
                }

                intent = intent with
                {
                    CategorySlug = null,
                    CategoryName = null,
                    ServiceSlug = null,
                    ServiceName = null,
                    RelatedServiceSlugs = [],
                    BroadCategoryFallback = false
                };
            }
            var maxItems =
                Math.Clamp(
                    limit ?? 24,
                    1,
                    50);

            var providersQuery =
                dbContext.Providers
                    .AsNoTracking()
                    .Where(x =>
                        x.IsActive &&
                        x.PublicationStatus ==
                            PublicationStatus.Published);

            if (!string.IsNullOrWhiteSpace(il))
            {
                providersQuery =
                    providersQuery.Where(x =>
                        x.CitySlug ==
                            il.Trim());
            }

            if (!string.IsNullOrWhiteSpace(ilce))
            {
                providersQuery =
                    providersQuery.Where(x =>
                        x.DistrictSlug ==
                            ilce.Trim());
            }

            var published =
                await providersQuery
                    .Select(x => new
                    {
                        x.Id,
                        x.Slug,
                        x.BusinessName,
                        x.ShortDescription,
                        x.CategorySlug,
                        x.ServiceSlug,
                        x.AdditionalServices,
                        x.CitySlug,
                        x.DistrictSlug,
                        x.ExperienceYears,
                        x.EmergencyService,
                        x.OnsiteService
                    })
                    .ToListAsync(
                        cancellationToken);

            var related =
                intent.RelatedServiceSlugs
                    .ToHashSet(
                        StringComparer.OrdinalIgnoreCase);

            var normalizedQuery =
                SmartSearchService.Normalize(
                    queryText);

            var candidates =
                published
                    .Select(provider =>
                    {
                        var score = 0;
                        var matchLevel =
                            "category-fallback";

                        if (!string.IsNullOrWhiteSpace(
                                intent.ServiceSlug) &&
                            string.Equals(
                                provider.ServiceSlug,
                                intent.ServiceSlug,
                                StringComparison.OrdinalIgnoreCase))
                        {
                            score += 110;
                            matchLevel =
                                "main-service";
                        }
                        else if (related.Contains(
                            provider.ServiceSlug))
                        {
                            score += 88;
                            matchLevel =
                                "main-service";
                        }
                        else if (
                            provider.AdditionalServices.Any(
                                x =>
                                    (!string.IsNullOrWhiteSpace(
                                        intent.ServiceSlug) &&
                                     string.Equals(
                                         x,
                                         intent.ServiceSlug,
                                         StringComparison.OrdinalIgnoreCase)) ||
                                    related.Contains(x)))
                        {
                            score += 82;
                            matchLevel =
                                "additional-service";
                        }
                        else if (
                            !string.IsNullOrWhiteSpace(
                                intent.CategorySlug) &&
                            string.Equals(
                                provider.CategorySlug,
                                intent.CategorySlug,
                                StringComparison.OrdinalIgnoreCase))
                        {
                            score += 62;
                            matchLevel =
                                "category-fallback";
                        }

                        var providerText =
                            SmartSearchService.Normalize(
                                $"{provider.BusinessName} {provider.ShortDescription}");

                        if (providerText.Contains(
                            normalizedQuery,
                            StringComparison.Ordinal))
                        {
                            score += 25;
                        }

                        if (provider.EmergencyService)
                        {
                            score += 2;
                        }

                        if (provider.OnsiteService)
                        {
                            score += 2;
                        }

                        score += Math.Min(
                            provider.ExperienceYears ?? 0,
                            20) / 5;

                        var reasons =
                            BuildReasons(
                                matchLevel,
                                intent);

                        return new
                        {
                            provider.Id,
                            provider.Slug,
                            provider.BusinessName,
                            provider.ShortDescription,
                            provider.CategorySlug,
                            provider.ServiceSlug,
                            provider.AdditionalServices,
                            provider.CitySlug,
                            provider.DistrictSlug,
                            matchLevel,
                            averageRating = 0d,
                            reviewCount = 0,
                            provider.ExperienceYears,
                            provider.EmergencyService,
                            provider.OnsiteService,
                            score,
                            reasons
                        };
                    })
                    .Where(x =>
                        x.score >= 60 ||
                        (
                            string.IsNullOrWhiteSpace(
                                intent.CategorySlug) &&
                            string.IsNullOrWhiteSpace(
                                intent.ServiceSlug) &&
                            SmartSearchService
                                .Normalize(
                                    $"{x.BusinessName} {x.ShortDescription}")
                                .Contains(
                                    normalizedQuery,
                                    StringComparison.Ordinal)
                        ))
                    .OrderByDescending(x =>
                        x.score)
                    .ThenBy(x =>
                        x.BusinessName)
                    .Take(maxItems)
                    .ToList();

            var exactCandidateCount =
                candidates.Count(x =>
                    x.matchLevel ==
                        "main-service");

            var categoryCandidateCount =
                candidates.Count(x =>
                    x.matchLevel ==
                        "category-fallback");

            var serviceName =
                intent.ServiceName
                ?? intent.CategoryName
                ?? "İhtiyaç";

            var alternatives =
                await BuildAlternativesAsync(
                    intent,
                    dbContext,
                    cancellationToken);

            return Results.Ok(
                new
                {
                    understanding = new
                    {
                        originalText =
                            intent.OriginalText,
                        source =
                            intent.Source,
                        confidence =
                            intent.Confidence,
                        categorySlug =
                            intent.CategorySlug ?? "",
                        categoryName =
                            intent.CategoryName ?? "",
                        serviceSlug =
                            intent.ServiceSlug ?? "",
                        serviceName,
                        alternatives
                    },
                    location = new
                    {
                        citySlug =
                            il?.Trim() ?? "",
                        districtSlug =
                            ilce?.Trim() ?? ""
                    },
                    matching = new
                    {
                        exactServiceMatch =
                            exactCandidateCount > 0,
                        usedCategoryFallback =
                            intent.BroadCategoryFallback ||
                            categoryCandidateCount > 0,
                        exactCandidateCount,
                        categoryCandidateCount
                    },
                    totalCandidates =
                        candidates.Count,
                    recommendations =
                        candidates
                });
        });

        return app;
    }

    private static async Task<object[]> BuildAlternativesAsync(
        SmartSearchIntent intent,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (intent.RelatedServiceSlugs.Length == 0)
        {
            return [];
        }

        var categories =
            await dbContext.Categories
                .AsNoTracking()
                .Where(x => x.IsActive)
                .Include(x => x.Services)
                .ToListAsync(
                    cancellationToken);

        var items =
            new List<object>();

        foreach (var slug in
            intent.RelatedServiceSlugs
                .Take(6))
        {
            foreach (var category in categories)
            {
                var service =
                    category.Services
                        .Where(x =>
                            x.IsActive)
                        .FirstOrDefault(x =>
                            ToSlug(x.Name) ==
                                slug);

                if (service is null)
                {
                    continue;
                }

                items.Add(
                    new
                    {
                        categorySlug =
                            category.Slug,
                        categoryName =
                            category.Name,
                        serviceSlug =
                            slug,
                        serviceName =
                            service.Name,
                        score = 75
                    });

                break;
            }
        }

        return items.ToArray();
    }

    private static string[] BuildReasons(
        string matchLevel,
        SmartSearchIntent intent)
    {
        return matchLevel switch
        {
            "main-service" =>
            [
                "İhtiyacınla doğrudan eşleşen ana hizmet"
            ],
            "additional-service" =>
            [
                "İhtiyacınla eşleşen ek hizmet"
            ],
            _ =>
            [
                $"İhtiyacınla ilişkili {intent.CategoryName ?? "hizmet"} kategorisi"
            ]
        };
    }

    private static string FirstNonEmpty(
        params string?[] values)
        => values.FirstOrDefault(x =>
            !string.IsNullOrWhiteSpace(x))
            ?.Trim()
            ?? string.Empty;

    private static string ToSlug(
        string value)
    {
        var normalized =
            SmartSearchService.Normalize(
                value);

        return string.Join(
            "-",
            normalized.Split(
                ' ',
                StringSplitOptions.RemoveEmptyEntries));
    }
}