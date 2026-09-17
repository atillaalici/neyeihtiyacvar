using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class DbCategoryLibrarySearchEndpoints
{
    public static IEndpointRouteBuilder MapDbCategoryLibrarySearchEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/search/intents/db-suggest", async (
            string? q,
            int? limit,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var clean = Normalize(q ?? string.Empty);
            var take = Math.Clamp(limit ?? 8, 1, 50);

            if (clean.Length < 2)
            {
                return Results.Ok(Array.Empty<object>());
            }

            var rows = await dbContext.CategoryLibraryWorks
                .AsNoTracking()
                .Where(x => x.IsActive && x.CategoryService.IsActive && x.CategoryService.Category.IsActive)
                .Include(x => x.CategoryService)
                    .ThenInclude(x => x.Category)
                .Include(x => x.Phrases.Where(p => p.IsActive))
                .ToListAsync(cancellationToken);

            var matches = rows
                .Select(work =>
                {
                    var workName = Normalize(work.Name);
                    var phraseMatches = work.Phrases
                        .Select(p => new { Phrase = p, Clean = Normalize(p.Phrase) })
                        .Where(x => x.Clean.Contains(clean, StringComparison.Ordinal) ||
                                    clean.Contains(x.Clean, StringComparison.Ordinal))
                        .ToArray();

                    var score =
                        workName == clean ? 1000 :
                        workName.StartsWith(clean, StringComparison.Ordinal) ? 900 :
                        workName.Contains(clean, StringComparison.Ordinal) ? 800 :
                        phraseMatches.Any(x => x.Clean == clean) ? 950 :
                        phraseMatches.Any() ? 750 : 0;

                    if (score == 0)
                    {
                        var tokens = clean.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                        var haystack = workName + " " + string.Join(" ", work.Phrases.Select(p => Normalize(p.Phrase)));
                        var hitCount = tokens.Count(t => haystack.Contains(t, StringComparison.Ordinal));
                        if (hitCount == tokens.Length && hitCount > 0)
                        {
                            score = 600 + (hitCount * 10);
                        }
                    }

                    return new
                    {
                        Work = work,
                        Score = score,
                        PhraseMatches = phraseMatches
                    };
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Work.SortOrder)
                .Take(take)
                .Select(x => new
                {
                    id = $"db:{x.Work.Id}",
                    label = x.Work.Name,
                    keywords = x.Work.Phrases.Select(p => p.Phrase).Prepend(x.Work.Name).Distinct().ToArray(),
                    categorySlug = x.Work.CategoryService.Category.Slug,
                    serviceSlug = TaxonomyV3Catalog.ToSlug(x.Work.CategoryService.Name),
                    intent = "need",
                    score = x.Score,
                    matchReason = "kategori-kutuphanesi"
                })
                .ToArray();

            return Results.Ok(matches);
        });

        return app;
    }

    private static string Normalize(string value)
    {
        return value
            .Trim()
            .ToLowerInvariant()
            .Replace("ç", "c")
            .Replace("ğ", "g")
            .Replace("ı", "i")
            .Replace("ö", "o")
            .Replace("ş", "s")
            .Replace("ü", "u");
    }
}
