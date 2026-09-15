using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public sealed record TaxonomyV3Path(
    string Area,
    string Group,
    string Service,
    string Specialty,
    string LegacyCategorySlug,
    string LegacyServiceSlug,
    string[] SearchTerms)
{
    public string Id =>
        TaxonomyV3Catalog.PathId(
            Area,
            Group,
            Service,
            Specialty);
}

public static class TaxonomyV3Catalog
{
    public static readonly TaxonomyV3Path[] Paths =
    [
        new("Ev & Yapı", "İnşaat & Hafriyat", "Hafriyat", "Genel Hafriyat", "insaat-hafriyat", "hafriyat", ["hafriyat","kazı","çukur kazdıracağım","toprak aldıracağım","kepçe lazım","iş makinesi"]),
        new("Ev & Yapı", "İnşaat & Hafriyat", "Hafriyat", "Temel Kazısı", "insaat-hafriyat", "temel-kazisi", ["temel kazısı","temel açtıracağım","bina temeli"]),
        new("Ev & Yapı", "İnşaat & Hafriyat", "Hafriyat", "Kanal Kazısı", "insaat-hafriyat", "kanal-kazisi", ["kanal kazısı","hat kazısı","boru hattı kazısı"]),
        new("Ev & Yapı", "İnşaat & Hafriyat", "Hafriyat", "Arazi Tesviyesi", "insaat-hafriyat", "arazi-tesviyesi", ["arazi düzeltme","zemin düzeltme","tesviye"]),
        new("Ev & Yapı", "İnşaat & Hafriyat", "İş Makinesi", "Ekskavatör", "insaat-hafriyat", "ekskavator-hizmeti", ["ekskavatör","paletli kepçe","kazıcı"]),
        new("Ev & Yapı", "İnşaat & Hafriyat", "İş Makinesi", "Beko Loder", "insaat-hafriyat", "beko-loder-hizmeti", ["beko loder","kazıcı yükleyici","kepçe"]),
        new("Ev & Yapı", "Tesisat", "Su Tesisatı", "Arıza & Tamir", "usta-tamir", "su-tesisatcisi", ["vana arızalı","vena arızalı","musluk akıtıyor","su kaçağı","boru patladı","lavabo tıkalı","tesisatçı"]),
        new("Ev & Yapı", "Elektrik & Aydınlatma", "Elektrikçi", "Elektrik Arızası", "usta-tamir", "elektrikci", ["sigorta atıyor","priz çalışmıyor","elektrik yok","kaçak akım"]),
        new("Ev & Yapı", "Isıtma & Soğutma", "Klima", "Klima Servisi", "usta-tamir", "klima-servisi", ["klima soğutmuyor","klima bakım","klima gazı"]),
        new("Ev & Yapı", "Isıtma & Soğutma", "Kombi", "Kombi Servisi", "usta-tamir", "kombi-servisi", ["kombi çalışmıyor","petek ısınmıyor","kombi bakım"]),
        new("Ev & Yapı", "Boya & Dekorasyon", "Boyacı", "İç Cephe Boya", "usta-tamir", "boyaci", ["ev boyama","duvar boyama","boya badana"]),
        new("Ev & Yapı", "Çatı & Yalıtım", "Çatı", "Çatı Tamiri", "usta-tamir", "cati-ustasi", ["çatı akıyor","çatı tamiri","kiremit"]),
        new("Ev & Yaşam", "Temizlik", "Ev Temizliği", "Genel Ev Temizliği", "ev-yasam", "ev-temizligi", ["ev temizliği","temizlikçi","ev temizletmek"]),
        new("Ev & Yaşam", "Bahçe & Peyzaj", "Peyzaj", "Bahçe Düzenleme", "ev-yasam", "bahce-duzenleme", ["bahçe düzenleme","peyzaj","çim biçme"]),
        new("Ev & Yaşam", "Güvenlik", "Çilingir", "Kapı & Kilit", "usta-tamir", "cilingir", ["kapıda kaldım","anahtar kayıp","kilit bozuk","çilingir"]),
        new("Araç & Ulaşım", "Oto Servis", "Oto Tamir", "Genel Mekanik", "otomotiv", "oto-tamir", ["araba bozuldu","motor arızası","oto tamir"]),
        new("Araç & Ulaşım", "Oto Servis", "Oto Elektrik", "Elektrik Arızası", "otomotiv", "oto-elektrik", ["marş basmıyor","far yanmıyor","akü bitti"]),
        new("Araç & Ulaşım", "Lastik & Jant", "Lastikçi", "Lastik Tamiri", "otomotiv", "lastikci", ["lastik patladı","teker patladı","lastikçi"]),
        new("Araç & Ulaşım", "Yol Yardım", "Çekici", "Oto Kurtarma", "otomotiv", "cekici", ["yolda kaldım","çekici lazım","oto kurtarma"]),
        new("Nakliye & Lojistik", "Taşımacılık", "Evden Eve Nakliyat", "Ev Taşıma", "nakliye-tasima", "evden-eve-nakliyat", ["ev taşıma","nakliyat","eşya taşıma"]),
        new("Nakliye & Lojistik", "Taşımacılık", "Parça Eşya", "Kamyonet Nakliye", "nakliye-tasima", "kamyonet-nakliye", ["kamyonet","parça eşya","küçük nakliye"]),
        new("Teknoloji", "Bilgisayar", "Bilgisayar Servisi", "Masaüstü & Laptop", "teknoloji", "bilgisayar-servisi", ["bilgisayar açılmıyor","laptop bozuldu","format","mavi ekran"]),
        new("Teknoloji", "Telefon & Tablet", "Telefon Tamiri", "Ekran & Donanım", "teknoloji", "telefon-tamiri", ["telefon düştü ekran gitti","ekran kırıldı","şarj olmuyor"]),
        new("Teknoloji", "Ağ & Güvenlik", "Kamera Sistemleri", "Kamera Kurulumu", "teknoloji", "kamera-sistemleri", ["güvenlik kamerası","kamera taktıracağım"]),
        new("Teknoloji", "Yazılım & Web", "Web Tasarım", "Kurumsal Web Sitesi", "teknoloji", "web-tasarim", ["web sitesi","site yaptırmak","kurumsal site"]),
        new("Teknoloji", "Yazılım & Web", "Yazılım Geliştirme", "Özel Yazılım", "teknoloji", "yazilim-gelistirme", ["özel yazılım","program yaptırmak","uygulama yaptırmak"]),
        new("İş & Profesyonel", "Muhasebe & Finans", "Mali Müşavir", "Muhasebe Hizmeti", "isletme-profesyonel", "mali-musavir", ["mali müşavir","muhasebeci"]),
        new("İş & Profesyonel", "Hukuk", "Avukat", "Hukuki Danışmanlık", "isletme-profesyonel", "avukat", ["avukat","hukuki danışmanlık"]),
        new("Sağlık & Bakım", "Sağlık", "Diş Kliniği", "Diş Tedavisi", "saglik", "dis-klinigi", ["dişçi","dişim ağrıyor","diş tedavisi"]),
        new("Sağlık & Bakım", "Kişisel Bakım", "Kuaför", "Saç Kesim & Bakım", "guzellik-bakim", "kuafor", ["kuaför","saç kesimi"]),
        new("Eğitim", "Özel Ders", "Matematik", "Matematik Özel Ders", "egitim", "matematik-ozel-ders", ["matematik özel ders","matematik hocası"]),
        new("Eğitim", "Özel Ders", "Yabancı Dil", "İngilizce Özel Ders", "egitim", "ingilizce-ozel-ders", ["ingilizce özel ders","ingilizce hocası"]),
        new("Etkinlik & Organizasyon", "Düğün & Davet", "Organizasyon", "Düğün Organizasyonu", "organizasyon", "dugun-organizasyonu", ["düğün organizasyonu","düğün planlama"]),
        new("Etkinlik & Organizasyon", "Fotoğraf & Video", "Fotoğrafçı", "Düğün Fotoğrafı", "organizasyon", "fotografci", ["fotoğrafçı","düğün fotoğrafçısı"]),
        new("Emlak & Gayrimenkul", "Emlak", "Emlak Danışmanı", "Konut", "emlak", "emlak-danismani", ["emlakçı","ev satmak","ev kiralamak"]),
        new("Tarım & Hayvancılık", "Tarla İşleri", "Traktör Hizmeti", "Tarla Sürme", "tarim-hayvancilik", "tarla-surme", ["tarla sürme","traktör lazım"]),
        new("Tarım & Hayvancılık", "Sulama", "Sulama Sistemleri", "Damla Sulama", "tarim-hayvancilik", "damla-sulama", ["damla sulama","sulama sistemi"]),
        new("Tarım & Hayvancılık", "Hayvan Sağlığı", "Veteriner", "Büyükbaş & Küçükbaş", "tarim-hayvancilik", "veteriner", ["veteriner","hayvan hasta"]),
        new("Yeme & İçme", "Restoran", "Lokanta", "Ev Yemekleri", "yeme-icme", "ev-yemekleri", ["ev yemekleri","lokanta","yemek"]),
        new("Yeme & İçme", "Hazır Yemek", "Catering", "Toplu Yemek", "yeme-icme", "catering", ["catering","toplu yemek"]),
        new("Alışveriş & Perakende", "Gıda", "Market", "Mahalle Marketi", "market-gida", "market", ["market","bakkal","alışveriş"]),
        new("Alışveriş & Perakende", "Gıda", "Kasap", "Et & Şarküteri", "market-gida", "kasap", ["kasap","et almak","kıyma"]),
        new("Alışveriş & Perakende", "Yapı & Hırdavat", "Yapı Market", "Hırdavat", "yapi-market", "hirdavat", ["hırdavat","vida","matkap ucu","yapı market"]),
        new("Enerji", "Güneş Enerjisi", "Güneş Paneli", "GES Kurulumu", "enerji", "gunes-paneli-kurulumu", ["güneş paneli","ges","solar panel"]),
        new("Turizm & Konaklama", "Konaklama", "Otel", "Otel Konaklama", "turizm-konaklama", "otel", ["otel","konaklama","kalacak yer"])
    ];

