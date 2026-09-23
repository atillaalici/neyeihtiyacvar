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
            var rows = await db.CategoryLibraryWorks.AsNoTracking()
                .Where(w => w.IsActive && w.CategoryService.IsActive && w.CategoryService.Category.IsActive)
                .Select(w => new {
                    CategoryId=w.CategoryService.Category.Id, CategorySlug=w.CategoryService.Category.Slug,
                    CategoryName=w.CategoryService.Category.Name, CategorySort=w.CategoryService.Category.SortOrder,
                    ServiceId=w.CategoryService.Id, ServiceName=w.CategoryService.Name, ServiceSort=w.CategoryService.SortOrder
                }).Distinct().ToListAsync(ct);
            var result = rows.GroupBy(x => new { x.CategoryId,x.CategorySlug,x.CategoryName,x.CategorySort })
                .OrderBy(g=>g.Key.CategorySort).ThenBy(g=>g.Key.CategoryName)
                .Select(g=>new {
                    id=g.Key.CategoryId, slug=g.Key.CategorySlug, name=g.Key.CategoryName,
                    services=g.GroupBy(x=>new{x.ServiceId,x.ServiceName,x.ServiceSort})
                        .OrderBy(x=>x.Key.ServiceSort).ThenBy(x=>x.Key.ServiceName).Select(x=>x.Key.ServiceName).ToArray()
                }).ToArray();
            return Results.Ok(result);
        });
        return app;
    }
}
