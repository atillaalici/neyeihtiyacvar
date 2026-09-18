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
        var clean = Normalize(query);
        if (clean.Length < 2) return [];

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

        var queryTokens = Tokens(clean);

        var scored = works
            .Select(work =>
            {
                var aliases = work.Phrases
                    .Where(p => p.IsActive)
                    .Select(p => p.Phrase)
                    .Append(work.Name)
                    .Append(work.CategoryService.Name)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();

                var best = aliases
                    .Select(alias => new
                    {
                        Alias = alias,
                        Score = Score(clean, queryTokens, Normalize(alias))
                    })
                    .OrderByDescending(x => x.Score)
                    .FirstOrDefault();

                return new
                {
                    Work = work,
                    Aliases = aliases,
                    Score = best?.Score ?? 0
                };
            })
            .Where(x => x.Score >= 52)
            .GroupBy(x => x.Work.CategoryServiceId)
            .Select(g => g
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Work.SortOrder)
                .First())
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Work.SortOrder)
            .ThenBy(x => x.Work.CategoryService.Name)
            .Take(Math.Clamp(limit, 1, 12))
            .Select(x => new SearchIntentSuggestion(
                Id: $"db:{x.Work.Id}",
                Label: x.Work.Name,
                Keywords: x.Aliases,
                CategorySlug: x.Work.CategoryService.Category.Slug,
                ServiceSlug: TaxonomyV3Catalog.ToSlug(x.Work.CategoryService.Name),
                Intent: "need",
                Score: x.Score,
                MatchReason: "kategori-kutuphanesi"))
            .ToArray();

        return scored;
    }

    private static int Score(
        string query,
        string[] queryTokens,
        string alias)
    {
        if (string.IsNullOrWhiteSpace(alias)) return 0;
        if (query == alias) return 100;

        var score = 0;

        if (alias.StartsWith(query, StringComparison.Ordinal))
            score = Math.Max(score, 94);
        else if (query.StartsWith(alias, StringComparison.Ordinal))
            score = Math.Max(score, 91);
        else if (ContainsWhole(alias, query))
            score = Math.Max(score, 89);
        else if (ContainsWhole(query, alias))
            score = Math.Max(score, 87);
        else if (alias.Contains(query, StringComparison.Ordinal))
            score = Math.Max(score, 84);
        else if (query.Contains(alias, StringComparison.Ordinal))
            score = Math.Max(score, 82);

        var aliasTokens = Tokens(alias);
        if (queryTokens.Length > 0 && aliasTokens.Length > 0)
        {
            var matched = 0;
            var exact = 0;

            foreach (var q in queryTokens)
            {
                var best = aliasTokens
                    .Select(a => TokenSimilarity(q, a))
                    .DefaultIfEmpty(0)
                    .Max();

                if (best >= 0.72) matched++;
                if (best >= 0.999) exact++;
            }

            var coverage = (double)matched / queryTokens.Length;

            // Multi-word searches must substantially agree with the alias.
            if (queryTokens.Length >= 2 && coverage < 0.67)
                return score >= 87 ? score : 0;

            if (coverage >= 1.0)
                score = Math.Max(score, 78 + Math.Min(exact * 3, 12));
            else if (coverage >= 0.67)
                score = Math.Max(score, 68 + Math.Min(exact * 3, 9));
            else if (coverage >= 0.5 && queryTokens.Length == 1)
                score = Math.Max(score, 58);
        }

        // Conservative typo tolerance. Short words are not fuzzily matched.
        if (score == 0 && query.Length >= 4 && alias.Length >= 4)
        {
            var distance = Levenshtein(query, alias);
            var maxLen = Math.Max(query.Length, alias.Length);
            var similarity = 1.0 - ((double)distance / maxLen);

            if ((maxLen <= 6 && distance <= 1) ||
                (maxLen > 6 && similarity >= 0.82))
            {
                score = 64;
            }
        }

        return score;
    }

    private static double TokenSimilarity(string left, string right)
    {
        if (left == right) return 1;
        if (left.Length < 3 || right.Length < 3) return 0;

        if (right.StartsWith(left, StringComparison.Ordinal) ||
            left.StartsWith(right, StringComparison.Ordinal))
        {
            var ratio = (double)Math.Min(left.Length, right.Length) /
                        Math.Max(left.Length, right.Length);
            if (ratio >= 0.5) return 0.92;
        }

        if (left.Length < 4 || right.Length < 4) return 0;

        var distance = Levenshtein(left, right);
        var maxLen = Math.Max(left.Length, right.Length);

        if (maxLen <= 6)
            return distance <= 1 ? 0.84 : 0;

        var similarity = 1.0 - ((double)distance / maxLen);
        return similarity >= 0.78 ? similarity : 0;
    }

    private static bool ContainsWhole(string haystack, string needle)
    {
        if (string.IsNullOrWhiteSpace(needle)) return false;
        return Regex.IsMatch(
            haystack,
            $@"(?:^|\s){Regex.Escape(needle)}(?:$|\s)",
            RegexOptions.CultureInvariant);
    }

    private static string[] Tokens(string value) =>
        value.Split(
            ' ',
            StringSplitOptions.RemoveEmptyEntries |
            StringSplitOptions.TrimEntries);

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var lowered = value
            .Trim()
            .ToLower(new CultureInfo("tr-TR"))
            .Replace('ı', 'i')
            .Replace('ğ', 'g')
            .Replace('ü', 'u')
            .Replace('ş', 's')
            .Replace('ö', 'o')
            .Replace('ç', 'c')
            .Normalize(NormalizationForm.FormD);

        var builder = new StringBuilder();

        foreach (var ch in lowered)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) !=
                UnicodeCategory.NonSpacingMark)
            {
                builder.Append(ch);
            }
        }

        return Regex.Replace(
                builder.ToString().Normalize(NormalizationForm.FormC),
                @"[^a-z0-9]+",
                " ")
            .Trim();
    }

    private static int Levenshtein(string left, string right)
    {
        if (left.Length == 0) return right.Length;
        if (right.Length == 0) return left.Length;

        var previous = new int[right.Length + 1];
        var current = new int[right.Length + 1];

        for (var j = 0; j <= right.Length; j++) previous[j] = j;

        for (var i = 1; i <= left.Length; i++)
        {
            current[0] = i;

            for (var j = 1; j <= right.Length; j++)
            {
                var cost = left[i - 1] == right[j - 1] ? 0 : 1;
                current[j] = Math.Min(
                    Math.Min(current[j - 1] + 1, previous[j] + 1),
                    previous[j - 1] + cost);
            }

            (previous, current) = (current, previous);
        }

        return previous[right.Length];
    }
}