    public static string PathId(
        params string[] parts)
        => string.Join(
            "--",
            parts.Select(ToSlug));

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
            if (CharUnicodeInfo.GetUnicodeCategory(character) !=
                UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        return Regex.Replace(
                Regex.Replace(
                    builder
                        .ToString()
                        .Normalize(
                            NormalizationForm.FormC),
                    "[^a-z0-9]+",
                    " "),
                "\\s+",
                " ")
            .Trim();
    }

    public static string ToSlug(
        string value)
        => Regex.Replace(
                Normalize(value),
                "\\s+",
                "-")
            .Trim('-');

    public static int Score(
        string query,
        TaxonomyV3Path path)
    {
        var normalizedQuery =
            Normalize(query);

        if (normalizedQuery.Length == 0)
        {
            return 0;
        }

        var candidates =
            new[]
            {
                path.Area,
                path.Group,
                path.Service,
                path.Specialty
            }
            .Concat(path.SearchTerms)
            .Select(Normalize);

        var best = 0;

        foreach (var candidate in candidates)
        {
            if (candidate == normalizedQuery)
            {
                best = Math.Max(
                    best,
                    100);

                continue;
            }

            if (candidate.Contains(
                    normalizedQuery,
                    StringComparison.Ordinal) ||
                normalizedQuery.Contains(
                    candidate,
                    StringComparison.Ordinal))
            {
                best = Math.Max(
                    best,
                    88);

                continue;
            }

            var queryTokens =
                normalizedQuery.Split(
                    ' ',
                    StringSplitOptions.RemoveEmptyEntries);

            var candidateTokens =
                candidate.Split(
                    ' ',
                    StringSplitOptions.RemoveEmptyEntries);

            var hitCount =
                queryTokens.Count(queryToken =>
                    candidateTokens.Any(candidateToken =>
                        candidateToken.Contains(queryToken) ||
                        queryToken.Contains(candidateToken)));

            if (hitCount > 0)
            {
                best = Math.Max(
                    best,
                    55 + Math.Min(
                        30,
                        hitCount * 10));
            }
        }

        return best;
    }
}