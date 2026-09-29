using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;

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

        var cachedPhrases = await LoadPhrasesAsync(
            dbContext,
            cancellationToken);

        // A = ana kategori
        // B = hizmet
        // C = kullanici cumlesi
        //
        // Eslesme yalnizca C cumlelerinden uretilir.
        // C cumlelerinin normalize edilmis hali ve tokenlari cache yuklenirken
        // bir kez hesaplanir; her aramada 100 binden fazla kez tekrarlanmaz.
        var phraseMatches = cachedPhrases
            .Select(item => new
            {
                Work = item.Work,
                Phrase = item.Phrase,
                Score = PhraseScore(
                    cleanQuery,
                    queryTokens,
                    item.NormalizedPhrase,
                    item.Tokens)
            })
            .Where(x => x.Score > 0)
            .ToArray();

        var matches = phraseMatches
            .GroupBy(x => x.Work.CategoryServiceId)
            .Select(g =>
            {
                var ordered = g
                    .OrderByDescending(x => x.Score)
                    .ThenBy(x => x.Phrase.Length)
                    .ThenBy(x => x.Work.SortOrder)
                    .ToArray();

                var representative = ordered[0];

                var distinctEvidence = ordered
                    .Select(x => x.Phrase)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();

                var bestScore = ordered[0].Score;

                // 96+ = sorgunun C cumlesinde dogrudan gecmesi.
                // 92  = tum sorgu tokenlarinin ayni C cumlesinde bulunmasi.
                var strongEvidenceCount = ordered.Count(x => x.Score >= 96);
                var tokenEvidenceCount = ordered.Count(x => x.Score >= 92);

                // Siralama puani:
                // - En iyi C eslesmesi ana sinyaldir.
                // - Birden fazla bagimsiz C kaniti hizmeti guclendirir.
                // - Kanit bonuslari sinirli tutulur; kutuphane buyuklugu
                //   tek basina sonucu ele geciremez.
                var rankingScore =
                    bestScore * 1000L +
                    Math.Min(strongEvidenceCount, 25) * 100L +
                    Math.Min(tokenEvidenceCount, 50) * 10L +
                    Math.Min(distinctEvidence.Length, 99);

                return new
                {
                    Representative = representative,
                    BestScore = bestScore,
                    RankingScore = rankingScore,
                    EvidenceCount = distinctEvidence.Length,
                    Keywords = distinctEvidence
                        .Take(24)
                        .ToArray()
                };
            })
            .OrderByDescending(x => x.RankingScore)
            .ThenByDescending(x => x.BestScore)
            .ThenBy(x => x.Representative.Work.CategoryService.Category.SortOrder)
            .ThenBy(x => x.Representative.Work.CategoryService.SortOrder)
            .ThenBy(x => x.Representative.Work.CategoryService.Name)
            .Take(Math.Clamp(limit, 1, 12))
            .Select(x => new SearchIntentSuggestion(
                Id: $"db:{x.Representative.Work.CategoryServiceId}",
                Label: x.Representative.Work.CategoryService.Name,
                Keywords: x.Keywords,
                CategorySlug: x.Representative.Work.CategoryService.Category.Slug,
                ServiceSlug: TaxonomyV3Catalog.ToSlug(
                    x.Representative.Work.CategoryService.Name),
                Intent: "need",
                Score: x.BestScore,
                MatchReason:
                    $"abc-cumle-kaniti:{x.EvidenceCount};en-iyi:{x.Representative.Phrase}"))
            .ToArray();

        return matches;
    }

    private sealed record CachedPhrase(
        CategoryLibraryWork Work,
        string Phrase,
        string NormalizedPhrase,
        string[] Tokens);

    private static readonly SemaphoreSlim CacheLock = new(1, 1);

    private static IReadOnlyList<CachedPhrase>? _cachedPhrases;
    private static DateTime _cacheExpiresAtUtc = DateTime.MinValue;

    private static async Task<IReadOnlyList<CachedPhrase>> LoadPhrasesAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        if (_cachedPhrases is not null && now < _cacheExpiresAtUtc)
            return _cachedPhrases;

        await CacheLock.WaitAsync(cancellationToken);

        try
        {
            now = DateTime.UtcNow;

            if (_cachedPhrases is not null && now < _cacheExpiresAtUtc)
                return _cachedPhrases;

            var works = await dbContext.CategoryLibraryWorks
                .AsNoTracking()
                .Where(x =>
                    x.IsActive &&
                    x.CategoryService.IsActive &&
                    x.CategoryService.Category.IsActive)
                .Include(x => x.CategoryService)
                    .ThenInclude(x => x.Category)
                .Include(x => x.Phrases.Where(p => p.IsActive))
                .AsSplitQuery()
                .ToListAsync(cancellationToken);

            var cachedPhrases = works
                .SelectMany(work => work.Phrases
                    .Where(phrase => phrase.IsActive)
                    .Select(phrase =>
                    {
                        var normalized = Normalize(phrase.Phrase);

                        return new CachedPhrase(
                            work,
                            phrase.Phrase,
                            normalized,
                            Tokens(normalized));
                    }))
                .ToArray();

            _cachedPhrases = cachedPhrases;
            _cacheExpiresAtUtc = DateTime.UtcNow.AddMinutes(5);

            return cachedPhrases;
        }
        finally
        {
            CacheLock.Release();
        }
    }

    private static int PhraseScore(
        string query,
        string[] queryTokens,
        string phrase,
        string[] phraseTokens)
    {
        if (string.IsNullOrWhiteSpace(phrase)) return 0;

        if (phrase == query)
            return 100;

        if (phrase.StartsWith(query, StringComparison.Ordinal))
            return 98;

        if (phrase.Contains(query, StringComparison.Ordinal))
            return 96;

        if (queryTokens.Length == 0 || phraseTokens.Length == 0)
            return 0;

        // Ornek:
        // "temel kaz" -> "temel kazisi"
        // Tum sorgu parcalari AYNI C cumlesinde bulunmak zorunda.
        var allQueryTokensInSamePhrase = queryTokens.All(q =>
            phraseTokens.Any(p => TokenMatches(q, p)));

        if (allQueryTokensInSamePhrase)
            return 92;

        // Kullanici C cumlesinden daha uzun bir dogal cumle yazmissa,
        // C'nin tum anlamli tokenlari kullanici sorgusunda bulunabilir.
        var phraseInsideQuery =
            phraseTokens.Length >= 2 &&
            phraseTokens.All(p =>
                queryTokens.Any(q => TokenMatches(p, q)));

        if (phraseInsideQuery)
            return 88;

        return 0;
    }

    private static bool TokenMatches(string left, string right)
    {
        if (left == right)
            return true;

        if (left.Length < 3 || right.Length < 3)
            return false;

        return left.StartsWith(right, StringComparison.Ordinal) ||
               right.StartsWith(left, StringComparison.Ordinal);
    }

    private static string[] Tokens(string value) =>
        value.Split(
            ' ',
            StringSplitOptions.RemoveEmptyEntries |
            StringSplitOptions.TrimEntries);

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

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
}
