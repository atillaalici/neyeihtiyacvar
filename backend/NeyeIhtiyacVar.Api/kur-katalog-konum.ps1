$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"
$endpointDir = Join-Path $root "Endpoints"

New-Item -ItemType Directory -Force $endpointDir | Out-Null

@'
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class CatalogEndpoints
{
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories");

        group.MapGet("/", async (AppDbContext dbContext) =>
        {
            var categories = await dbContext.Categories
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.Name,
                    Services = x.Services
                        .Where(service => service.IsActive)
                        .OrderBy(service => service.SortOrder)
                        .ThenBy(service => service.Name)
                        .Select(service => service.Name)
                        .ToList()
                })
                .ToListAsync();

            return Results.Ok(categories);
        });

        return app;
    }
}
'@ | Set-Content -Encoding UTF8 (Join-Path $endpointDir "CatalogEndpoints.cs")

@'
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class LocationEndpoints
{
    public static IEndpointRouteBuilder MapLocationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/locations");

        group.MapGet("/", async (AppDbContext dbContext) =>
        {
            var cities = await dbContext.Cities
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.Name,
                    Districts = x.Districts
                        .Where(district => district.IsActive)
                        .OrderBy(district => district.SortOrder)
                        .ThenBy(district => district.Name)
                        .Select(district => new
                        {
                            district.Id,
                            district.Slug,
                            district.Name
                        })
                        .ToList()
                })
                .ToListAsync();

            return Results.Ok(cities);
        });

        return app;
    }
}
'@ | Set-Content -Encoding UTF8 (Join-Path $endpointDir "LocationEndpoints.cs")

@'
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext dbContext)
    {
        if (!await dbContext.Categories.AnyAsync())
        {
            var categories = new[]
            {
                Category("usta-tamir", "Usta & Tamir", 1,
                    "Elektrikçi", "Su tesisatçısı", "Boyacı", "Mobilya montajı",
                    "Çilingir", "Beyaz eşya servisi", "Klima servisi"),
                Category("ev-yasam", "Ev & Yaşam", 2,
                    "Ev temizliği", "Bahçe işleri", "Haşere ilaçlama", "Apartman hizmetleri"),
                Category("nakliye-tasima", "Nakliye & Taşıma", 3,
                    "Evden eve nakliyat", "Şehirlerarası nakliye", "Parça eşya taşıma", "Yük taşıma"),
                Category("teknoloji", "Teknoloji", 4,
                    "Bilgisayar servisi", "Telefon tamiri", "Kamera sistemleri",
                    "Network / internet", "Yazılım ve web hizmetleri"),
                Category("otomotiv", "Otomotiv", 5,
                    "Oto tamir", "Lastikçi", "Oto elektrik", "Çekici", "Oto yıkama"),
                Category("egitim", "Eğitim", 6,
                    "Özel ders", "Yabancı dil", "Sınav hazırlık", "Bilgisayar eğitimi"),
                Category("organizasyon", "Organizasyon", 7,
                    "Düğün", "Fotoğrafçı", "Catering", "Organizasyon firmaları"),
                Category("diger", "Diğer", 8,
                    "Aradığın hizmet listede yoksa ihtiyacını yazman yeterli")
            };

            dbContext.Categories.AddRange(categories);
        }

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
'@ | Set-Content -Encoding UTF8 (Join-Path $root "Infrastructure\SeedData.cs")

$programPath = Join-Path $root "Program.cs"
$program = Get-Content -Raw -Encoding UTF8 $programPath

if ($program -notmatch 'MapCatalogEndpoints\(\)') {
    $program = $program -replace 'app\.MapNeedRequestEndpoints\(\);', "app.MapNeedRequestEndpoints();`r`napp.MapCatalogEndpoints();`r`napp.MapLocationEndpoints();"
}

if ($program -notmatch 'SeedData\.InitializeAsync') {
    $program = $program -replace 'app\.UseCors\("Frontend"\);', "app.UseCors(`"Frontend`");`r`n`r`nusing (var scope = app.Services.CreateScope())`r`n{`r`n    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();`r`n    await SeedData.InitializeAsync(dbContext);`r`n}"
}

Set-Content -Encoding UTF8 $programPath $program

Write-Host ""
Write-Host "Catalog, location endpointleri ve baslangic verileri hazirlandi." -ForegroundColor Green
Write-Host "Simdi: dotnet build" -ForegroundColor Cyan
