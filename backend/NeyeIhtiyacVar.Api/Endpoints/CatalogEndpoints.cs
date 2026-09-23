using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class CatalogEndpoints
{
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories");

        group.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
        {
            var categories = await db.Categories
                .AsNoTracking()
                .Where(category => category.IsActive)
                .OrderBy(category => category.SortOrder)
                .ThenBy(category => category.Name)
                .Select(category => new
                {
                    id = category.Id,
                    slug = category.Slug,
                    name = category.Name,
                    services = category.Services
                        .Where(service => service.IsActive)
                        .OrderBy(service => service.SortOrder)
                        .ThenBy(service => service.Name)
                        .Select(service => service.Name)
                        .ToArray()
                })
                .ToArrayAsync(ct);

            return Results.Ok(categories);
        });

        return app;
    }
}
