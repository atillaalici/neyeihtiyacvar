using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace NeyeIhtiyacVar.Api.Application;

public static class NeedUnderstandingEngine
{
    private static readonly HashSet<string> StopWords =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "bir", "bu", "ben", "bana", "icin", "ile", "ve", "veya", "ama",
            "cok", "daha", "gibi", "var", "yok", "olan", "oldu", "oluyor",
            "istiyorum", "lazim", "gerekiyor", "yardim", "yardimci"
        };

    private static readonly Dictionary<string, SignalProfile> Profiles =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["elektrikci"] = P(
                objects: ["elektrik", "sigorta", "priz", "kablo", "avize", "lamba", "salter", "kacak akim"],
                intents: ["at", "kes", "yan", "calis", "degis", "tak", "bagla", "ariza"],
                phrases: ["sigorta at", "elektrik kes", "kacak akim"]),

            ["su-tesisatcisi"] = P(
                objects: ["musluk", "lavabo", "sifon", "rezervuar", "boru", "tesisat", "su kacagi", "gider"],
                intents: ["akit", "sizdir", "damlat", "tikan", "patla", "tamir", "degis"],
                phrases: ["su kacagi", "boru patla", "su akit", "su sizdir", "sifon bozul", "rezervuar bozul"]),

            ["beyaz-esya-servisi"] = P(
                objects: ["buzdolab", "camasir makine", "bulasik makine", "firin", "beyaz esya", "kurutma makine"],
                intents: ["sogut", "calis", "bozul", "isit", "don", "ses", "ak"],
                phrases: ["buzdolab sogut", "beyaz esya"]),

            ["klima-servisi"] = P(
                objects: ["klima", "split klima"],
                intents: ["sogut", "isit", "bakim", "ariza", "calis", "su akit"],
                phrases: ["klima sogut", "klima bakim", "klima ariza"]),

            ["boyaci"] = P(
                objects: ["boya", "duvar", "tavan", "badana"],
                intents: ["boya", "badana", "yenile"],
                phrases: ["duvar boya", "ev boya"]),

            ["mobilya-montaji"] = P(
                objects: ["mobilya", "dolap", "gardrop", "gardirop", "masa", "yatak", "raf"],
                intents: ["montaj", "kur", "tak", "sok"],
                phrases: ["mobilya montaj", "dolap montaj"]),

            ["cilingir"] = P(
                objects: ["anahtar", "kilit", "kapi"],
                intents: ["ac", "kilit", "degis", "kir"],
                phrases: ["kapida kal", "anahtar kay"]),

            ["ev-temizligi"] = P(
                objects: ["ev", "daire", "temizlik"],
                intents: ["temizle", "temizlik"],
                phrases: ["ev temiz"]),

            ["bahce-isleri"] = P(
                objects: ["bahce", "cim", "agac", "peyzaj"],
                intents: ["bud", "bic", "duzenle", "peyzaj"],
                phrases: ["bahce duzen"]),

            ["hasere-ilaclama"] = P(
                objects: ["bocek", "hasere", "hamamboce", "karinca", "fare"],
                intents: ["ilac", "ilaçla"],
                phrases: ["hasere ilac"]),

            ["apartman-hizmetleri"] = P(
                objects: ["apartman", "site", "bina"],
                intents: ["gorevli", "hizmet", "temiz"],
                phrases: ["site gorevli", "apartman hizmet"]),

            ["evden-eve-nakliyat"] = P(
                objects: ["ev", "daire", "esya"],
                intents: ["tasi", "tasin", "nakliy", "naklet"],
                phrases: ["evden eve", "ev tasi", "evimi tasi", "tasiniyor"]),

            ["sehirlerarasi-nakliye"] = P(
                objects: ["sehir", "il", "esya", "yuk"],
                intents: ["tasi", "nakliy", "naklet"],
                phrases: ["sehirlerarasi", "sehir disi"]),

            ["parca-esya-tasima"] = P(
                objects: ["esya", "koltuk", "masa", "dolap", "beyaz esya"],
                intents: ["tasi", "nakliy"],
                phrases: ["parca esya", "tek esya"]),

            ["yuk-tasima"] = P(
                objects: ["yuk", "kamyon", "palet", "malzeme"],
                intents: ["tasi", "nakliy"],
                phrases: ["yuk tasi", "yuk nakliy"]),

            ["bilgisayar-servisi"] = P(
                objects: ["bilgisayar", "laptop", "notebook", "pc", "yazici", "printer", "monitor", "ssd", "ram", "anakart"],
                intents: ["tamir", "bozul", "acil", "calis", "format", "cikti", "yazdir", "ariza"],
                phrases: ["bilgisayar tamir", "laptop tamir", "yazici cikti", "yazici calis"]),

            ["telefon-tamiri"] = P(
                objects: ["telefon", "cep telefonu", "ekran", "batarya", "sarj", "dokunmatik"],
                intents: ["tamir", "kir", "bozul", "sarj", "calis", "degis"],
                phrases: ["ekran kir", "sarj ol", "telefon tamir"]),

            ["kamera-sistemleri"] = P(
                objects: ["kamera", "cctv", "nvr", "dvr", "guvenlik kamera"],
                intents: ["kur", "tak", "montaj", "kayit", "calis"],
                phrases: ["guvenlik kamera", "kamera sistem"]),

            ["network-internet"] = P(
                objects: ["internet", "wifi", "modem", "network", "ethernet", "ag"],
                intents: ["cek", "baglan", "calis", "kur", "kes"],
                phrases: ["internet yok", "wifi cek", "internet cek"]),

            ["yazilim-ve-web-hizmetleri"] = P(
                objects: ["web", "website", "site", "yazilim", "uygulama", "program", "otomasyon"],
                intents: ["yap", "gelistir", "kur", "tasarla", "yaz"],
                phrases: ["web site", "site yaptir", "yazilim gelistir"]),

            ["oto-tamir"] = P(
                objects: ["araba", "arac", "otomobil", "motor", "fren", "suspansiyon", "on takim"],
                intents: ["tamir", "bozul", "ariza", "calis", "ses", "bakim"],
                phrases: ["araba bozul", "arac ariza", "oto tamir"]),

            ["lastikci"] = P(
                objects: ["lastik", "teker", "balans", "rot"],
                intents: ["patla", "degis", "balans", "tamir"],
                phrases: ["lastik patla", "rot balans"]),

            ["oto-elektrik"] = P(
                objects: ["aku", "alternator", "mars", "marş", "oto elektrik"],
                intents: ["bas", "sarj", "calis", "ariza", "degis"],
                phrases: ["mars bas", "mars basmi", "marş bas", "oto elektrik"]),

            ["cekici"] = P(
                objects: ["araba", "arac", "otomobil"],
                intents: ["cek", "yolda kal", "kurtar"],
                phrases: ["yolda kal", "arac cek"]),

            ["oto-yikama"] = P(
                objects: ["araba", "arac", "otomobil"],
                intents: ["yika", "temizle"],
                phrases: ["oto yika", "araba yika", "arac yika"]),

            ["ozel-ders"] = P(
                objects: ["matematik", "fen", "ders", "ogretmen"],
                intents: ["ders", "ogren", "ogret"],
                phrases: ["ozel ders"]),

            ["yabanci-dil"] = P(
                objects: ["ingilizce", "almanca", "fransizca", "dil"],
                intents: ["ogren", "kurs", "ders"],
                phrases: ["yabanci dil", "dil kurs"]),

            ["sinav-hazirlik"] = P(
                objects: ["lgs", "yks", "tyt", "ayt", "sinav"],
                intents: ["hazirlan", "kurs", "ders"],
                phrases: ["sinav hazir"]),

            ["bilgisayar-egitimi"] = P(
                objects: ["bilgisayar", "office", "excel", "word"],
                intents: ["ogren", "egitim", "kurs", "ders"],
                phrases: ["bilgisayar egitim", "excel kurs", "office kurs"]),

            ["dugun"] = P(
                objects: ["dugun", "nisan", "kina"],
                intents: ["yap", "organize"],
                phrases: ["dugun salon"]),

            ["fotografci"] = P(
                objects: ["fotograf", "fotografci", "kamera", "cekim"],
                intents: ["cek", "fotograf"],
                phrases: ["fotograf cek", "dugun fotograf", "fotografci lazim"]),

            ["catering"] = P(
                objects: ["yemek", "catering", "ikram"],
                intents: ["hazirla", "servis", "organiz"],
                phrases: ["toplu yemek", "yemek organiz"]),

            ["organizasyon-firmalari"] = P(
                objects: ["organizasyon", "etkinlik", "susleme", "acilis"],
                intents: ["organize", "susle", "duzenle"],
                phrases: ["organizasyon firma"])
        };

    public static double Score(
        string input,
        string categoryName,
        string serviceName,
        string serviceSlug)
    {
        var normalized = Normalize(input);
        var tokens = Tokens(normalized);
        var score = 0d;

        var normalizedService = Normalize(serviceName);
        var normalizedCategory = Normalize(categoryName);

        var directServiceMatch = ContainsPhrase(normalized, normalizedService);

        if (directServiceMatch)
            score += 18;

        if (ContainsPhrase(normalized, normalizedCategory))
            score += 3;

        foreach (var serviceToken in Tokens(normalizedService))
        {
            if (tokens.Any(t => RelatedObject(t, serviceToken)))
                score += 3;
        }

        if (!Profiles.TryGetValue(serviceSlug, out var profile))
            return Math.Max(0, score);

        var objectHits = CountObjectHits(normalized, tokens, profile.Objects);
        var intentHits = CountIntentHits(tokens, profile.Intents);
        var phraseHits = profile.Phrases.Count(x => ContainsRelatedPhrase(normalized, x));
        var distinctiveObjectHits = profile.Objects.Count(signal =>
            IsDistinctiveObject(signal) &&
            MatchesObjectSignal(normalized, tokens, signal));

        score += objectHits * 8;
        score += intentHits * 4;
        score += phraseHits * 10;
        score += distinctiveObjectHits * 6;

        if (objectHits > 0 && intentHits > 0)
            score += 12;

        // Güven kapısı:
        // - açık hizmet adı
        // - güçlü kalıp
        // - nesne + eylem
        // - veya tek başına ayırt edici nesne
        //
        // "ev için birini arıyorum" ve "bir şey bozuldu"
        // gibi genel cümleler bu kapıdan geçmez.
        var hasStrongEvidence =
            directServiceMatch ||
            phraseHits > 0 ||
            (objectHits > 0 && intentHits > 0) ||
            distinctiveObjectHits > 0;

        if (!hasStrongEvidence)
            return 0;

        if (serviceSlug == "klima-servisi" && !HasAny(tokens, "klima"))
            score -= 10;

        if (serviceSlug == "beyaz-esya-servisi" &&
            HasAny(tokens, "buzdolab", "camasir", "bulasik", "firin", "kurutma"))
            score += 12;

        if (serviceSlug == "telefon-tamiri" &&
            HasAny(tokens, "telefon", "ekran", "batarya", "sarj", "dokunmatik"))
            score += 10;

        if (serviceSlug == "bilgisayar-servisi" &&
            HasAny(tokens, "bilgisayar", "laptop", "notebook", "yazici", "printer"))
            score += 10;

        if (serviceSlug == "su-tesisatcisi" &&
            HasAny(tokens, "sifon", "rezervuar", "musluk", "lavabo", "boru", "gider"))
            score += 14;

        var wholeHomeMove =
            HasAny(tokens, "ev", "evim", "evin", "daire") &&
            HasAnyIntent(tokens, "tasi", "tasin", "nakliy");

        var singleItemMove =
            HasAny(tokens, "koltuk", "masa", "dolap", "buzdolab", "camasir", "bulasik") ||
            ContainsRelatedPhrase(normalized, "tek esya") ||
            ContainsRelatedPhrase(normalized, "parca esya");

        if (serviceSlug == "evden-eve-nakliyat" && wholeHomeMove)
            score += 18;

        if (serviceSlug == "parca-esya-tasima")
        {
            if (singleItemMove)
                score += 16;

            if (wholeHomeMove && !singleItemMove)
                score -= 18;
        }

        if (serviceSlug == "oto-elektrik" &&
            HasAny(tokens, "mars", "aku", "alternator"))
            score += 24;

        if (serviceSlug == "cekici")
        {
            var towIntent =
                ContainsRelatedPhrase(normalized, "yolda kal") ||
                ContainsRelatedPhrase(normalized, "arac cek") ||
                HasAny(tokens, "cekici");

            if (!towIntent)
                score -= 18;
        }

        var photoIntent =
            HasAny(tokens, "fotograf", "fotografci", "cekim") ||
            ContainsRelatedPhrase(normalized, "fotograf cek");

        if (serviceSlug == "fotografci" && photoIntent)
            score += 20;

        if (serviceSlug == "dugun" && photoIntent)
            score -= 16;

        var educationIntent = HasAnyIntent(tokens, "egitim", "kurs", "ders", "ogren");
        var repairIntent = HasAnyIntent(tokens, "tamir", "bozul", "ariza", "calis", "acil", "kir");

        if (serviceSlug == "bilgisayar-egitimi")
        {
            if (educationIntent) score += 12;
            if (repairIntent) score -= 12;
        }

        if (serviceSlug == "bilgisayar-servisi")
        {
            if (repairIntent &&
                HasAny(tokens, "bilgisayar", "laptop", "notebook", "yazici", "printer"))
                score += 6;

            if (educationIntent)
                score -= 10;
        }

        return Math.Max(0, score);
    }

    private static int CountHits(
        string normalized,
        HashSet<string> tokens,
        IReadOnlyList<string> signals)
        => CountObjectHits(normalized, tokens, signals);

    private static int CountObjectHits(
        string normalized,
        HashSet<string> tokens,
        IReadOnlyList<string> signals)
        => signals.Count(signal =>
            MatchesObjectSignal(normalized, tokens, signal));

    private static int CountIntentHits(
        HashSet<string> tokens,
        IReadOnlyList<string> signals)
        => signals.Count(signal =>
        {
            var normalizedSignal = Normalize(signal);
            return tokens.Any(token =>
                RelatedIntent(token, normalizedSignal));
        });

    private static bool MatchesObjectSignal(
        string normalized,
        HashSet<string> tokens,
        string signal)
    {
        var s = Normalize(signal);

        if (s.Contains(' '))
            return ContainsRelatedPhrase(normalized, s);

        return tokens.Any(token => RelatedObject(token, s));
    }

    private static bool HasAny(
        HashSet<string> tokens,
        params string[] stems)
        => stems.Any(stem =>
            tokens.Any(token =>
                RelatedObject(token, Normalize(stem))));

    private static bool HasAnyIntent(
        HashSet<string> tokens,
        params string[] stems)
        => stems.Any(stem =>
            tokens.Any(token =>
                RelatedIntent(token, Normalize(stem))));

    private static bool ContainsRelatedPhrase(
        string input,
        string phrase)
    {
        var phraseTokens = Tokens(Normalize(phrase)).ToArray();

        if (phraseTokens.Length == 0)
            return false;

        var inputTokens = Tokens(input).ToArray();

        if (phraseTokens.Length == 1)
            return inputTokens.Any(x =>
                RelatedObject(x, phraseTokens[0]) ||
                RelatedIntent(x, phraseTokens[0]));

        for (var i = 0; i <= inputTokens.Length - phraseTokens.Length; i++)
        {
            var allMatch = true;

            for (var j = 0; j < phraseTokens.Length; j++)
            {
                if (!RelatedObject(inputTokens[i + j], phraseTokens[j]) &&
                    !RelatedIntent(inputTokens[i + j], phraseTokens[j]))
                {
                    allMatch = false;
                    break;
                }
            }

            if (allMatch)
                return true;
        }

        return false;
    }

    private static bool RelatedObject(string left, string right)
    {
        left = CanonicalToken(left);
        right = CanonicalToken(right);

        if (left.Equals(right, StringComparison.OrdinalIgnoreCase))
            return true;

        var shorter = left.Length <= right.Length ? left : right;
        var longer = left.Length <= right.Length ? right : left;

        if (shorter.Length < 4)
            return false;

        return longer.StartsWith(
            shorter,
            StringComparison.OrdinalIgnoreCase);
    }

    private static bool RelatedIntent(string token, string stem)
    {
        token = CanonicalToken(token);
        stem = CanonicalToken(stem);

        if (token.Equals(stem, StringComparison.OrdinalIgnoreCase))
            return true;

        if (stem.Length < 2)
            return false;

        return token.StartsWith(
            stem,
            StringComparison.OrdinalIgnoreCase);
    }

    private static string CanonicalToken(string value)
    {
        var token = Normalize(value);

        // Türkçedeki ünsüz yumuşamasının ASCII normalize edilmiş halleri.
        // musluğu -> muslugu -> musluk
        // böceği  -> bocegi  -> bocek
        // lastiğim -> lastigim -> lastik
        var suffixes = new[]
        {
            "larimiz", "lerimiz", "lariniz", "leriniz",
            "larim", "lerim", "larin", "lerin",
            "imiz", "imiz", "umuz", "umuz",
            "iniz", "unuz",
            "dan", "den", "tan", "ten",
            "daki", "deki", "taki", "teki",
            "lari", "leri",
            "im", "in", "um", "un",
            "yi", "yu", "ye", "ya",
            "i", "u",
            "m", "n"
        };

        foreach (var suffix in suffixes)
        {
            if (token.Length >= suffix.Length + 4 &&
                token.EndsWith(suffix, StringComparison.Ordinal))
            {
                token = token[..^suffix.Length];
                break;
            }
        }

        if (token.EndsWith("g", StringComparison.Ordinal) && token.Length >= 4)
            token = token[..^1] + "k";

        return token;
    }

    private static bool IsDistinctiveObject(string signal)
    {
        var s = Normalize(signal);

        return s is not
            "ev" and not
            "daire" and not
            "esya" and not
            "araba" and not
            "arac" and not
            "otomobil" and not
            "kamera" and not
            "site" and not
            "bina" and not
            "duvar" and not
            "tavan" and not
            "yemek" and not
            "ders";
    }

    private static int CommonPrefix(string left, string right)
    {
        var count = 0;
        var max = Math.Min(left.Length, right.Length);

        while (count < max && left[count] == right[count])
            count++;

        return count;
    }
    private static bool ContainsPhrase(string haystack, string needle)
        => !string.IsNullOrWhiteSpace(needle) &&
           Regex.IsMatch(
               haystack,
               $@"(?:^|\s){Regex.Escape(needle)}(?:$|\s)",
               RegexOptions.CultureInvariant);

    private static HashSet<string> Tokens(string value)
        => value
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Length >= 2 && !StopWords.Contains(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    private static string Normalize(string value)
    {
        var lowered = value
            .ToLower(new CultureInfo("tr-TR"))
            .Replace('ı', 'i')
            .Replace('ğ', 'g')
            .Replace('ü', 'u')
            .Replace('ş', 's')
            .Replace('ö', 'o')
            .Replace('ç', 'c');

        var decomposed = lowered.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();

        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                builder.Append(c);
        }

        return Regex.Replace(
                builder.ToString().Normalize(NormalizationForm.FormC),
                @"[^a-z0-9]+",
                " ")
            .Trim();
    }

    private static SignalProfile P(
        string[] objects,
        string[] intents,
        string[] phrases)
        => new(objects, intents, phrases);

    private sealed record SignalProfile(
        IReadOnlyList<string> Objects,
        IReadOnlyList<string> Intents,
        IReadOnlyList<string> Phrases);
}