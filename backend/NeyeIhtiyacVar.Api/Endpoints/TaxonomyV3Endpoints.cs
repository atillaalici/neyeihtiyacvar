using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class TaxonomyV3Endpoints
{
    private sealed record ActiveCatalogItem(
        string CategorySlug,
        string CategoryName,
        int CategorySortOrder,
        string ServiceSlug,
        string ServiceName,
        int ServiceSortOrder);

    private sealed record PathView(
        string Id,
        string Area,
        string Group,
        string Service,
        string Specialty,
        string LegacyCategorySlug,
        string LegacyServiceSlug,
        string[] SearchTerms,
        int CategorySortOrder,
        int ServiceSortOrder);

    public static IEndpointRouteBuilder MapTaxonomyV3Endpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog/v3");

        group.MapGet(
            "/paths",
            async (
                AppDbContext dbContext,
                CancellationToken cancellationToken) =>
            {
                var activeCatalog =
                    await LoadActiveCatalogAsync(
                        dbContext,
                        cancellationToken);

                var views =
                    BuildViews(activeCatalog);

                return Results.Ok(
                    views.Select(x => new
                    {
                        id = x.Id,
                        area = x.Area,
                        group = x.Group,
                        service = x.Service,
                        specialty = x.Specialty,
                        legacyCategorySlug =
                            x.LegacyCategorySlug,
                        legacyServiceSlug =
                            x.LegacyServiceSlug,
                        searchTerms =
                            x.SearchTerms
                    }));
            });

        group.MapGet(
            "/suggest",
            async (
                string? q,
                int? limit,
                AppDbContext dbContext,
                CancellationToken cancellationToken) =>
            {
                var clean = q?.Trim() ?? string.Empty;

                if (clean.Length < 2)
                {
                    return Results.Ok(
                        Array.Empty<object>());
                }

                var activeCatalog =
                    await LoadActiveCatalogAsync(
                        dbContext,
                        cancellationToken);

                var items =
                    BuildViews(activeCatalog)
                        .Select(x => new
                        {
                            Path = x,
                            Score =
                                Score(
                                    clean,
                                    x)
                        })
                        .Where(x => x.Score >= 55)
                        .OrderByDescending(x => x.Score)
                        .ThenBy(x => x.Path.CategorySortOrder)
                        .ThenBy(x => x.Path.ServiceSortOrder)
                        .Take(
                            Math.Clamp(
                                limit ?? 8,
                                1,
                                12))
                        .Select(x => new
                        {
                            id = x.Path.Id,
                            area = x.Path.Area,
                            group = x.Path.Group,
                            service = x.Path.Service,
                            specialty = x.Path.Specialty,
                            legacyCategorySlug =
                                x.Path.LegacyCategorySlug,
                            legacyServiceSlug =
                                x.Path.LegacyServiceSlug,
                            score = x.Score,
                            examples =
                                x.Path.SearchTerms
                                    .Take(3)
                                    .ToArray()
                        })
                        .ToArray();

                return Results.Ok(items);
            });

        return app;
    }

    private static async Task<List<ActiveCatalogItem>>
        LoadActiveCatalogAsync(
            AppDbContext dbContext,
            CancellationToken cancellationToken)
    {
        var categories = await dbContext.Categories
            .AsNoTracking()
            .Where(x => x.IsActive)
            .Include(x => x.Services)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return categories
            .SelectMany(category =>
                category.Services
                    .Where(service => service.IsActive)
                    .OrderBy(service => service.SortOrder)
                    .ThenBy(service => service.Name)
                    .Select(service =>
                        new ActiveCatalogItem(
                            category.Slug,
                            category.Name,
                            category.SortOrder,
                            TaxonomyV3Catalog.ToSlug(
                                service.Name),
                            service.Name,
                            service.SortOrder)))
            .ToList();
    }

    private static PathView[] BuildViews(
        IReadOnlyList<ActiveCatalogItem> activeCatalog)
    {
        var result = new List<PathView>();

        foreach (var item in activeCatalog)
        {
            var mapped = TaxonomyV3Catalog.Paths
                .Where(path =>
                    PathBelongsToCatalogItem(
                        path,
                        item,
                        activeCatalog))
                .ToArray();

            if (mapped.Length == 0)
            {
                // Aktif katalogdaki HER hizmet mutlaka picker'da görünür.
                // Bu sayede Ana Alan listesi DB'deki 18 ana kategorinin
                // tamamindan oluşur.
                result.Add(
                    new PathView(
                        $"db--{item.CategorySlug}--{item.ServiceSlug}",
                        item.CategoryName,
                        "Genel Hizmetler",
                        item.ServiceName,
                        item.ServiceName,
                        item.CategorySlug,
                        item.ServiceSlug,
                        [item.ServiceName],
                        item.CategorySortOrder,
                        item.ServiceSortOrder));

                continue;
            }

            foreach (var path in mapped)
            {
                // KRITIK:
                // Ana Alan artik V3'teki serbest baslik degil.
                // Dogrudan aktif ana kategori adidir.
                result.Add(
                    new PathView(
                        path.Id,
                        item.CategoryName,
                        string.IsNullOrWhiteSpace(path.Group)
                            ? "Genel Hizmetler"
                            : path.Group,
                        string.IsNullOrWhiteSpace(path.Service)
                            ? item.ServiceName
                            : path.Service,
                        string.IsNullOrWhiteSpace(path.Specialty)
                            ? item.ServiceName
                            : path.Specialty,
                        item.CategorySlug,
                        item.ServiceSlug,
                        path.SearchTerms
                            .Append(item.ServiceName)
                            .Distinct(
                                StringComparer.OrdinalIgnoreCase)
                            .ToArray(),
                        item.CategorySortOrder,
                        item.ServiceSortOrder));
            }
        }

        return result
            .GroupBy(x => new
            {
                x.Area,
                x.Group,
                x.Service,
                x.Specialty,
                x.LegacyCategorySlug,
                x.LegacyServiceSlug
            })
            .Select(x => x.First())
            .OrderBy(x => x.CategorySortOrder)
            .ThenBy(x => x.ServiceSortOrder)
            .ThenBy(x => x.Group)
            .ThenBy(x => x.Service)
            .ThenBy(x => x.Specialty)
            .ToArray();
    }

    private static bool PathBelongsToCatalogItem(
        TaxonomyV3Path path,
        ActiveCatalogItem item,
        IReadOnlyList<ActiveCatalogItem> activeCatalog)
    {
        if (string.Equals(
                path.LegacyCategorySlug,
                item.CategorySlug,
                StringComparison.OrdinalIgnoreCase) &&
            string.Equals(
                path.LegacyServiceSlug,
                item.ServiceSlug,
                StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var pathServiceSlug =
            TaxonomyV3Catalog.ToSlug(
                path.Service);

        var exactServiceMatches =
            activeCatalog.Count(x =>
                string.Equals(
                    x.ServiceSlug,
                    pathServiceSlug,
                    StringComparison.OrdinalIgnoreCase));

        if (exactServiceMatches == 1 &&
            string.Equals(
                item.ServiceSlug,
                pathServiceSlug,
                StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var specialtySlug =
            TaxonomyV3Catalog.ToSlug(
                path.Specialty);

        var exactSpecialtyMatches =
            activeCatalog.Count(x =>
                string.Equals(
                    x.ServiceSlug,
                    specialtySlug,
                    StringComparison.OrdinalIgnoreCase));

        if (exactSpecialtyMatches == 1 &&
            string.Equals(
                item.ServiceSlug,
                specialtySlug,
                StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var legacyServiceMatches =
            activeCatalog.Count(x =>
                string.Equals(
                    x.ServiceSlug,
                    path.LegacyServiceSlug,
                    StringComparison.OrdinalIgnoreCase));

        return legacyServiceMatches == 1 &&
               string.Equals(
                   item.ServiceSlug,
                   path.LegacyServiceSlug,
                   StringComparison.OrdinalIgnoreCase);
    }

    private static int Score(
        string query,
        PathView path)
    {
        var normalizedQuery =
            TaxonomyV3Catalog.Normalize(
                query);

        if (normalizedQuery.Length == 0)
        {
            return 0;
        }

        var candidates = new[]
            {
                path.Area,
                path.Group,
                path.Service,
                path.Specialty
            }
            .Concat(path.SearchTerms)
            .Select(
                TaxonomyV3Catalog.Normalize)
            .Where(x => x.Length > 0);

        var best = 0;

        foreach (var candidate in candidates)
        {
            if (candidate == normalizedQuery)
            {
                best = Math.Max(
                    best,
                    100);

                continue;
            }

            if (candidate.Contains(
                    normalizedQuery,
                    StringComparison.Ordinal) ||
                normalizedQuery.Contains(
                    candidate,
                    StringComparison.Ordinal))
            {
                best = Math.Max(
                    best,
                    88);

                continue;
            }

            var queryTokens =
                normalizedQuery.Split(
                    ' ',
                    StringSplitOptions.RemoveEmptyEntries);

            var candidateTokens =
                candidate.Split(
                    ' ',
                    StringSplitOptions.RemoveEmptyEntries);

            var hitCount =
                queryTokens.Count(queryToken =>
                    candidateTokens.Any(candidateToken =>
                        candidateToken.Contains(
                            queryToken,
                            StringComparison.Ordinal) ||
                        queryToken.Contains(
                            candidateToken,
                            StringComparison.Ordinal)));

            if (hitCount > 0)
            {
                best = Math.Max(
                    best,
                    55 + Math.Min(
                        30,
                        hitCount * 10));
            }
        }

        return best;
    }
}