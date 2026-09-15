using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class CatalogEndpoints
{
    public static IEndpointRouteBuilder MapCatalogEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories");

        group.MapGet("/", async (AppDbContext dbContext) =>
        {
            var allowedSlugs =
                ExpandedCatalogSeeder.PublicCategorySlugs;

            var categoryRows = await dbContext.Categories
                .AsNoTracking()
                .Where(x =>
                    x.IsActive &&
                    allowedSlugs.Contains(x.Slug))
                .Select(x => new
                {
                    x.Id,
                    x.Slug
                })
                .ToListAsync();

            var categories = allowedSlugs
                .Select((slug, index) =>
                {
                    var row = categoryRows.FirstOrDefault(x =>
                        string.Equals(
                            x.Slug,
                            slug,
                            StringComparison.OrdinalIgnoreCase));

                    return row is null
                        ? null
                        : new
                        {
                            row.Id,
                            row.Slug,
                            Name =
                                ExpandedCatalogSeeder
                                    .GetPublicCategoryName(slug)
                                ?? slug,
                            Services =
                                ExpandedCatalogSeeder
                                    .GetPublicServices(slug)
                                    .ToList(),
                            SortOrder = index + 1
                        };
                })
                .Where(x => x is not null)
                .OrderBy(x => x!.SortOrder)
                .Select(x => new
                {
                    x!.Id,
                    x.Slug,
                    x.Name,
                    x.Services
                })
                .ToList();

            return Results.Ok(categories);
        });

        return app;
    }
}