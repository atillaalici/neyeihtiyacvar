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
        "hukuk-danismanlik",
        "finans-sigorta",
        "tarim-hayvancilik",
        "sanayi-uretim",
        "reklam-medya",
        "turizm-seyahat",
        "giyim-tekstil",
        "hurda-atik",
        "kiralama",
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
            "Sa\u011Fl\u0131k & Bak\u0131m",
            [
                "Evde Bak\u0131m",
                "Ya\u015Fl\u0131 Bak\u0131m\u0131",
                "Hasta Bak\u0131m\u0131",
                "G\u00FCzellik & Ki\u015Fisel Bak\u0131m",
                "Kuaf\u00F6r & Berber"
            ]),

        new(
            "hukuk-danismanlik",
            "Hukuk & Dan\u0131\u015Fmanl\u0131k",
            [
                "Hukuki Dan\u0131\u015Fmanl\u0131k",
                "Mali M\u00FC\u015Favirlik",
                "\u0130\u015F Dan\u0131\u015Fmanl\u0131\u011F\u0131",
                "Terc\u00FCme"
            ]),

        new(
            "finans-sigorta",
            "Finans & Sigorta",
            [
                "Sigorta Acenteli\u011Fi",
                "Finansal Dan\u0131\u015Fmanl\u0131k"
            ]),

        new(
            "tarim-hayvancilik",
            "Tar\u0131m & Hayvanc\u0131l\u0131k",
            [
                "Tar\u0131msal Hizmetler",
                "Tar\u0131m Makinesi Hizmetleri",
                "Hayvanc\u0131l\u0131k Hizmetleri",
                "Veterinerlik Hizmetleri"
            ]),

        new(
            "sanayi-uretim",
            "Sanayi & \u00DCretim",
            [
                "Kaynak & Metal \u0130\u015Fleri",
                "Makine Bak\u0131m & Onar\u0131m",
                "\u0130malat Hizmetleri",
                "Ta\u015Feron Hizmetleri"
            ]),

        new(
            "reklam-medya",
            "Reklam & Medya",
            [
                "Reklam Ajans\u0131",
                "Grafik Tasar\u0131m",
                "Bask\u0131 Hizmetleri",
                "Tabela",
                "Promosyon \u00DCr\u00FCnleri"
            ]),

        new(
            "turizm-seyahat",
            "Turizm & Seyahat",
            [
                "Seyahat Acentesi",
                "Tur Hizmetleri",
                "Transfer Hizmetleri"
            ]),

        new(
            "giyim-tekstil",
            "Giyim & Tekstil",
            [
                "Terzi",
                "Tekstil Tadilat\u0131",
                "Lostra & Ayakkab\u0131 Tamiri",
                "Hal\u0131 & Overlok"
            ]),

        new(
            "hurda-atik",
            "Hurda & At\u0131k",
            [
                "Hurdac\u0131",
                "At\u0131k Toplama",
                "Geri D\u00F6n\u00FC\u015F\u00FCm"
            ]),

        new(
            "kiralama",
            "Kiralama",
            [
                "Ekipman Kiralama",
                "Makine Kiralama",
                "\u00DCr\u00FCn Kiralama"
            ]),

        new(
            "digerleri",
            "Di\u011Ferleri",
            [
                "Cenaze Hizmetleri",
                "El Sanatlar\u0131",
                "Bayilik & Franchise",
                "Alt\u0131n & G\u00FCm\u00FC\u015F Tamiri",
                "Saat Tamiri",
                "Enstr\u00FCman Tamiri"
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
