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

        group.MapGet("/tree", async (AppDbContext db, CancellationToken ct) =>
        {
            var categories = await db.Categories
                .AsNoTracking()
                .Where(category => category.IsActive)
                .OrderBy(category => category.SortOrder)
                .ThenBy(category => category.Name)
                .Select(category => new
                {
                    id = category.Id,
                    name = category.Name,
                    slug = category.Slug,
                    services = category.Services
                        .Where(service => service.IsActive)
                        .OrderBy(service => service.SortOrder)
                        .ThenBy(service => service.Name)
                        .Select(service => new
                        {
                            id = service.Id,
                            name = service.Name,
                            works = db.CategoryLibraryWorks
                                .Where(work =>
                                    work.CategoryServiceId == service.Id &&
                                    work.IsActive)
                                .OrderBy(work => work.SortOrder)
                                .ThenBy(work => work.Name)
                                .Select(work => new
                                {
                                    id = work.Id,
                                    name = work.Name
                                })
                                .ToArray()
                        })
                        .ToArray()
                })
                .ToArrayAsync(ct);

            return Results.Ok(categories);
        });

        return app;
    }
}
