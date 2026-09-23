using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace NeyeIhtiyacVar.Api.Infrastructure;

/// <summary>
/// Platform moderasyon sözlüğü. Resmî kurumlar tek bir "yasaklı kelime listesi"
/// yayımlamadığı için kurallar, mevzuatta yasaklanan/kısıtlanan ürün-hizmet
/// kategorilerinin tespit ifadeleridir.
///
/// Kaynak başlıkları (22.09.2026 itibarıyla):
/// - 6502 s. Kanun m.61 ve Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği
///   (Ticaret Bakanlığı): yasa dışı bahis/kumar/şans oyunları; falcı/medyum/astrolog vb.
/// - 4250 s. Kanun m.6 (20.06.2026 değişikliği): alkollü içki reklam/tanıtım yasağı.
/// - 4207 s. Kanun ve ilgili düzenlemeler: tütün/tütün ürünleri reklam-tanıtım kısıtları.
/// - 6112 s. Kanun/RTÜK ticari iletişim çerçevesi: alkol/tütün, reçeteli ilaç/tedavi,
///   silah ve bazı hizmetlerde ticari iletişim kısıtları.
/// - TCK/5651 kapsamındaki hukuka aykırı içerik başlıkları: uyuşturucu ticareti,
///   fuhuş/müstehcenlik ve benzeri suç teşkil eden faaliyetler.
///
/// NOT: Sağlık, ilaç, alkol gibi meşru bağlamları tek kelimeyle otomatik suç saymayız.
/// Yaptırım; açık satış/reklam/temin/hizmet ifadesi veya doğrudan yasak hizmet eşleşmesine dayanır.
/// </summary>
public static class ProviderContentModeration
{
    public sealed record Result(
        bool RequiresReview,
        string? Code,
        string? Category,
        string? MatchedTerm,
        string? Reason,
        string? LegalBasis);

    private sealed record Rule(
        string Code,
        string Category,
        string LegalBasis,
        string[] DirectTerms,
        string[] SubjectTerms,
        string[] ActionTerms);

