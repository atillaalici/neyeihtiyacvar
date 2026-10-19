using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext dbContext)
    {
        if (!await dbContext.Cities.AnyAsync())
        {
            var cities = new[]
            {
                City("osmaniye", "Osmaniye", 1,
                    ("merkez", "Merkez"), ("kadirli", "Kadirli"), ("duzici", "Düziçi"),
                    ("bahce", "Bahçe"), ("toprakkale", "Toprakkale"), ("sumbas", "Sumbas"),
                    ("hasanbeyli", "Hasanbeyli")),
                City("adana", "Adana", 2,
                    ("seyhan", "Seyhan"), ("cukurova", "Çukurova"), ("yuregir", "Yüreğir"),
                    ("saricam", "Sarıçam"), ("ceyhan", "Ceyhan"), ("kozan", "Kozan")),
                City("gaziantep", "Gaziantep", 3,
                    ("sahinbey", "Şahinbey"), ("sehitkamil", "Şehitkamil"),
                    ("oguzeli", "Oğuzeli"), ("nizip", "Nizip"), ("islahiye", "İslahiye")),
                City("istanbul", "İstanbul", 4,
                    ("kadikoy", "Kadıköy"), ("besiktas", "Beşiktaş"), ("uskudar", "Üsküdar"),
                    ("sisli", "Şişli"), ("bakirkoy", "Bakırköy"), ("atasehir", "Ataşehir"),
                    ("maltepe", "Maltepe")),
                City("ankara", "Ankara", 5,
                    ("cankaya", "Çankaya"), ("kecioren", "Keçiören"), ("yenimahalle", "Yenimahalle"),
                    ("mamak", "Mamak"), ("etimesgut", "Etimesgut"), ("sincan", "Sincan")),
                City("izmir", "İzmir", 6,
                    ("konak", "Konak"), ("bornova", "Bornova"), ("karsiyaka", "Karşıyaka"),
                    ("buca", "Buca"), ("bayrakli", "Bayraklı"), ("cigli", "Çiğli")),
                City("mersin", "Mersin", 7,
                    ("yenisehir", "Yenişehir"), ("toroslar", "Toroslar"), ("akdeniz", "Akdeniz"),
                    ("mezitli", "Mezitli"), ("tarsus", "Tarsus")),
                City("hatay", "Hatay", 8,
                    ("antakya", "Antakya"), ("iskenderun", "İskenderun"), ("defne", "Defne"),
                    ("dortyol", "Dörtyol"), ("samandag", "Samandağ"))
            };

            dbContext.Cities.AddRange(cities);
        }


        if (!await dbContext.MembershipPlans.AnyAsync())
        {
            var now = DateTime.UtcNow;

            dbContext.MembershipPlans.AddRange(
                new MembershipPlan
                {
                    Code = "kobi",
                    Name = "KOBİ",
                    Description = "Esnaf, usta ve küçük işletmeler için ideal başlangıç paketi.",
                    AnnualPrice = 1200m,
                    ServiceLimit = 2,
                    IsRecommended = false,
                    SortOrder = 1,
                    MapVisibility = true,
                    PhotoEnabled = true,
                    VideoEnabled = false,
                    FeaturedBadgeEnabled = false,
                    SearchPriorityEnabled = false,
                    AdvancedStatisticsEnabled = false,
                    CatalogCampaignEnabled = false,
                    PrioritySupportEnabled = false,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                },
                new MembershipPlan
                {
                    Code = "avantaj",
                    Name = "Avantaj",
                    Description = "Daha fazla hizmet alanında görünmek isteyen işletmeler için önerilen paket.",
                    AnnualPrice = 2400m,
                    ServiceLimit = 5,
                    IsRecommended = true,
                    SortOrder = 2,
                    MapVisibility = true,
                    PhotoEnabled = true,
                    VideoEnabled = true,
                    FeaturedBadgeEnabled = true,
                    SearchPriorityEnabled = true,
                    AdvancedStatisticsEnabled = false,
                    CatalogCampaignEnabled = false,
                    PrioritySupportEnabled = true,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                },
                new MembershipPlan
                {
                    Code = "profesyonel",
                    Name = "Profesyonel",
                    Description = "Geniş hizmet ağı bulunan işletmeler ve ekipler için gelişmiş paket.",
                    AnnualPrice = 5000m,
                    ServiceLimit = 12,
                    IsRecommended = false,
                    SortOrder = 3,
                    MapVisibility = true,
                    PhotoEnabled = true,
                    VideoEnabled = true,
                    FeaturedBadgeEnabled = true,
                    SearchPriorityEnabled = true,
                    AdvancedStatisticsEnabled = true,
                    CatalogCampaignEnabled = true,
                    PrioritySupportEnabled = true,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                });
        }
        await dbContext.SaveChangesAsync();
    }

    private static Category Category(string slug, string name, int sortOrder, params string[] services)
    {
        var category = new Category
        {
            Slug = slug,
            Name = name,
            SortOrder = sortOrder
        };

        category.Services = services
            .Select((service, index) => new CategoryService
            {
                Name = service,
                SortOrder = index + 1,
                Category = category
            })
            .ToList();

        return category;
    }

    private static City City(
        string slug,
        string name,
        int sortOrder,
        params (string Slug, string Name)[] districts)
    {
        var city = new City
        {
            Slug = slug,
            Name = name,
            SortOrder = sortOrder
        };

        city.Districts = districts
            .Select((district, index) => new District
            {
                Slug = district.Slug,
                Name = district.Name,
                SortOrder = index + 1,
                City = city
            })
            .ToList();

        return city;
    }
}
