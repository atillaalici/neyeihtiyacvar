using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public static class SearchIntentResolver
{
    private sealed record IntentRule(
        string ServiceSlug,
        string[] Aliases);

    private static readonly IntentRule[] Rules =
    [
        new(
            "su-tesisatcisi",
            [
                "su tesisatcisi",
                "tesisatci",
                "vana",
                "vana arizali",
                "vana bozuk",
                "musluk",
                "musluk akitiyor",
                "cesme akitiyor",
                "lavabo tikali",
                "gider tikali",
                "tuvalet tikali",
                "klozet",
                "sifon",
                "su kacagi",
                "su sizintisi",
                "boru patladi",
                "boru sizdiriyor",
                "su akiyor",
                "tesisat arizasi"
            ]),

        new(
            "elektrikci",
            [
                "elektrikci",
                "elektrik arizasi",
                "sigorta atiyor",
                "sigorta surekli atiyor",
                "priz bozuk",
                "priz calismiyor",
                "isik yanmiyor",
                "lamba yanmiyor",
                "elektrik yok",
                "kacak akim",
                "elektrik tesisati",
                "avize montaji"
            ]),

        new(
            "hafriyat",
            [
                "hafriyat",
                "kepce",
                "kepce lazim",
                "ekskavator",
                "beko loder",
                "kazici",
                "kazici yukleyici",
                "is makinesi",
                "is makinasi",
                "kazi",
                "temel kazisi",
                "kanal kazisi",
                "dolgu",
                "moloz",
                "moloz kaldirma",
                "moloz tasima",
                "arazi tesviye"
            ]),

        new(
            "telefon-tamiri",
            [
                "telefon tamiri",
                "telefoncu",
                "telefon bozuldu",
                "ekran kirildi",
                "telefon ekrani kirildi",
                "sarj olmuyor",
                "batarya bozuk",
                "telefon acilmiyor",
                "mikrofon bozuk",
                "hoparlor bozuk"
            ]),

        new(
            "bilgisayar-servisi",
            [
                "bilgisayar servisi",
                "bilgisayarci",
                "bilgisayar bozuldu",
                "bilgisayar acilmiyor",
                "laptop bozuldu",
                "notebook bozuldu",
                "format",
                "virus",
                "mavi ekran",
                "ssd takma",
                "ram takma"
            ]),

        new(
            "klima-servisi",
            [
                "klima",
                "klima servisi",
                "klima sogutmuyor",
                "klima isitma yapmiyor",
                "klima su akitiyor",
                "klima gaz",
                "klima bakim",
                "klima montaj"
            ]),

        new(
            "kombi-servisi",
            [
                "kombi",
                "kombi servisi",
                "kombi calismiyor",
                "kombi isitma yapmiyor",
                "petek isinmiyor",
                "kalorifer isinmiyor",
                "kombi su akitiyor"
            ]),

        new(
            "oto-tamir",
            [
                "oto tamir",
                "araba bozuldu",
                "arac arizasi",
                "motor arizasi",
                "araba calismiyor",
                "aractan ses geliyor",
                "otomobil tamiri"
            ]),

        new(
            "cekici",
            [
                "cekici",
                "oto cekici",
                "arac yolda kaldi",
                "araba yolda kaldi",
                "oto kurtarma",
                "yolda kaldim"
            ]),

        new(
            "lastikci",
            [
                "lastikci",
                "lastik patladi",
                "lastik degisimi",
                "lastik tamiri",
                "teker patladi"
            ]),

        new(
            "ev-temizligi",
            [
                "ev temizligi",
                "temizlikci",
                "ev temizlenecek",
                "ev temizletmek",
                "gunluk temizlik"
            ]),

        new(
            "boyaci",
            [
                "boyaci",
                "ev boyama",
                "duvar boyama",
                "boya badana",
                "badana"
            ]),

        new(
            "cilingir",
            [
                "cilingir",
                "anahtar kayip",
                "kapi acilmiyor",
                "kapida kaldim",
                "kilit bozuk",
                "anahtar kirildi"
            ]),

        new(
            "evden-eve-nakliyat",
            [
                "evden eve",
                "ev tasima",
                "ev tasi",
                "nakliyat",
                "nakliyeci",
                "esya tasima"
            ]),

        new(
            "oto-elektrik",
            [
                "oto elektrik",
                "aku bitmis",
                "aku bitti",
                "mars basmiyor",
                "far yanmiyor",
                "arac elektrik"
            ]),

        new(
            "web-tasarim",
            [
                "web sitesi",
                "site yaptirmak",
                "web tasarim",
                "internet sitesi",
                "kurumsal site"
            ]),

        new(
            "yazilim-gelistirme",
            [
                "yazilim",
                "program yaptirmak",
                "uygulama yaptirmak",
                "ozel yazilim",
                "otomasyon yazilimi"
            ]),

        new(
            "guvenlik-kamerasi",
            [
                "kamera sistemi",
                "guvenlik kamerasi",
                "kamera taktiracagim",
                "kamera montaj",
                "cctv"
            ]),

        new(
            "gunes-paneli-kurulumu",
            [
                "gunes paneli",
                "solar panel",
                "ges",
                "gunes enerji",
                "solar enerji"
            ])
    ];

    public static IReadOnlyList<string> ResolveServiceSlugs(
        string? rawQuery)
    {
        var query = Normalize(rawQuery);

        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        var matches = new List<(string Slug, int Score)>();

        foreach (var rule in Rules)
        {
            var bestScore = 0;

            foreach (var alias in rule.Aliases)
            {
                var normalizedAlias = Normalize(alias);

                if (query == normalizedAlias)
                {
                    bestScore = Math.Max(bestScore, 100);
                    continue;
                }

                if (query.Contains(
                    normalizedAlias,
                    StringComparison.Ordinal))
                {
                    bestScore = Math.Max(
                        bestScore,
                        90 + Math.Min(9, normalizedAlias.Length / 4));
                    continue;
                }

                if (normalizedAlias.Contains(
                    query,
                    StringComparison.Ordinal) &&
                    query.Length >= 3)
                {
                    bestScore = Math.Max(bestScore, 70);
                    continue;
                }

                if (query.Length >= 4 &&
                    normalizedAlias.Length >= 4)
                {
                    var distance =
                        LevenshteinDistance(query, normalizedAlias);

                    var maxLength =
                        Math.Max(query.Length, normalizedAlias.Length);

                    var similarity =
                        1d - ((double)distance / maxLength);

                    if (similarity >= 0.78d)
                    {
                        bestScore = Math.Max(
                            bestScore,
                            (int)Math.Round(similarity * 65d));
                    }
                }
            }

            if (bestScore > 0)
            {
                matches.Add((rule.ServiceSlug, bestScore));
            }
        }

        return matches
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Slug)
            .Select(x => x.Slug)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(6)
            .ToArray();
    }

    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value
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

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) !=
                UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        var plain = builder
            .ToString()
            .Normalize(NormalizationForm.FormC);

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

    private static int LevenshteinDistance(
        string left,
        string right)
    {
        if (left.Length == 0)
        {
            return right.Length;
        }

        if (right.Length == 0)
        {
            return left.Length;
        }

        var previous = new int[right.Length + 1];
        var current = new int[right.Length + 1];

        for (var j = 0; j <= right.Length; j++)
        {
            previous[j] = j;
        }

        for (var i = 1; i <= left.Length; i++)
        {
            current[0] = i;

            for (var j = 1; j <= right.Length; j++)
            {
                var cost =
                    left[i - 1] == right[j - 1]
                        ? 0
                        : 1;

                current[j] = Math.Min(
                    Math.Min(
                        current[j - 1] + 1,
                        previous[j] + 1),
                    previous[j - 1] + cost);
            }

            (previous, current) = (current, previous);
        }

        return previous[right.Length];
    }
}