    private static readonly Rule[] Rules =
    [
        new(
            "illegal-gambling",
            "Yasa dışı bahis / kumar / şans oyunu",
            "6502 m.61; Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği",
            ["yasadisi bahis", "yasa disi bahis", "kacak bahis", "bahis sitesi", "casino sitesi", "kumar sitesi", "canli bahis", "iddaa bayiligi satilik"],
            ["bahis", "kumar", "casino", "kumarhane", "sans oyunu"],
            ["oyna", "oynat", "site", "uyelik", "bonus", "kazanc", "para yatir", "hesap sat", "reklam", "tanitim"]),

        new(
            "fortune-occult-ad",
            "Falcı / medyum / astrolog ve benzeri reklamı yasak hizmet",
            "Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği",
            ["falci", "medyum", "buyucu", "buyu bozma", "buyu yapma", "muska yapma", "kahve fali", "tarot fali", "astroloji danismanligi", "astrolog"],
            [], []),

        new(
            "illegal-drugs",
            "Uyuşturucu / uyarıcı madde ticareti veya temini",
            "TCK uyuşturucu/uyarıcı madde suçları; 5651 kapsamındaki hukuka aykırı içerik",
            ["uyusturucu sat", "uyusturucu satis", "uyusturucu temin", "torbaci", "kokain sat", "eroin sat", "bonzai sat", "mdma sat", "ekstazi sat", "ecstasy sat", "metamfetamin sat", "esrar sat", "kenevir sat", "ot sat", "hap sat"],
            ["kokain", "eroin", "bonzai", "mdma", "ekstazi", "ecstasy", "metamfetamin", "esrar", "uyusturucu", "kenevir"],
            ["sat", "satis", "temin", "tedarik", "al", "siparis", "kurye", "elden", "gram", "paket"]),

        new(
            "sexual-services",
            "Fuhuş / cinsel hizmet / müstehcen ticari içerik",
            "TCK ve 5651 kapsamındaki fuhuş/müstehcenlik hükümleri",
            ["escort", "eskort", "fuhus", "genelev", "cinsel hizmet", "cinsel servis", "seks hizmeti", "sex hizmeti", "mutlu son masaj", "happy ending masaj", "porno cekim", "pornografik hizmet"],
            [], []),

        new(
            "weapons-explosives",
            "Yasa dışı silah / mühimmat / patlayıcı ticareti",
            "6136 s. Kanun ve ilgili silah mevzuatı; RTÜK ticari iletişim kısıtları",
            ["kacak silah", "ruhsatsiz silah", "silah sat", "tabanca sat", "tufek sat", "mermi sat", "muhimmat sat", "patlayici sat", "bomba sat", "dinamit sat"],
            ["silah", "tabanca", "tufek", "mermi", "muhimmat", "patlayici", "dinamit"],
            ["sat", "satis", "temin", "tedarik", "siparis", "kacak", "ruhsatsiz"]),

        new(
            "tobacco-nicotine-ad",
            "Tütün / nikotin ürünü reklam ve tanıtımı",
            "4207 s. Kanun ve ilgili tütün mevzuatı",
            ["sigara sat", "tutun sat", "puro sat", "nargile tutunu sat", "elektronik sigara sat", "e sigara sat", "vape sat", "likit sat", "nikotin urunu sat", "sigara kampanya", "tutun kampanya"],
            ["sigara", "tutun", "puro", "elektronik sigara", "e sigara", "vape", "nikotin", "nargile tutunu"],
            ["sat", "satis", "siparis", "kampanya", "promosyon", "indirim", "reklam", "tanitim"]),

        new(
            "alcohol-ad",
            "Alkollü içki reklam / tanıtımı",
            "4250 s. Kanun m.6 (20.06.2026 değişikliği)",
            ["alkol kampanya", "alkollu icki kampanya", "alkol reklami", "alkollu icki reklami", "alkol promosyon", "alkollu icki promosyon"],
            ["alkol", "alkollu icki", "bira", "sarap", "viski", "vodka", "raki", "tekila", "cin"],
            ["kampanya", "promosyon", "indirim", "reklam", "tanitim", "ozendir", "sponsor"]),

        new(
            "prescription-drug-ad",
            "Reçeteye tabi ilaç / tedavi reklamı veya izinsiz satışı",
            "Sağlık mevzuatı; 6112/RTÜK ticari iletişim ilkeleri",
            ["receteli ilac sat", "receteye tabi ilac sat", "recetesiz antibiyotik sat", "recetesiz receteli ilac", "ilac temin edilir"],
            ["receteli ilac", "receteye tabi ilac", "antibiyotik"],
            ["sat", "satis", "temin", "siparis", "kampanya", "reklam", "tanitim"]),

        new(
            "counterfeit-stolen-illegal-docs",
            "Sahte belge / kaçak veya çalıntı ürün ticareti",
            "TCK ve ilgili özel mevzuat",
            ["sahte kimlik", "sahte ehliyet", "sahte diploma", "sahte belge", "sahte fatura", "calinti mal", "calinti telefon", "kacak urun sat", "kacak sigara", "kacak alkol"],
            [], [])
    ];

    public static Result Check(params string?[] values)
    {
        var text = Normalize(string.Join(" ", values.Where(x => !string.IsNullOrWhiteSpace(x))));
        if (text.Length == 0) return new(false, null, null, null, null, null);

        foreach (var rule in Rules)
        {
            var direct = FindPhrase(text, rule.DirectTerms);
            if (direct is not null)
                return Hit(rule, direct);

            if (rule.SubjectTerms.Length == 0 || rule.ActionTerms.Length == 0)
                continue;

            var subject = FindPhrase(text, rule.SubjectTerms);
            var action = FindPhrase(text, rule.ActionTerms);
            if (subject is not null && action is not null)
                return Hit(rule, $"{subject} + {action}");
        }

        return new(false, null, null, null, null, null);
    }

    private static Result Hit(Rule rule, string term) => new(
        true,
        rule.Code,
        rule.Category,
        term,
        $"{rule.Category} kapsamında şüpheli içerik tespit edildi: {term}",
        rule.LegalBasis);

    private static string? FindPhrase(string text, IEnumerable<string> terms)
    {
        foreach (var term in terms)
        {
            var n = Normalize(term);
            if (n.Length == 0) continue;
            if (Regex.IsMatch(text, $@"(?<![\p{{L}}\p{{N}}]){Regex.Escape(n)}(?![\p{{L}}\p{{N}}])"))
                return term;
        }
        return null;
    }

    private static string Normalize(string value)
    {
        value = value.ToLower(new CultureInfo("tr-TR"))
            .Replace('ı','i').Replace('ğ','g').Replace('ü','u')
            .Replace('ş','s').Replace('ö','o').Replace('ç','c');
        var sb = new StringBuilder();
        foreach (var c in value.Normalize(NormalizationForm.FormD))
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
        var clean = sb.ToString().Normalize(NormalizationForm.FormC);
        clean = Regex.Replace(clean, @"[^a-z0-9]+", " ");
        return Regex.Replace(clean, @"\s+", " ").Trim();
    }
}
