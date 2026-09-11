using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Application;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class RecommendationEndpoints
{
    private static readonly Dictionary<string, WeightedKeyword[]> ServiceKeywords =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["elektrikci"] =
            [
                K("elektrik", 4), K("sigorta atti", 7), K("priz", 5), K("kablo", 4),
                K("elektrik kesildi", 7), K("kacak", 5), K("tesisat", 3)
            ],
            ["su-tesisatcisi"] =
            [
                K("su kacagi", 8), K("musluk", 5), K("muslugum", 8),
                K("muslugum su akitiyor", 12), K("su akitiyor", 9),
                K("su sizdiriyor", 9), K("damlatiyor", 7), K("lavabo", 5),
                K("tikaniklik", 7), K("boru patladi", 8), K("sifon", 5),
                K("tesisatci", 6)
            ],
            ["boyaci"] =
            [
                K("boya", 5), K("boyaci", 8), K("badana", 8), K("duvar boya", 7)
            ],
            ["mobilya-montaji"] =
            [
                K("mobilya montaj", 9), K("dolap montaj", 8), K("gardrop", 6),
                K("mobilya", 4), K("montaj", 4)
            ],
            ["cilingir"] =
            [
                K("cilingir", 10), K("anahtar", 5), K("kilit", 6), K("kapida kaldim", 10)
            ],
            ["beyaz-esya-servisi"] =
            [
                K("beyaz esya", 7), K("camasir makinesi", 8), K("bulasik makinesi", 8),
                K("buzdolabi", 8), K("firin", 6), K("bozuldu", 3), K("calismiyor", 4)
            ],
            ["klima-servisi"] =
            [
                K("klima", 8), K("sogutmuyor", 8), K("klima bakim", 9), K("klima ariza", 9)
            ],
            ["ev-temizligi"] =
            [
                K("ev temizligi", 10), K("temizlikci", 9), K("temizlik", 5)
            ],
            ["bahce-isleri"] =
            [
                K("bahce", 5), K("cim", 5), K("budama", 7), K("peyzaj", 8)
            ],
            ["hasere-ilaclama"] =
            [
                K("hasere", 8), K("ilaclama", 7), K("bocek", 6)
            ],
            ["apartman-hizmetleri"] =
            [
                K("apartman", 5), K("site gorevlisi", 9), K("bina hizmet", 7)
            ],
            ["evden-eve-nakliyat"] =
            [
                K("evden eve", 10), K("tasiniyorum", 8), K("nakliyat", 7), K("ev tasima", 9)
            ],
            ["sehirlerarasi-nakliye"] =
            [
                K("sehirlerarasi", 10), K("sehir disi", 8), K("uzak sehir", 7), K("nakliye", 4)
            ],
            ["parca-esya-tasima"] =
            [
                K("parca esya", 10), K("tek esya", 9), K("esya tasima", 6)
            ],
            ["yuk-tasima"] =
            [
                K("yuk tasima", 9), K("kamyon", 6), K("yuk nakliye", 9)
            ],
            ["bilgisayar-servisi"] =
            [
                K("bilgisayar acilmiyor", 12), K("bilgisayarim acilmiyor", 12),
                K("laptop acilmiyor", 12), K("bilgisayar bozuldu", 11), K("laptop bozuldu", 11),
                K("bilgisayar tamir", 11), K("bilgisayar tamircisi", 11),
                K("laptop tamir", 10), K("format", 7), K("ram", 5), K("ssd", 5),
                K("anakart", 7), K("bilgisayar", 5), K("laptop", 6), K("notebook", 5), K("pc", 4)
            ],
            ["telefon-tamiri"] =
            [
                K("telefon tamir", 11), K("telefon tamircisi", 11), K("cep telefonu tamir", 12),
                K("ekran kirildi", 9), K("batarya", 7), K("sarj olmuyor", 9),
                K("dokunmatik", 7), K("telefon", 5), K("cep telefonu", 7)
            ],
            ["kamera-sistemleri"] =
            [
                K("guvenlik kamerasi", 10), K("kamera sistemi", 9), K("cctv", 9),
                K("nvr", 8), K("dvr", 8), K("kamera", 5)
            ],
            ["network-internet"] =
            [
                K("internet yok", 10), K("internet cekmiyor", 10), K("wifi cekmiyor", 10),
                K("network", 8), K("modem", 7), K("wifi", 7), K("ethernet", 7), K("ag", 4)
            ],
            ["yazilim-ve-web-hizmetleri"] =
            [
                K("web sitesi", 10), K("website", 9), K("yazilim", 8), K("uygulama", 7),
                K("program", 5), K("otomasyon", 8), K("site yaptirmak", 9)
            ],
            ["oto-tamir"] =
            [
                K("araba bozuldu", 12), K("arac bozuldu", 12), K("oto tamir", 11),
                K("araba tamircisi", 11), K("arac ariza", 10), K("motor ariza", 8),
                K("fren", 6), K("on takim", 8), K("suspansiyon", 7), K("araba", 4), K("arac", 4)
            ],
            ["lastikci"] =
            [
                K("lastikci", 10), K("lastik patladi", 10), K("patlak", 7),
                K("balans", 7), K("rot balans", 9), K("lastik", 6)
            ],
            ["oto-elektrik"] =
            [
                K("oto elektrik", 11), K("aku", 8), K("mars basmiyor", 10),
                K("alternator", 9)
            ],
            ["cekici"] =
            [
                K("cekici", 11), K("yolda kaldim", 11), K("arac cekme", 10)
            ],
            ["oto-yikama"] =
            [
                K("oto yikama", 10), K("arac yikama", 10), K("araba yikama", 10)
            ],
            ["ozel-ders"] =
            [
                K("ozel ders", 10), K("matematik dersi", 8), K("fen dersi", 8),
                K("ogretmen", 5)
            ],
            ["yabanci-dil"] =
            [
                K("ingilizce", 8), K("almanca", 8), K("yabanci dil", 10), K("dil kursu", 9)
            ],
            ["sinav-hazirlik"] =
            [
                K("lgs", 9), K("yks", 9), K("tyt", 9), K("ayt", 9),
                K("sinav hazirlik", 10), K("sinav", 5)
            ],
            ["bilgisayar-egitimi"] =
            [
                K("bilgisayar egitimi", 11), K("office kursu", 10), K("excel kursu", 10),
                K("bilgisayar kursu", 10), K("egitim", 4), K("kurs", 5)
            ],
            ["dugun"] =
            [
                K("dugun", 9), K("nisan", 8), K("kina", 8)
            ],
            ["fotografci"] =
            [
                K("fotografci", 10), K("fotograf cekimi", 9), K("cekim", 5)
            ],
            ["catering"] =
            [
                K("catering", 10), K("yemek organizasyonu", 9), K("toplu yemek", 9)
            ],
            ["organizasyon-firmalari"] =
            [
                K("organizasyon firmasi", 10), K("organizasyon", 7),
                K("etkinlik", 6), K("susleme", 7)
            ]
        };

    private static readonly HashSet<string> RepairIntentWords =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "tamir", "tamirci", "tamircisi", "bozuldu", "bozuk", "ariza",
            "acilmiyor", "calismiyor", "kirilmis", "kirildi", "onarim"
        };

    private static readonly HashSet<string> EducationIntentWords =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "egitim", "kurs", "ders", "ogrenmek", "ogrenmek istiyorum"
        };

    public static IEndpointRouteBuilder MapRecommendationEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recommendations");
        group.MapGet("/location", async (
            double lat,
            double lon,
            AppDbContext dbContext,
            IHttpClientFactory httpClientFactory,
            CancellationToken cancellationToken) =>
        {
            if (lat is < -90 or > 90 || lon is < -180 or > 180)
            {
                return Results.BadRequest(new
                {
                    message = "Geçersiz konum koordinatı."
                });
            }

            try
            {
                var client = httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.UserAgent.ParseAdd(
                    "NeyeIhtiyacVar/1.0");

                var reverseUrl =
                    $"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat.ToString(CultureInfo.InvariantCulture)}&lon={lon.ToString(CultureInfo.InvariantCulture)}&addressdetails=1&accept-language=tr";

                using var response = await client.GetAsync(
                    reverseUrl,
                    cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    return Results.Ok(new
                    {
                        found = false,
                        citySlug = (string?)null,
                        cityName = (string?)null,
                        districtSlug = (string?)null,
                        districtName = (string?)null
                    });
                }

                await using var stream = await response.Content
                    .ReadAsStreamAsync(cancellationToken);

                using var document = await JsonDocument.ParseAsync(
                    stream,
                    cancellationToken: cancellationToken);

                if (!document.RootElement.TryGetProperty(
                        "address",
                        out var address))
                {
                    return Results.Ok(new
                    {
                        found = false,
                        citySlug = (string?)null,
                        cityName = (string?)null,
                        districtSlug = (string?)null,
                        districtName = (string?)null
                    });
                }

                static string? ReadAddress(
                    JsonElement element,
                    params string[] keys)
                {
                    foreach (var key in keys)
                    {
                        if (element.TryGetProperty(key, out var value) &&
                            value.ValueKind == JsonValueKind.String)
                        {
                            var text = value.GetString();

                            if (!string.IsNullOrWhiteSpace(text))
                                return text;
                        }
                    }

                    return null;
                }

                var cityCandidates = new[]
                {
                    ReadAddress(address, "province"),
                    ReadAddress(address, "state"),
                    ReadAddress(address, "city")
                }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

                var districtCandidates = new[]
                {
                    ReadAddress(address, "city_district"),
                    ReadAddress(address, "district"),
                    ReadAddress(address, "county"),
                    ReadAddress(address, "town"),
                    ReadAddress(address, "municipality")
                }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

                var cities = await dbContext.Cities
                    .AsNoTracking()
                    .Where(x => x.IsActive)
                    .Include(x => x.Districts)
                    .ToListAsync(cancellationToken);

                var city = cities.FirstOrDefault(candidate =>
                    cityCandidates.Any(value =>
                    {
                        var left = NormalizeText(candidate.Name);
                        var right = NormalizeText(value);

                        return left == right ||
                               right.StartsWith(left + " ") ||
                               left.StartsWith(right + " ");
                    }));

                if (city is null)
                {
                    return Results.Ok(new
                    {
                        found = false,
                        citySlug = (string?)null,
                        cityName = (string?)null,
                        districtSlug = (string?)null,
                        districtName = (string?)null
                    });
                }

                var district = city.Districts
                    .Where(x => x.IsActive)
                    .FirstOrDefault(candidate =>
                        districtCandidates.Any(value =>
                        {
                            var left = NormalizeText(candidate.Name);
                            var right = NormalizeText(value);

                            return left == right ||
                                   right.StartsWith(left + " ") ||
                                   left.StartsWith(right + " ");
                        }));

                // Il merkezi icin geocoding cevabi bazen ilceyi
                // sadece sehir adi olarak dondurur. Katalogda "merkez"
                // varsa bunu guvenli fallback olarak kullan.
                if (district is null)
                {
                    var normalizedCityName = NormalizeText(city.Name);
                    var geocoderMentionsCity = districtCandidates.Any(value =>
                    {
                        var normalized = NormalizeText(value);
                        return normalized == normalizedCityName ||
                               normalized.StartsWith(normalizedCityName + " ");
                    });

                    if (geocoderMentionsCity)
                    {
                        district = city.Districts.FirstOrDefault(x =>
                            x.IsActive &&
                            NormalizeText(x.Name) == "merkez");
                    }
                }

                return Results.Ok(new
                {
                    found = district is not null,
                    citySlug = city.Slug,
                    cityName = city.Name,
                    districtSlug = district?.Slug,
                    districtName = district?.Name
                });
            }
            catch
            {
                return Results.Ok(new
                {
                    found = false,
                    citySlug = (string?)null,
                    cityName = (string?)null,
                    districtSlug = (string?)null,
                    districtName = (string?)null
                });
            }
        });

        group.MapGet("/", async (
            string? q,
            string? kategori,
            string? hizmet,
            string? il,
            string? ilce,
            int? limit,
            AppDbContext dbContext) =>
        {
            var take = Math.Clamp(limit ?? 5, 1, 10);
            var searchText = string.IsNullOrWhiteSpace(q) ? null : q.Trim();

            var categorySlug = NormalizeSlug(kategori);
            var serviceSlug = NormalizeSlug(hizmet);
            var citySlug = NormalizeSlug(il);
            var districtSlug = NormalizeSlug(ilce);

            var matchSource = "explicit";
            var matchConfidence = 1.0;
            string? matchedServiceName = null;
            string? matchedCategoryName = null;
            object[] alternatives = [];

            if (searchText is not null &&
                (citySlug is null || districtSlug is null))
            {
                var locationCatalog = await dbContext.Cities
                    .AsNoTracking()
                    .Where(x => x.IsActive)
                    .Include(x => x.Districts)
                    .OrderBy(x => x.SortOrder)
                    .ToListAsync();

                var normalizedInput = NormalizeText(searchText);

                if (citySlug is null)
                {
                    citySlug = locationCatalog
                        .Where(city =>
                            ContainsLocationPhrase(
                                normalizedInput,
                                NormalizeText(city.Name)))
                        .OrderByDescending(city => city.Name.Length)
                        .Select(city => city.Slug)
                        .FirstOrDefault();
                }

                if (districtSlug is null)
                {
                    var districtCandidates = locationCatalog
                        .Where(city =>
                            citySlug is null || city.Slug == citySlug)
                        .SelectMany(city => city.Districts
                            .Where(district => district.IsActive)
                            .Select(district => new
                            {
                                CitySlug = city.Slug,
                                district.Slug,
                                district.Name
                            }))
                        .Where(x =>
                            ContainsLocationPhrase(
                                normalizedInput,
                                NormalizeText(x.Name)))
                        .OrderByDescending(x => x.Name.Length)
                        .ToList();

                    var district = districtCandidates.FirstOrDefault();

                    if (district is not null)
                    {
                        districtSlug = district.Slug;
                        citySlug ??= district.CitySlug;
                    }
                }
            }

            if ((categorySlug is null || serviceSlug is null) &&
                searchText is not null)
            {
                var catalog = await dbContext.Categories
                    .AsNoTracking()
                    .Where(x => x.IsActive)
                    .Include(x => x.Services)
                    .OrderBy(x => x.SortOrder)
                    .ToListAsync();

                var matches = catalog
                    .SelectMany(category => category.Services
                        .Where(service => service.IsActive)
                        .Select(service =>
                        {
                            var serviceCandidateSlug = ToSlug(service.Name);
                            var score = NeedUnderstandingEngine.Score(
                                searchText,
                                category.Name,
                                service.Name,
                                serviceCandidateSlug);

                            return new ServiceMatch(
                                category.Slug,
                                category.Name,
                                serviceCandidateSlug,
                                service.Name,
                                score);
                        }))
                    .Where(x => x.Score > 0)
                    .OrderByDescending(x => x.Score)
                    .ThenBy(x => x.ServiceName)
                    .ToList();

                var best = matches.FirstOrDefault();

                if (best is not null)
                {
                    categorySlug ??= best.CategorySlug;
                    serviceSlug ??= best.ServiceSlug;
                    matchedCategoryName = best.CategoryName;
                    matchedServiceName = best.ServiceName;
                    matchSource = "inferred";

                    var secondScore = matches.Skip(1).FirstOrDefault()?.Score ?? 0;
                    matchConfidence = CalculateConfidence(best.Score, secondScore);

                    alternatives = matches
                        .Skip(1)
                        .Take(3)
                        .Select(x => (object)new
                        {
                            categorySlug = x.CategorySlug,
                            categoryName = x.CategoryName,
                            serviceSlug = x.ServiceSlug,
                            serviceName = x.ServiceName,
                            score = Math.Round(x.Score, 2)
                        })
                        .ToArray();
                }
                else
                {
                    matchSource = "unmatched";
                    matchConfidence = 0;
                }
            }

            if (matchedCategoryName is null && categorySlug is not null)
            {
                matchedCategoryName = await dbContext.Categories
                    .AsNoTracking()
                    .Where(x => x.Slug == categorySlug)
                    .Select(x => x.Name)
                    .FirstOrDefaultAsync();
            }

            if (matchedServiceName is null &&
                categorySlug is not null &&
                serviceSlug is not null)
            {
                var serviceNames = await dbContext.CategoryServices
                    .AsNoTracking()
                    .Where(x =>
                        x.Category.Slug == categorySlug &&
                        x.IsActive)
                    .Select(x => x.Name)
                    .ToListAsync();

                matchedServiceName = serviceNames
                    .FirstOrDefault(name => ToSlug(name) == serviceSlug);
            }

            var baseQuery = dbContext.Providers
                .AsNoTracking()
                .Where(x =>
                    x.IsActive &&
                    x.PublicationStatus == PublicationStatus.Published);

            if (citySlug is not null)
            {
                baseQuery = baseQuery.Where(x => x.CitySlug == citySlug);
            }

            if (searchText is not null && serviceSlug is null)
            {
                // Serbest metinden bir hizmet anlayamadıysak tüm işletmeleri
                // "yakın alternatif" olarak göstermek yanlış yönlendirir.
                baseQuery = baseQuery.Where(_ => false);
            }

            if (categorySlug is not null && serviceSlug is null)
            {
                baseQuery = baseQuery.Where(
                    x => x.CategorySlug == categorySlug);
            }

            var categoryProviders = await baseQuery
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.BusinessName,
                    x.ShortDescription,
                    x.Description,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.AdditionalServices,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.ExperienceYears,
                    x.EmergencyService,
                    x.OnsiteService
                })
                .ToListAsync();

            var exactProviders = serviceSlug is null
                ? categoryProviders
                : categoryProviders
                    .Where(x =>
                        x.ServiceSlug == serviceSlug ||
                        x.AdditionalServices.Contains(serviceSlug))
                    .ToList();

            // Bir hizmet algilandiysa sadece ana hizmet veya ek hizmet
            // olarak gercekten eslesen isletmeleri donduruyoruz.
            // Ayni kategoride olmak tek basina alternatif sayilmaz.
            var usedFallback = false;

            var providers = exactProviders;

            var providerIds = providers
                .Select(x => x.Id)
                .ToArray();

            var reviewStats = providerIds.Length == 0
                ? new Dictionary<Guid, ReviewScore>()
                : await dbContext.ProviderReviews
                    .AsNoTracking()
                    .Where(x => providerIds.Contains(x.ProviderId))
                    .GroupBy(x => x.ProviderId)
                    .Select(group => new
                    {
                        ProviderId = group.Key,
                        ReviewCount = group.Count(),
                        AverageRating =
                            group.Average(x => (double)x.Rating)
                    })
                    .ToDictionaryAsync(
                        x => x.ProviderId,
                        x => new ReviewScore(
                            x.ReviewCount,
                            x.AverageRating));

            var normalizedSearch = searchText is null
                ? null
                : NormalizeText(searchText);

            var recommendations = providers
                .Select(provider =>
                {
                    reviewStats.TryGetValue(
                        provider.Id,
                        out var review);

                    review ??= new ReviewScore(0, 0);

                    var score = 0d;
                    var reasons = new List<string>();
                    var matchLevel = "category-fallback";

                    if (serviceSlug is not null)
                    {
                        if (provider.ServiceSlug == serviceSlug)
                        {
                            score += 60;
                            matchLevel = "main-service";
                            reasons.Add("Aradığın hizmet işletmenin ana hizmeti");
                        }
                        else if (provider.AdditionalServices.Contains(serviceSlug))
                        {
                            score += 50;
                            matchLevel = "additional-service";
                            reasons.Add("Aradığın hizmet işletmenin ek hizmetleri arasında");
                        }
                        else if (usedFallback)
                        {
                            score += 10;
                            reasons.Add("Aynı kategoride yakın bir alternatif");
                        }
                    }

                    if (categorySlug is not null &&
                        provider.CategorySlug == categorySlug)
                    {
                        score += 18;
                        reasons.Add("İhtiyacınla aynı hizmet kategorisinde");
                    }

                    if (districtSlug is not null)
                    {
                        if (provider.DistrictSlug == districtSlug)
                        {
                            score += 32;
                            reasons.Add("Aradığın ilçede hizmet veriyor");
                        }
                        else if (citySlug is not null &&
                                 provider.CitySlug == citySlug)
                        {
                            score += 6;
                            reasons.Add("Aynı ilde hizmet veriyor");
                        }
                    }
                    else if (citySlug is not null &&
                             provider.CitySlug == citySlug)
                    {
                        score += 12;
                        reasons.Add("Aradığın ilde hizmet veriyor");
                    }

                    if (normalizedSearch is not null)
                    {
                        var providerText = NormalizeText(
                            string.Join(
                                " ",
                                provider.BusinessName,
                                provider.ShortDescription,
                                provider.Description ?? "",
                                provider.ServiceSlug,
                                string.Join(
                                    " ",
                                    provider.AdditionalServices)));

                        var overlap = CalculateTokenOverlap(
                            normalizedSearch,
                            providerText);

                        if (overlap > 0)
                        {
                            score += Math.Min(overlap * 2.5, 15);
                            reasons.Add("İhtiyaç açıklamanla güçlü benzerlik gösteriyor");
                        }
                    }

                    if (review.ReviewCount > 0)
                    {
                        score += review.AverageRating * 8;
                        score += Math.Min(review.ReviewCount, 50) * 0.6;

                        reasons.Add(
                            $"{review.AverageRating:0.0}/5 puan, {review.ReviewCount} değerlendirme");
                    }

                    if (provider.ExperienceYears is > 0)
                    {
                        score +=
                            Math.Min(
                                provider.ExperienceYears.Value,
                                20) * 0.5;

                        reasons.Add(
                            $"{provider.ExperienceYears} yıl deneyim");
                    }

                    if (provider.OnsiteService)
                    {
                        score += 3;
                        reasons.Add("Yerinde hizmet sunuyor");
                    }

                    if (provider.EmergencyService)
                    {
                        score += 2;
                        reasons.Add("Acil hizmet seçeneği var");
                    }

                    return new
                    {
                        provider.Id,
                        provider.Slug,
                        provider.BusinessName,
                        provider.ShortDescription,
                        provider.CategorySlug,
                        provider.ServiceSlug,
                        provider.AdditionalServices,
                        provider.CitySlug,
                        provider.DistrictSlug,
                        matchLevel,
                        averageRating =
                            Math.Round(
                                review.AverageRating,
                                1),
                        reviewCount = review.ReviewCount,
                        provider.ExperienceYears,
                        provider.EmergencyService,
                        provider.OnsiteService,
                        score = Math.Round(score, 2),
                        reasons = reasons
                            .Distinct()
                            .Take(6)
                            .ToArray()
                    };
                })
                .OrderByDescending(x => x.score)
                .ThenByDescending(x => x.averageRating)
                .ThenByDescending(x => x.reviewCount)
                .ThenBy(x => x.BusinessName)
                .Take(take)
                .ToList();

            return Results.Ok(new
            {
                understanding = new
                {
                    originalText = searchText,
                    source = matchSource,
                    confidence =
                        Math.Round(matchConfidence, 2),
                    categorySlug,
                    categoryName = matchedCategoryName,
                    serviceSlug,
                    serviceName = matchedServiceName,
                    alternatives
                },
                location = new
                {
                    citySlug,
                    districtSlug
                },
                matching = new
                {
                    exactServiceMatchFound =
                        exactProviders.Count > 0,
                    usedCategoryFallback = usedFallback,
                    exactCandidateCount =
                        exactProviders.Count,
                    categoryCandidateCount =
                        categoryProviders.Count
                },
                totalCandidates = providers.Count,
                recommendations
            });
        });

        return app;
    }

    private static double CalculateConfidence(
        double bestScore,
        double secondScore)
    {
        if (bestScore <= 0)
            return 0;

        var absolute =
            Math.Clamp(bestScore / 24.0, 0.35, 0.95);

        var margin = secondScore <= 0
            ? 0.25
            : Math.Clamp(
                (bestScore - secondScore) /
                Math.Max(bestScore, 1),
                0,
                0.25);

        return Math.Clamp(absolute + margin, 0, 0.98);
    }

    private static int CalculateTokenOverlap(
        string left,
        string right)
    {
        var leftTokens = GetMeaningfulTokens(left);
        var rightTokens = GetMeaningfulTokens(right);

        return leftTokens.Count(
            token => rightTokens.Contains(token));
    }

    private static double CalculateServiceMatchScore(
        string input,
        string categoryName,
        string serviceName,
        string serviceSlug)
    {
        var normalizedInput = NormalizeText(input);
        var normalizedService = NormalizeText(serviceName);
        var normalizedCategory = NormalizeText(categoryName);
        var inputTokens = GetMeaningfulTokens(normalizedInput);

        var score = 0d;

        if (ContainsWholePhrase(
            normalizedInput,
            normalizedService))
        {
            score += 14;
        }

        if (ContainsWholePhrase(
            normalizedInput,
            normalizedCategory))
        {
            score += 3;
        }

        foreach (var token in GetMeaningfulTokens(
                     normalizedService))
        {
            if (inputTokens.Contains(token))
            {
                score += 2.5;
            }
        }

        if (ServiceKeywords.TryGetValue(
            serviceSlug,
            out var keywords))
        {
            foreach (var keyword in keywords)
            {
                var normalizedKeyword =
                    NormalizeText(keyword.Value);

                if (ContainsWholePhrase(
                    normalizedInput,
                    normalizedKeyword))
                {
                    score += keyword.Weight;
                }
            }
        }

        var hasRepairIntent =
            RepairIntentWords.Any(word =>
                ContainsWholePhrase(
                    normalizedInput,
                    NormalizeText(word)));

        var hasEducationIntent =
            EducationIntentWords.Any(word =>
                ContainsWholePhrase(
                    normalizedInput,
                    NormalizeText(word)));

        var hasComputerWord =
            inputTokens.Any(token =>
                token.StartsWith("bilgisayar", StringComparison.OrdinalIgnoreCase) ||
                token.StartsWith("laptop", StringComparison.OrdinalIgnoreCase) ||
                token.StartsWith("notebook", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(token, "pc", StringComparison.OrdinalIgnoreCase));

        var hasPhoneWord =
            inputTokens.Any(token =>
                token.StartsWith("telefon", StringComparison.OrdinalIgnoreCase)) ||
            ContainsWholePhrase(normalizedInput, "cep telefonu");

        var hasVehicleWord =
            inputTokens.Any(token =>
                token.StartsWith("araba", StringComparison.OrdinalIgnoreCase) ||
                token.StartsWith("arac", StringComparison.OrdinalIgnoreCase) ||
                token.StartsWith("otomobil", StringComparison.OrdinalIgnoreCase)) ||
            ContainsWholePhrase(normalizedInput, "oto");

        if (serviceSlug == "bilgisayar-servisi")
        {
            if (hasComputerWord && hasRepairIntent)
                score += 12;

            if (hasEducationIntent)
                score -= 6;

            if (hasPhoneWord || hasVehicleWord)
                score -= 14;
        }

        if (serviceSlug == "telefon-tamiri")
        {
            if (hasPhoneWord)
                score += 12;

            if (hasPhoneWord && hasRepairIntent)
                score += 8;

            if (hasComputerWord || hasVehicleWord)
                score -= 10;
        }

        if (serviceSlug == "bilgisayar-egitimi")
        {
            if (hasEducationIntent)
                score += 8;

            if (hasRepairIntent)
                score -= 8;

            if (hasPhoneWord || hasVehicleWord)
                score -= 10;
        }

        if (serviceSlug == "oto-tamir")
        {
            if (hasVehicleWord)
                score += 12;

            if (hasVehicleWord && hasRepairIntent)
                score += 8;

            if (!hasVehicleWord && hasRepairIntent)
                score -= 5;

            if (hasComputerWord || hasPhoneWord)
                score -= 10;
        }

        return Math.Max(0, score);
    }

    private static HashSet<string> GetMeaningfulTokens(
        string value)
        => value
            .Split(
                ' ',
                StringSplitOptions.RemoveEmptyEntries |
                StringSplitOptions.TrimEntries)
            .Where(x => x.Length >= 3)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    private static bool ContainsLocationPhrase(
        string haystack,
        string location)
    {
        if (string.IsNullOrWhiteSpace(location))
            return false;

        return Regex.IsMatch(
            haystack,
            $@"(?:^|\s){Regex.Escape(location)}(?=$|\s|(?:de|da|den|dan|e|a|ye|ya)(?:$|\s))",
            RegexOptions.CultureInvariant);
    }
    private static bool ContainsWholePhrase(
        string haystack,
        string needle)
    {
        if (string.IsNullOrWhiteSpace(needle))
            return false;

        return Regex.IsMatch(
            haystack,
            $@"(?:^|\s){Regex.Escape(needle)}(?:$|\s)",
            RegexOptions.CultureInvariant);
    }

    private static string NormalizeText(string value)
    {
        var lowered = value
            .ToLower(new CultureInfo("tr-TR"))
            .Replace('ı', 'i')
            .Replace('ğ', 'g')
            .Replace('ü', 'u')
            .Replace('ş', 's')
            .Replace('ö', 'o')
            .Replace('ç', 'c');

        var normalized =
            lowered.Normalize(NormalizationForm.FormD);

        var builder = new StringBuilder();

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) !=
                UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        return Regex.Replace(
                builder
                    .ToString()
                    .Normalize(NormalizationForm.FormC),
                @"[^a-z0-9]+",
                " ")
            .Trim();
    }

    private static string ToSlug(string value)
        => NormalizeText(value).Replace(' ', '-');

    private static string? NormalizeSlug(string? value)
        => string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim().ToLowerInvariant();

    private static WeightedKeyword K(
        string value,
        double weight)
        => new(value, weight);

    private sealed record WeightedKeyword(
        string Value,
        double Weight);

    private sealed record ReviewScore(
        int ReviewCount,
        double AverageRating);

    private sealed record ServiceMatch(
        string CategorySlug,
        string CategoryName,
        string ServiceSlug,
        string ServiceName,
        double Score);
}
