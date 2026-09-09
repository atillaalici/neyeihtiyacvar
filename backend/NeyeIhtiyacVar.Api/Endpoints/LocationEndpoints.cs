using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class LocationEndpoints
{
    public static IEndpointRouteBuilder MapLocationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/locations");

        group.MapGet("/", async (AppDbContext dbContext) =>
        {
            var cities = await dbContext.Cities
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.Name,
                    Districts = x.Districts
                        .Where(district => district.IsActive)
                        .OrderBy(district => district.SortOrder)
                        .ThenBy(district => district.Name)
                        .Select(district => new
                        {
                            district.Id,
                            district.Slug,
                            district.Name
                        })
                        .ToList()
                })
                .ToListAsync();

            return Results.Ok(cities);
        });

        return app;
    }
}
