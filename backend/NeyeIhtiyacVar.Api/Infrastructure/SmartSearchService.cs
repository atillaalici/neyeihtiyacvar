using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public sealed record SmartSearchIntent(
    string OriginalText,
    string Source,
    double Confidence,
    string? CategorySlug,
    string? CategoryName,
    string? ServiceSlug,
    string? ServiceName,
    string[] RelatedServiceSlugs,
    bool BroadCategoryFallback);

public sealed class SmartSearchService(
    HttpClient httpClient,
    IConfiguration configuration,
    AppDbContext dbContext,
    ILogger<SmartSearchService> logger)
{
    private sealed record CatalogItem(
        string CategorySlug,
        string CategoryName,
        string ServiceSlug,
        string ServiceName);

    private sealed class AiIntentPayload
    {
        [JsonPropertyName("categorySlug")]
        public string? CategorySlug { get; set; }

        [JsonPropertyName("serviceSlug")]
        public string? ServiceSlug { get; set; }

        [JsonPropertyName("relatedServiceSlugs")]
        public string[] RelatedServiceSlugs { get; set; } = [];

        [JsonPropertyName("broadCategoryFallback")]
        public bool BroadCategoryFallback { get; set; }

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }
    }

    public async Task<SmartSearchIntent> ResolveAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        var cleanQuery = query.Trim();

        var catalog = await LoadCatalogAsync(cancellationToken);

        // A-B-C arama kutuphanesi birincil niyet kaynagidir:
        // C = kullanici cumlesi -> B = hizmet -> A = ana kategori.
        // Kutuphane eslesme bulursa Smart Search ayni sonucu kullanir;
        // AI/yerel cozumleme yalnizca kutuphane sonuc uretemezse devreye girer.
        var librarySuggestions =
            await DbSearchIntentLibrary.SuggestAsync(
                dbContext,
                cleanQuery,
                8,
                cancellationToken);

        if (librarySuggestions.Length > 0)
        {
            var primary = librarySuggestions[0];

            var primaryCatalogItem = catalog.FirstOrDefault(x =>
                string.Equals(
                    x.CategorySlug,
                    primary.CategorySlug,
                    StringComparison.OrdinalIgnoreCase) &&
                string.Equals(
                    x.ServiceSlug,
                    primary.ServiceSlug,
                    StringComparison.OrdinalIgnoreCase));

            if (primaryCatalogItem is not null)
            {
                var relatedServiceSlugs = librarySuggestions
                    .Skip(1)
                    .Select(x => x.ServiceSlug)
                    .Where(x => !string.Equals(
                        x,
                        primary.ServiceSlug,
                        StringComparison.OrdinalIgnoreCase))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(7)
                    .ToArray();

                return new SmartSearchIntent(
                    cleanQuery,
                    "abc-library",
                    Math.Clamp(primary.Score / 100.0, 0.0, 1.0),
                    primaryCatalogItem.CategorySlug,
                    primaryCatalogItem.CategoryName,
                    primaryCatalogItem.ServiceSlug,
                    primaryCatalogItem.ServiceName,
                    relatedServiceSlugs,
                    false);
            }
        }

        if (catalog.Count == 0)
        {
            return new SmartSearchIntent(
                cleanQuery,
                "local",
                0,
                null,
                null,
                null,
                null,
                [],
                false);
        }

        var apiKey =
            configuration["OpenAI:ApiKey"]
            ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY");

        var model =
            configuration["OpenAI:SearchModel"]
            ?? "gpt-5.6-luna";

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var aiResult = await ResolveWithOpenAiAsync(
                    cleanQuery,
                    catalog,
                    apiKey,
                    model,
                    cancellationToken);

                if (aiResult is not null)
                {
                    return ValidateAndEnrich(
                        cleanQuery,
                        "ai",
                        aiResult,
                        catalog);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "OpenAI akilli arama cozumlemesi basarisiz oldu. Yerel fallback kullaniliyor.");
            }
        }

        return ResolveLocally(
            cleanQuery,
            catalog);
    }

    private async Task<List<CatalogItem>> LoadCatalogAsync(
        CancellationToken cancellationToken)
    {
        var categories = await dbContext.Categories
            .AsNoTracking()
            .Where(x => x.IsActive)
            .Include(x => x.Services)
            .OrderBy(x => x.SortOrder)
            .ToListAsync(cancellationToken);

        return categories
            .SelectMany(category =>
                category.Services
                    .Where(service => service.IsActive)
                    .OrderBy(service => service.SortOrder)
                    .Select(service => new CatalogItem(
                        category.Slug,
                        category.Name,
                        ToSlug(service.Name),
                        service.Name)))
            .ToList();
    }

    private async Task<AiIntentPayload?> ResolveWithOpenAiAsync(
        string query,
        IReadOnlyList<CatalogItem> catalog,
        string apiKey,
        string model,
        CancellationToken cancellationToken)
    {
        var compactCatalog = catalog
            .Select(x => new
            {
                categorySlug = x.CategorySlug,
                categoryName = x.CategoryName,
                serviceSlug = x.ServiceSlug,
                serviceName = x.ServiceName
            })
            .ToArray();

        var catalogJson =
            JsonSerializer.Serialize(compactCatalog);

        var instructions =
            """
            Sen Türkiye için yerel hizmet ve işletme arama niyeti çözücüsün.
            Kullanıcının doğal Türkçe cümlesini anlamaya çalış.
            Kullanıcı kategori veya hizmet adını birebir yazmak zorunda değildir.
            Sorunu, amacı ve yapılmak istenen işi anlamlandır.
            SADECE sana verilen katalogdaki categorySlug ve serviceSlug değerlerini kullan.
            Katalogda olmayan slug uydurma.
            Kullanıcı genel bir iş ailesini tarif ediyorsa tek alt hizmete aşırı daralma;
            broadCategoryFallback=true yap ve ilgili ana kategoriye genişlet.
            Örnek: "bahçeye iki metre çukur kazdıracağım" gibi bir cümle kanal kazısı diye
            zorlanmamalı; hafriyat/kazı ailesi olarak değerlendirilmeli.
            Yazım hatalarını, Türkçe karakter eksiklerini ve günlük konuşma biçimini tolere et.
            Emin değilsen serviceSlug null olabilir; categorySlug daha genel tutulabilir.
            relatedServiceSlugs yalnızca gerçekten yakın alternatiflerden oluşsun.
            confidence 0 ile 1 arasında sayı olsun.
            """;

        var input =
            $"""
            KULLANICI SORGUSU:
            {query}

            AKTİF KATALOG:
            {catalogJson}
            """;

        var schema = new
        {
            type = "object",
            additionalProperties = false,
            properties = new
            {
                categorySlug = new
                {
                    type = new[] { "string", "null" }
                },
                serviceSlug = new
                {
                    type = new[] { "string", "null" }
                },
                relatedServiceSlugs = new
                {
                    type = "array",
                    items = new
                    {
                        type = "string"
                    },
                    maxItems = 8
                },
                broadCategoryFallback = new
                {
                    type = "boolean"
                },
                confidence = new
                {
                    type = "number",
                    minimum = 0,
                    maximum = 1
                }
            },
            required = new[]
            {
                "categorySlug",
                "serviceSlug",
                "relatedServiceSlugs",
                "broadCategoryFallback",
                "confidence"
            }
        };

        var body = new
        {
            model,
            store = false,
            instructions,
            input,
            text = new
            {
                format = new
                {
                    type = "json_schema",
                    name = "search_intent",
                    strict = true,
                    schema
                }
            }
        };

        using var request =
            new HttpRequestMessage(
                HttpMethod.Post,
                "https://api.openai.com/v1/responses");

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                apiKey);

        request.Content =
            JsonContent.Create(body);

        using var response =
            await httpClient.SendAsync(
                request,
                cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var detail =
                await response.Content.ReadAsStringAsync(
                    cancellationToken);

            logger.LogWarning(
                "OpenAI search intent HTTP {StatusCode}: {Detail}",
                (int)response.StatusCode,
                detail.Length > 1000
                    ? detail[..1000]
                    : detail);

            return null;
        }

        using var document =
            JsonDocument.Parse(
                await response.Content.ReadAsStringAsync(
                    cancellationToken));

        if (!document.RootElement
            .TryGetProperty("output", out var output))
        {
            return null;
        }

        foreach (var item in output.EnumerateArray())
        {
            if (!item.TryGetProperty(
                "content",
                out var content))
            {
                continue;
            }

            foreach (var contentItem in content.EnumerateArray())
            {
                if (!contentItem.TryGetProperty(
                    "type",
                    out var type) ||
                    type.GetString() != "output_text")
                {
                    continue;
                }

                if (!contentItem.TryGetProperty(
                    "text",
                    out var text))
                {
                    continue;
                }

                var jsonText =
                    text.GetString();

                if (string.IsNullOrWhiteSpace(jsonText))
                {
                    continue;
                }

                return JsonSerializer.Deserialize<AiIntentPayload>(
                    jsonText,
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
            }
        }

        return null;
    }

    private SmartSearchIntent ValidateAndEnrich(
        string query,
        string source,
        AiIntentPayload payload,
        IReadOnlyList<CatalogItem> catalog)
    {
        var categorySlug =
            ValidateCategorySlug(
                payload.CategorySlug,
                catalog);

        var service =
            ValidateServiceSlug(
                payload.ServiceSlug,
                categorySlug,
                catalog);

        if (service is not null)
        {
            categorySlug = service.CategorySlug;
        }

        var related = payload.RelatedServiceSlugs
            .Select(slug =>
                ValidateServiceSlug(
                    slug,
                    categorySlug,
                    catalog))
            .Where(x => x is not null)
            .Select(x => x!.ServiceSlug)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(x =>
                !string.Equals(
                    x,
                    service?.ServiceSlug,
                    StringComparison.OrdinalIgnoreCase))
            .Take(8)
            .ToArray();

        var categoryName =
            categorySlug is null
                ? null
                : catalog
                    .FirstOrDefault(x =>
                        string.Equals(
                            x.CategorySlug,
                            categorySlug,
                            StringComparison.OrdinalIgnoreCase))
                    ?.CategoryName;

        return new SmartSearchIntent(
            query,
            source,
            Math.Clamp(payload.Confidence, 0d, 1d),
            categorySlug,
            categoryName,
            service?.ServiceSlug,
            service?.ServiceName,
            related,
            payload.BroadCategoryFallback ||
            (categorySlug is not null &&
             service is null));
    }

    private SmartSearchIntent ResolveLocally(
        string query,
        IReadOnlyList<CatalogItem> catalog)
    {
        var normalizedQuery =
            Normalize(query);

        var legacySlugs =
            TryLegacyResolver(query)
                .ToHashSet(
                    StringComparer.OrdinalIgnoreCase);

        var scored = catalog
            .Select(item =>
            {
                var serviceText =
                    Normalize(item.ServiceName);

                var categoryText =
                    Normalize(item.CategoryName);

                var score =
                    Math.Max(
                        Similarity(
                            normalizedQuery,
                            serviceText),
                        TokenCoverage(
                            normalizedQuery,
                            serviceText));

                if (legacySlugs.Contains(
                    item.ServiceSlug))
                {
                    score =
                        Math.Max(
                            score,
                            0.92d);
                }

                var categoryScore =
                    Math.Max(
                        Similarity(
                            normalizedQuery,
                            categoryText),
                        TokenCoverage(
                            normalizedQuery,
                            categoryText));

                return new
                {
                    Item = item,
                    ServiceScore = score,
                    CategoryScore = categoryScore
                };
            })
            .OrderByDescending(x =>
                Math.Max(
                    x.ServiceScore,
                    x.CategoryScore))
            .ToList();

        var best =
            scored.FirstOrDefault();

        if (best is null)
        {
            return new SmartSearchIntent(
                query,
                "local",
                0,
                null,
                null,
                null,
                null,
                [],
                false);
        }

        string? categorySlug = null;
        string? categoryName = null;
        string? serviceSlug = null;
        string? serviceName = null;
        var broadCategoryFallback = false;

        var bestServiceScore =
            best.ServiceScore;

        var bestCategoryScore =
            scored.Max(x => x.CategoryScore);

        if (bestServiceScore >= 0.66d)
        {
            serviceSlug =
                best.Item.ServiceSlug;

            serviceName =
                best.Item.ServiceName;

            categorySlug =
                best.Item.CategorySlug;

            categoryName =
                best.Item.CategoryName;
        }
        else if (bestCategoryScore >= 0.58d)
        {
            var bestCategory =
                scored
                    .OrderByDescending(x =>
                        x.CategoryScore)
                    .First();

            categorySlug =
                bestCategory.Item.CategorySlug;

            categoryName =
                bestCategory.Item.CategoryName;

            broadCategoryFallback = true;
        }

        var related =
            categorySlug is null
                ? []
                : scored
                    .Where(x =>
                        x.Item.CategorySlug ==
                            categorySlug &&
                        x.Item.ServiceSlug !=
                            serviceSlug)
                    .OrderByDescending(x =>
                        x.ServiceScore)
                    .Select(x =>
                        x.Item.ServiceSlug)
                    .Distinct(
                        StringComparer.OrdinalIgnoreCase)
                    .Take(8)
                    .ToArray();

        return new SmartSearchIntent(
            query,
            "local",
            Math.Clamp(
                Math.Max(
                    bestServiceScore,
                    bestCategoryScore),
                0d,
                1d),
            categorySlug,
            categoryName,
            serviceSlug,
            serviceName,
            related,
            broadCategoryFallback);
    }

    private static IEnumerable<string> TryLegacyResolver(
        string query)
    {
        try
        {
            return SearchIntentResolver.ResolveServiceSlugs(
                query);
        }
        catch
        {
            return [];
        }
    }

    private static string? ValidateCategorySlug(
        string? slug,
        IReadOnlyList<CatalogItem> catalog)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        return catalog.Any(x =>
            string.Equals(
                x.CategorySlug,
                slug,
                StringComparison.OrdinalIgnoreCase))
            ? slug.Trim()
            : null;
    }

    private static CatalogItem? ValidateServiceSlug(
        string? slug,
        string? categorySlug,
        IReadOnlyList<CatalogItem> catalog)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        var query = catalog.Where(x =>
            string.Equals(
                x.ServiceSlug,
                slug.Trim(),
                StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(
            categorySlug))
        {
            query = query.Where(x =>
                string.Equals(
                    x.CategorySlug,
                    categorySlug,
                    StringComparison.OrdinalIgnoreCase));
        }

        return query.FirstOrDefault();
    }

    public static string Normalize(
        string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value
            .Trim()
            .ToLower(
                new CultureInfo("tr-TR"))
            .Replace('ı', 'i')
            .Replace('ğ', 'g')
            .Replace('ü', 'u')
            .Replace('ş', 's')
            .Replace('ö', 'o')
            .Replace('ç', 'c')
            .Normalize(
                NormalizationForm.FormD);

        var builder =
            new StringBuilder();

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo
                .GetUnicodeCategory(character) !=
                UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        var plain = builder
            .ToString()
            .Normalize(
                NormalizationForm.FormC);

        plain = Regex.Replace(
            plain,
            "[^a-z0-9]+",
            " ");

        return Regex.Replace(
                plain,
                "\\s+",
                " ")
            .Trim();
    }

    private static double Similarity(
        string left,
        string right)
    {
        if (left == right)
        {
            return 1d;
        }

        if (left.Length == 0 ||
            right.Length == 0)
        {
            return 0d;
        }

        if (left.Contains(
            right,
            StringComparison.Ordinal) ||
            right.Contains(
                left,
                StringComparison.Ordinal))
        {
            var min =
                Math.Min(
                    left.Length,
                    right.Length);

            var max =
                Math.Max(
                    left.Length,
                    right.Length);

            return 0.7d +
                0.25d * min / max;
        }

        var distance =
            LevenshteinDistance(
                left,
                right);

        var maxLength =
            Math.Max(
                left.Length,
                right.Length);

        return 1d -
            ((double)distance / maxLength);
    }

    private static double TokenCoverage(
        string query,
        string target)
    {
        var queryTokens =
            query.Split(
                ' ',
                StringSplitOptions.RemoveEmptyEntries);

        var targetTokens =
            target.Split(
                ' ',
                StringSplitOptions.RemoveEmptyEntries);

        if (queryTokens.Length == 0 ||
            targetTokens.Length == 0)
        {
            return 0d;
        }

        var bestScores =
            new List<double>();

        foreach (var targetToken in targetTokens)
        {
            var best =
                queryTokens
                    .Select(queryToken =>
                        Similarity(
                            queryToken,
                            targetToken))
                    .DefaultIfEmpty(0d)
                    .Max();

            bestScores.Add(best);
        }

        return bestScores.Average();
    }

    private static int LevenshteinDistance(
        string left,
        string right)
    {
        var previous =
            new int[right.Length + 1];

        var current =
            new int[right.Length + 1];

        for (var j = 0;
             j <= right.Length;
             j++)
        {
            previous[j] = j;
        }

        for (var i = 1;
             i <= left.Length;
             i++)
        {
            current[0] = i;

            for (var j = 1;
                 j <= right.Length;
                 j++)
            {
                var cost =
                    left[i - 1] ==
                    right[j - 1]
                        ? 0
                        : 1;

                current[j] =
                    Math.Min(
                        Math.Min(
                            current[j - 1] + 1,
                            previous[j] + 1),
                        previous[j - 1] + cost);
            }

            (previous, current) =
                (current, previous);
        }

        return previous[right.Length];
    }

    private static string ToSlug(
        string value)
    {
        var normalized =
            Normalize(value);

        return Regex.Replace(
                normalized,
                "\\s+",
                "-")
            .Trim('-');
    }
}