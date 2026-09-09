using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class CatalogEndpoints
{
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories");

        group.MapGet("/", async (AppDbContext dbContext) =>
        {
            var categories = await dbContext.Categories
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.Name,
                    Services = x.Services
                        .Where(service => service.IsActive)
                        .OrderBy(service => service.SortOrder)
                        .ThenBy(service => service.Name)
                        .Select(service => service.Name)
                        .ToList()
                })
                .ToListAsync();

            return Results.Ok(categories);
        });

        return app;
    }
}
