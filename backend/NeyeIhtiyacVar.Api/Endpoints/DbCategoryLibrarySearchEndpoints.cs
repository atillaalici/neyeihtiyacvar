using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;
namespace NeyeIhtiyacVar.Api.Endpoints;
public static class DbCategoryLibrarySearchEndpoints
{
    public static IEndpointRouteBuilder MapDbCategoryLibrarySearchEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/search/intents/db-suggest", async (string? q,int? limit,AppDbContext db,CancellationToken ct) =>
        {
            var clean=Normalize(q); if(clean.Length<2) return Results.Ok(Array.Empty<object>());
            var tokens=Tokens(clean); var take=Math.Clamp(limit??8,1,12);
            var rows=await db.CategoryLibraryPhrases.AsNoTracking()
                .Where(p=>p.IsActive && p.Work.IsActive && p.Work.CategoryService.IsActive && p.Work.CategoryService.Category.IsActive)
                .Select(p=>new { Phrase=p.Phrase, WorkSort=p.Work.SortOrder,
                    ServiceId=p.Work.CategoryService.Id, ServiceName=p.Work.CategoryService.Name, ServiceSort=p.Work.CategoryService.SortOrder,
                    CategorySlug=p.Work.CategoryService.Category.Slug, CategoryName=p.Work.CategoryService.Category.Name,
                    CategorySort=p.Work.CategoryService.Category.SortOrder }).ToListAsync(ct);
            var result=rows.Select(r=>new{Row=r,Clean=Normalize(r.Phrase)})
                .Where(x=>tokens.All(t=>x.Clean.Contains(t,StringComparison.Ordinal)))
                .Select(x=>new{x.Row,Score=x.Clean==clean?1000:x.Clean.StartsWith(clean,StringComparison.Ordinal)?950:x.Clean.Contains(clean,StringComparison.Ordinal)?900:800})
                .GroupBy(x=>new{x.Row.ServiceId,x.Row.ServiceName,x.Row.ServiceSort,x.Row.CategorySlug,x.Row.CategoryName,x.Row.CategorySort})
                .Select(g=>new{g.Key,Score=g.Max(x=>x.Score),Keywords=g.OrderByDescending(x=>x.Score).ThenBy(x=>x.Row.WorkSort).Select(x=>x.Row.Phrase).Distinct(StringComparer.OrdinalIgnoreCase).Take(12).ToArray()})
                .OrderByDescending(x=>x.Score).ThenBy(x=>x.Key.CategorySort).ThenBy(x=>x.Key.ServiceSort).ThenBy(x=>x.Key.ServiceName).Take(take)
                .Select(x=>new{id=$"service:{x.Key.ServiceId}",label=x.Key.ServiceName,keywords=x.Keywords,categorySlug=x.Key.CategorySlug,
                    serviceSlug=TaxonomyV3Catalog.ToSlug(x.Key.ServiceName),intent="need",score=x.Score,matchReason="abc-kutuphane-cumlesi"}).ToArray();
            return Results.Ok(result);
        });
        return app;
    }
    private static string[] Tokens(string v)=>v.Split(' ',StringSplitOptions.RemoveEmptyEntries|StringSplitOptions.TrimEntries);
    private static string Normalize(string? value)
    {
        if(string.IsNullOrWhiteSpace(value)) return string.Empty;
        var v=value.Trim().ToLower(new CultureInfo("tr-TR")).Replace('ı','i').Replace('ğ','g').Replace('ü','u').Replace('ş','s').Replace('ö','o').Replace('ç','c').Normalize(NormalizationForm.FormD);
        var b=new StringBuilder(); foreach(var ch in v){if(CharUnicodeInfo.GetUnicodeCategory(ch)==UnicodeCategory.NonSpacingMark)continue;b.Append(char.IsLetterOrDigit(ch)?ch:' ');}
        return string.Join(' ',b.ToString().Split(' ',StringSplitOptions.RemoveEmptyEntries|StringSplitOptions.TrimEntries));
    }
}
