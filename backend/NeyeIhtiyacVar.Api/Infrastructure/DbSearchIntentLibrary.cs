using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public static class DbSearchIntentLibrary
{
    public static async Task<SearchIntentSuggestion[]> SuggestAsync(
        AppDbContext dbContext,
        string query,
        int limit,
        CancellationToken cancellationToken)
    {
        var cleanQuery = Normalize(query);
        if (cleanQuery.Length < 2) return [];

        var queryTokens = Tokens(cleanQuery);

        var works = await dbContext.CategoryLibraryWorks
            .AsNoTracking()
            .Where(x =>
                x.IsActive &&
                x.CategoryService.IsActive &&
                x.CategoryService.Category.IsActive)
            .Include(x => x.CategoryService)
                .ThenInclude(x => x.Category)
            .Include(x => x.Phrases.Where(p => p.IsActive))
            .ToListAsync(cancellationToken);

        // Excel mantigi:
        // A = ana kategori (Category)
        // B = hizmet       (CategoryService)
        // C = kullanici cumlesi (Phrase)
        // Arama SADECE tek tek C cumlelerinde yapilir. Farkli cumlelerin
        // kelimeleri birlestirilmez ve kategori/hizmet adindan tahmin uretilmez.
        var matches = works
            .Select(work => new
            {
                Work = work,
                BestPhrase = work.Phrases
                    .Where(p => p.IsActive)
                    .Select(p => new
                    {
                        Phrase = p.Phrase,
                        Score = PhraseScore(cleanQuery, queryTokens, Normalize(p.Phrase))
                    })
                    .Where(x => x.Score > 0)
                    .OrderByDescending(x => x.Score)
                    .ThenBy(x => x.Phrase.Length)
                    .FirstOrDefault()
            })
            .Where(x => x.BestPhrase is not null)
            // Ayni B hizmetine birden fazla C satiri uyarsa tek hizmet onerisi goster.
            .GroupBy(x => x.Work.CategoryServiceId)
            .Select(g => g
                .OrderByDescending(x => x.BestPhrase!.Score)
                .ThenBy(x => x.Work.SortOrder)
                .First())
            .OrderByDescending(x => x.BestPhrase!.Score)
            .ThenBy(x => x.Work.CategoryService.Name)
            .Take(Math.Clamp(limit, 1, 12))
            .Select(x => new SearchIntentSuggestion(
                Id: $"db:{x.Work.CategoryServiceId}",
                // Dropdown'da B sutunu: hizmet adi.
                Label: x.Work.CategoryService.Name,
                // Secilen kaydin C cumleleri; frontend/API sozlesmesi korunuyor.
                Keywords: x.Work.Phrases
                    .Where(p => p.IsActive)
                    .Select(p => p.Phrase)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
                // Secimde A ve B dogrudan bu satirdan forma aktarilir.
                CategorySlug: x.Work.CategoryService.Category.Slug,
                ServiceSlug: TaxonomyV3Catalog.ToSlug(x.Work.CategoryService.Name),
                Intent: "need",
                Score: x.BestPhrase!.Score,
                MatchReason: $"cumle:{x.BestPhrase.Phrase}"))
            .ToArray();

        return matches;
    }

    private static int PhraseScore(string query, string[] queryTokens, string phrase)
    {
        if (string.IsNullOrWhiteSpace(phrase)) return 0;
        if (phrase == query) return 100;
        if (phrase.StartsWith(query, StringComparison.Ordinal)) return 98;
        if (phrase.Contains(query, StringComparison.Ordinal)) return 96;

        var phraseTokens = Tokens(phrase);
        if (queryTokens.Length == 0 || phraseTokens.Length == 0) return 0;

        // "temel kaz" -> "temel kazisi": her arama parcasi AYNI C cumlesindeki
        // bir kelimeyle tam veya on-ek olarak eslesmek zorunda.
        var allQueryTokensInSamePhrase = queryTokens.All(q =>
            phraseTokens.Any(p => TokenMatches(q, p)));
        if (allQueryTokensInSamePhrase) return 92;

        // Kullanici daha uzun dogal bir cumle yazmissa C cumlesinin anlamli
        // kelimelerinin tamami kullanici cumlesinde bulunuyorsa yine eslestir.
        var phraseInsideQuery = phraseTokens.Length >= 2 && phraseTokens.All(p =>
            queryTokens.Any(q => TokenMatches(p, q)));
        if (phraseInsideQuery) return 88;

        return 0;
    }

    private static bool TokenMatches(string left, string right)
    {
        if (left == right) return true;
        if (left.Length < 3 || right.Length < 3) return false;
        return left.StartsWith(right, StringComparison.Ordinal) ||
               right.StartsWith(left, StringComparison.Ordinal);
    }

    private static string[] Tokens(string value) =>
        value.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var lowered = value.Trim().ToLower(new CultureInfo("tr-TR"))
            .Replace('ı', 'i').Replace('ğ', 'g').Replace('ü', 'u')
            .Replace('ş', 's').Replace('ö', 'o').Replace('ç', 'c')
            .Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var ch in lowered)
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                builder.Append(ch);
        return Regex.Replace(builder.ToString().Normalize(NormalizationForm.FormC), @"[^a-z0-9]+", " ").Trim();
    }
}
