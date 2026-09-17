using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public static class ExpandedCatalogSeeder
{
    private sealed record CatalogCategory(
        string Slug,
        string Name,
        string[] Services);

    public static readonly string[] PublicCategorySlugs =
    [
        "usta-tamir",
        "ev-yasam",
        "otomotiv",
        "nakliye-tasima",
        "teknoloji-yazilim",
        "organizasyon",
        "egitim",
        "saglik-bakim",
        "guzellik-kisisel-bakim",
        "yeme-icme",
        "alisveris-magazalar",
        "emlak",
        "insaat-yapi",
        "tarim-hayvancilik",
        "turizm-konaklama",
        "profesyonel-hizmetler",
        "spor-fitness",
        "digerleri"
    ];

    private static readonly CatalogCategory[] Catalog =
    [
        new(
            "usta-tamir",
            "Usta & Tamir",
            [
                "Elektrik\u00E7i",
                "Su Tesisat\u00E7\u0131s\u0131",
                "Do\u011Falgaz Tesisat\u00E7\u0131s\u0131",
                "Klima Servisi",
                "Kombi Servisi",
                "Boyac\u0131",
                "Al\u00E7\u0131 & Kartonpiyer Ustas\u0131",
                "\u00C7at\u0131 Ustas\u0131",
                "Yal\u0131t\u0131m & Mantolama",
                "Marangoz",
                "Mobilya & D\u00F6\u015Feme Ustas\u0131",
                "Kap\u0131 & Pencere Ustas\u0131",
                "Cam & Cam Balkon",
                "Demir & Ferforje",
                "\u00C7ilingir",
                "Fayans & Seramik Ustas\u0131",
                "Zemin Kaplama",
                "Ta\u015F & Beton D\u00F6\u015Feme",
                "\u0130n\u015Faat & Tadilat",

                "Asans\u00F6r Servisi",
                "Jenerat\u00F6r Servisi",
                "Yang\u0131n & G\u00FCvenlik Sistemleri"
            ]),

        new(
            "ev-yasam",
            "Ev & Ya\u015Fam",
            [
                "Ev Temizli\u011Fi",
                "\u0130\u015F Yeri Temizli\u011Fi",
                "Apartman Temizli\u011Fi",
                "\u0130n\u015Faat Sonras\u0131 Temizlik",
                "Koltuk & D\u00F6\u015Feme Temizli\u011Fi",
                "Hal\u0131 Temizli\u011Fi",
                "\u0130la\u00E7lama",
                "Bah\u00E7e & Peyzaj",
                "\u00C7im & Bah\u00E7e Bak\u0131m\u0131",
                "Banyo Dekorasyonu",
                "Mutfak Dekorasyonu",
                "\u0130\u00E7 Dekorasyon",
                "Mobilya",
                "Evcil Hayvan Hizmetleri",
                "Ev Yard\u0131m Hizmetleri"
            ]),

        new(
            "otomotiv",
            "Otomotiv",
            [
                "Oto Tamir & Servis",
                "Oto Elektrik",
                "Oto Elektronik",
                "Oto Kaporta",
                "Oto Boya",
                "Oto Lastik",
                "Oto Ekspertiz",
                "\u00C7ekici & Yol Yard\u0131m",
                "Oto Temizlik",
                "Oto Detayl\u0131 Temizlik",
                "Oto D\u00F6\u015Feme",
                "Oto Ses & G\u00F6r\u00FCnt\u00FC",
                "Oto Modifiye",
                "Oto Klima",
                "Oto Anahtar & Kilit",
                "Oto Cam",
                "Oto Plaka",
                "Motosiklet Servisi",
                "Bisiklet Tamiri",
                "Tekne & Yat Tamiri",
                "Trafik M\u00FC\u015Favirli\u011Fi"
            ]),

        new(
            "nakliye-tasima",
            "Nakliye & Hafriyat",
            [
                "Evden Eve Nakliyat",
                "\u015Eehir \u0130\u00E7i Nakliyat",
                "\u015Eehirler Aras\u0131 Nakliyat",
                "Ofis & \u0130\u015F Yeri Ta\u015F\u0131ma",
                "Fabrika Ta\u015F\u0131ma",
                "Fuar Ta\u015F\u0131mac\u0131l\u0131\u011F\u0131",
                "Y\u00FCk Ta\u015F\u0131ma",
                "Par\u00E7a E\u015Fya Ta\u015F\u0131ma",
                "A\u011F\u0131r Y\u00FCk Ta\u015F\u0131ma",
                "Hafriyat",
                "Kurye",
                "Kargo",
                "Nakliye Ambar\u0131",
                "Lojistik",
                "Depolama",
                "Paketleme",
                "\u015Eof\u00F6rl\u00FC Ara\u00E7",
                "Transfer",
                "G\u00FCmr\u00FCkleme"
            ]),

        new(
            "teknoloji-yazilim",
            "Teknoloji & Yaz\u0131l\u0131m",
            [
                "Bilgisayar Teknik Servisi",
                "Laptop Tamiri",
                "Cep Telefonu Tamiri",
                "Tablet Tamiri",
                "Yaz\u0131c\u0131 Tamiri",
                "Fotokopi Makinesi Servisi",
                "Televizyon Tamiri",
                "Elektronik Cihaz Tamiri",
                "Uydu Sistemleri",
                "Kamera Sistemleri",
                "Alarm Sistemleri",
                "Telefon Santrali",
                "A\u011F & \u0130nternet Kurulumu",
                "Yaz\u0131l\u0131m Geli\u015Ftirme",
                "Web Sitesi",
                "Mobil Uygulama",
                "Bilgi \u0130\u015Flem Deste\u011Fi",
                "Veri Kurtarma",
                "Siber G\u00FCvenlik"
            ]),

        new(
            "organizasyon",
            "Organizasyon",
            [
                "D\u00FC\u011F\u00FCn Organizasyonu",
                "Ni\u015Fan Organizasyonu",
                "K\u0131na Organizasyonu",
                "S\u00FCnnet Organizasyonu",
                "Do\u011Fum G\u00FCn\u00FC & Parti",
                "\u00D6zel G\u00FCn Organizasyonu",
                "Davet Organizasyonu",
                "Fuar Organizasyonu",
                "Kongre & Seminer",
                "Foto\u011Fraf\u00E7\u0131",
                "Video & Kamera",
                "M\u00FCzik Organizasyonu",
                "DJ",
                "Ses Sistemleri",
                "I\u015F\u0131k Sistemleri",
                "Sahne Sistemleri",
                "Catering",
                "Pasta & \u0130kram",
                "Dans Hizmetleri"
            ]),

        new(
            "egitim",
            "E\u011Fitim",
            [
                "\u00D6zel Ders",
                "Et\u00FCt Merkezi",
                "Dershane",
                "Yabanc\u0131 Dil Kursu",
                "Bilgisayar Kursu",
                "Meslek Kurslar\u0131",
                "M\u00FCzik Kursu",
                "Dans Kursu",
                "Spor Kurslar\u0131",
                "S\u00FCr\u00FCc\u00FC Kursu",
                "Anaokulu",
                "\u00D6\u011Frenci Yurdu",
                "E\u011Fitim Dan\u0131\u015Fmanl\u0131\u011F\u0131"
            ]),

        new(
            "saglik-bakim",
            "Sağlık & Bakım",
            [
                "Hastane", "Özel Hastane", "Tıp Merkezi", "Poliklinik", "Diş Kliniği",
                "Diş Hekimi", "Psikolog", "Diyetisyen", "Fizyoterapi",
                "Evde Sağlık & Bakım", "Yaşlı Bakımı", "Hasta Bakımı", "Medikal Ürünler"
            ]),
        new(
            "guzellik-kisisel-bakim",
            "Güzellik & Kişisel Bakım",
            [
                "Kuaför", "Berber", "Güzellik Salonu", "Cilt Bakımı", "Lazer Epilasyon",
                "Manikür & Pedikür", "Makyaj", "Masaj", "Spa & Wellness"
            ]),
        new(
            "yeme-icme",
            "Yeme & İçme",
            [
                "Restoran", "Kafe", "Lokanta", "Pastane", "Fırın", "Fast Food",
                "Paket Servis", "Catering", "Hazır Yemek", "Kasap", "Tatlı & Dondurma"
            ]),
        new(
            "alisveris-magazalar",
            "Alışveriş & Mağazalar",
            [
                "Market", "Giyim", "Ayakkabı", "Beyaz Eşya", "Elektronik", "Mobilya",
                "Züccaciye", "Yapı Market", "Hırdavat", "Kırtasiye", "Çiçekçi", "Pet Shop"
            ]),
        new(
            "emlak",
            "Emlak",
            [
                "Emlak Danışmanı", "Satılık Konut", "Kiralık Konut", "Arsa", "Tarla",
                "Daire", "Villa", "İşyeri", "Ticari Gayrimenkul", "Günlük Kiralık"
            ]),
        new(
            "insaat-yapi",
            "İnşaat & Yapı",
            [
                "Müteahhit", "Kaba İnşaat", "İnce İnşaat", "Tadilat & Dekorasyon",
                "Mimarlık", "İç Mimarlık", "İnşaat Mühendisliği", "Hazır Beton",
                "Beton Pompası", "Karot & Beton Kesme", "İskele", "Çatı Sistemleri",
                "Yalıtım & Mantolama", "Prefabrik Yapı", "İstinat Duvarı"
            ]),
        new(
            "tarim-hayvancilik",
            "Tarım & Hayvancılık",
            [
                "Tarım Ürünleri", "Tarla İşleri", "Bahçe İşleri", "Fidan & Fide", "Tohum",
                "Gübre", "Zirai İlaçlama", "Tarım Makineleri", "Zirai Ekipman",
                "Sulama Sistemleri", "Büyükbaş Hayvancılık", "Küçükbaş Hayvancılık",
                "Kanatlı Hayvancılık", "Hayvan Sağlığı", "Yem & Hayvancılık Ürünleri", "Arıcılık"
            ]),
        new(
            "turizm-konaklama",
            "Turizm & Konaklama",
            [
                "Otel", "Pansiyon", "Apart", "Bungalov", "Tatil Köyü", "Kamp & Karavan",
                "Günlük Konaklama", "Tur Organizasyonu", "Seyahat Acentesi",
                "Araç Kiralama", "Rehberlik"
            ]),
        new(
            "profesyonel-hizmetler",
            "Profesyonel Hizmetler",
            [
                "Muhasebe & Mali Müşavirlik", "Hukuk & Avukatlık", "Sigorta",
                "Finansal Danışmanlık", "İş Danışmanlığı", "İnsan Kaynakları", "Tercüme",
                "Reklam & Pazarlama", "Grafik Tasarım", "Fotoğraf & Video",
                "Matbaa & Baskı", "Danışmanlık"
            ]),
        new(
            "spor-fitness",
            "Spor & Fitness",
            [
                "Spor Salonu", "Fitness", "Personal Trainer", "Pilates", "Yoga", "Yüzme",
                "Futbol", "Basketbol", "Tenis", "Dövüş Sporları", "Dans",
                "Spor Kursları", "Spor Malzemeleri"
            ]),
        new(
            "digerleri",
            "Diğer Hizmetler",
            [
                "Diğer Hizmetler"
            ])
    ];

    public static string? GetPublicCategoryName(string slug)
        => Catalog
            .FirstOrDefault(x =>
                string.Equals(
                    x.Slug,
                    slug,
                    StringComparison.OrdinalIgnoreCase))
            ?.Name;

    public static IReadOnlyList<string> GetPublicServices(string slug)
        => Catalog
            .FirstOrDefault(x =>
                string.Equals(
                    x.Slug,
                    slug,
                    StringComparison.OrdinalIgnoreCase))
            ?.Services
            ?? Array.Empty<string>();

    private static async Task DeactivateLegacyUstaHafriyatAsync(
        AppDbContext dbContext)
    {
        var ustaCategoryId = await dbContext.Categories
            .AsNoTracking()
            .Where(x => x.Slug == "usta-tamir")
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync();

        if (ustaCategoryId is null)
        {
            return;
        }

        var legacy = await dbContext.CategoryServices
            .FirstOrDefaultAsync(x =>
                x.CategoryId == ustaCategoryId.Value &&
                x.Name == "Hafriyat" &&
                x.IsActive);

        if (legacy is not null)
        {
            legacy.IsActive = false;
            await dbContext.SaveChangesAsync();
        }
    }
    public static async Task EnsureAsync(AppDbContext dbContext)
    {
        var existingCategories = await dbContext.Categories
            .AsNoTracking()
            .Select(x => new
            {
                x.Id,
                x.Slug
            })
            .ToListAsync();

        var categoryBySlug = existingCategories
            .GroupBy(
                x => x.Slug,
                StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => group.First().Id,
                StringComparer.OrdinalIgnoreCase);

        var existingServices = await dbContext.CategoryServices
            .AsNoTracking()
            .Select(x => new
            {
                x.CategoryId,
                x.Name
            })
            .ToListAsync();

        var serviceKeys = existingServices
            .Select(x => ServiceKey(
                x.CategoryId,
                x.Name))
            .ToHashSet(
                StringComparer.OrdinalIgnoreCase);

        var newCategories = new List<Category>();
        var newServices = new List<CategoryService>();

        for (var categoryIndex = 0;
             categoryIndex < Catalog.Length;
             categoryIndex++)
        {
            var source = Catalog[categoryIndex];

            if (!categoryBySlug.TryGetValue(
                    source.Slug,
                    out var categoryId))
            {
                categoryId = Guid.NewGuid();

                newCategories.Add(new Category
                {
                    Id = categoryId,
                    Slug = source.Slug,
                    Name = source.Name,
                    SortOrder = categoryIndex + 1,
                    IsActive = true
                });

                categoryBySlug[source.Slug] = categoryId;
            }

            for (var serviceIndex = 0;
                 serviceIndex < source.Services.Length;
                 serviceIndex++)
            {
                var serviceName = source.Services[serviceIndex];
                var key = ServiceKey(categoryId, serviceName);

                if (serviceKeys.Contains(key))
                {
                    continue;
                }

                newServices.Add(new CategoryService
                {
                    Id = Guid.NewGuid(),
                    CategoryId = categoryId,
                    Name = serviceName,
                    SortOrder = serviceIndex + 1,
                    IsActive = true
                });

                serviceKeys.Add(key);
            }
        }

        if (newCategories.Count > 0)
        {
            dbContext.Categories.AddRange(newCategories);
            await dbContext.SaveChangesAsync();
        }

        if (newServices.Count > 0)
        {
            dbContext.CategoryServices.AddRange(newServices);
            await dbContext.SaveChangesAsync();
        }
        await DeactivateLegacyUstaHafriyatAsync(dbContext);
    }

    private static string ServiceKey(
        Guid categoryId,
        string serviceName)
        => $"{categoryId:N}|{serviceName.Trim().ToUpperInvariant()}";
}
