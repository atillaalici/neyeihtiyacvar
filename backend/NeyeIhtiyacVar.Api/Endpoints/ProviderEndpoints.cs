using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderEndpoints
{
    public static IEndpointRouteBuilder MapProviderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/providers");

        group.MapGet("/", async (
            string? q,
            string? il,
            string? ilce,
            string? kategori,
            string? hizmet,
            double? lat,
            double? lon,
            AppDbContext dbContext,
            HttpContext httpContext) =>
        {
            var canViewContact =
                httpContext.User.Identity?.IsAuthenticated == true;

            var query = dbContext.Providers
                .AsNoTracking()
                .Where(x => x.PublicationStatus == PublicationStatus.Published);

            if (!string.IsNullOrWhiteSpace(il))
            {
                query = query.Where(x => x.CitySlug == il.Trim());
            }

            if (!string.IsNullOrWhiteSpace(ilce))
            {
                query = query.Where(x => x.DistrictSlug == ilce.Trim());
            }

            if (!string.IsNullOrWhiteSpace(hizmet))
            {
                var requestedService = hizmet.Trim().ToLowerInvariant();

                var compatibleServices = requestedService switch
                {
                    "hafriyat-isleri" => new[] { "hafriyat-isleri", "hafriyat" },
                    "hafriyat" => new[] { "hafriyat", "hafriyat-isleri" },
                    _ => new[] { requestedService }
                };

                query = query.Where(x =>
                    compatibleServices.Contains(x.ServiceSlug) ||
                    x.AdditionalServices.Any(additionalService =>
                        compatibleServices.Contains(additionalService)));
            }
            else if (!string.IsNullOrWhiteSpace(kategori))
            {
                var requestedCategory = kategori.Trim().ToLowerInvariant();

                var compatibleCategories = requestedCategory switch
                {
                    "nakliye-ve-hafriyat" => new[] { "nakliye-ve-hafriyat", "nakliye-tasima" },
                    "nakliye-hafriyat" => new[] { "nakliye-hafriyat", "nakliye-tasima" },
                    "nakliye-tasima" => new[] { "nakliye-tasima", "nakliye-ve-hafriyat", "nakliye-hafriyat" },
                    "teknoloji-yazilim" => new[] { "teknoloji-yazilim", "teknoloji" },
                    "teknoloji" => new[] { "teknoloji", "teknoloji-yazilim" },
                    _ => new[] { requestedCategory }
                };

                query = query.Where(x => compatibleCategories.Contains(x.CategorySlug));
            }

            if (!string.IsNullOrWhiteSpace(q))
            {
                var cleanQuery = q.Trim();
                var search = $"%{cleanQuery}%";

                var detectedServiceSlugs =
                    SearchIntentResolver.ResolveServiceSlugs(
                        cleanQuery)
                    .ToArray();

                query = query.Where(x =>
                    EF.Functions.ILike(
                        x.BusinessName,
                        search) ||
                    EF.Functions.ILike(
                        x.ShortDescription,
                        search) ||
                    (x.Description != null &&
                     EF.Functions.ILike(
                         x.Description,
                         search)) ||
                    EF.Functions.ILike(
                        x.CategorySlug,
                        search) ||
                    EF.Functions.ILike(
                        x.ServiceSlug,
                        search) ||
                    (
                        detectedServiceSlugs.Length > 0 &&
                        (
                            detectedServiceSlugs.Contains(x.ServiceSlug) ||
                            x.AdditionalServices.Any(additionalService =>
                                detectedServiceSlugs.Contains(additionalService))
                        )
                    ));
            }

            var providers = await query
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.BusinessName,
                    x.ShortDescription,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.AdditionalServices,
                    x.CitySlug,
                    x.DistrictSlug,
                    PublicPhone = canViewContact ? x.PublicPhone : null,
                    PublicWhatsapp = canViewContact ? x.PublicWhatsapp : null,
                    x.Latitude,
                    x.Longitude,
                    x.PublishedAtUtc,
                    isVerifiedBusiness =
                        x.OwnerUserId != null &&
                        x.OwnerUser != null &&
                        x.OwnerUser.EmailVerifiedAtUtc != null,
                    publicationStatus = x.PublicationStatus.ToString().ToLowerInvariant()
                })
                .ToListAsync();

            var hasValidCoordinates =
                lat.HasValue &&
                lon.HasValue &&
                lat.Value >= -90 &&
                lat.Value <= 90 &&
                lon.Value >= -180 &&
                lon.Value <= 180;

            var result = providers
                .Select(x =>
                {
                    double? distanceKm = null;

                    if (hasValidCoordinates &&
                        x.Latitude.HasValue &&
                        x.Longitude.HasValue)
                    {
                        distanceKm = CalculateDistanceKm(
                            lat!.Value,
                            lon!.Value,
                            x.Latitude.Value,
                            x.Longitude.Value);
                    }

                    return new
                    {
                        x.Id,
                        x.Slug,
                        x.BusinessName,
                        x.ShortDescription,
                        x.CategorySlug,
                        x.ServiceSlug,
                        x.AdditionalServices,
                        x.CitySlug,
                        x.DistrictSlug,
                        x.PublicPhone,
                        x.PublicWhatsapp,
                        x.Latitude,
                        x.Longitude,
                        distanceKm,
                        x.isVerifiedBusiness,
                        x.publicationStatus,
                        x.PublishedAtUtc
                    };
                });

            var ordered = hasValidCoordinates
                ? result
                    .OrderBy(x => x.distanceKm.HasValue ? 0 : 1)
                    .ThenBy(x => x.distanceKm ?? double.MaxValue)
                    .ThenBy(x => x.BusinessName)
                : result
                    .OrderByDescending(x => x.PublishedAtUtc)
                    .ThenBy(x => x.BusinessName);

            return Results.Ok(
                ordered.Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.BusinessName,
                    x.ShortDescription,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.AdditionalServices,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.PublicPhone,
                    x.PublicWhatsapp,
                    x.Latitude,
                    x.Longitude,
                    x.distanceKm,
                    x.isVerifiedBusiness,
                    x.publicationStatus
                }));
        });

        group.MapGet("/{slug}", async (
            string slug,
            AppDbContext dbContext,
            HttpContext httpContext) =>
        {
            var canViewContact =
                httpContext.User.Identity?.IsAuthenticated == true;

            var provider = await dbContext.Providers
                .AsNoTracking()
                .Where(x =>
                    x.Slug == slug &&
                    x.PublicationStatus == PublicationStatus.Published)
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
                    PublicPhone = canViewContact ? x.PublicPhone : null,
                    PublicWhatsapp = canViewContact ? x.PublicWhatsapp : null,
                    x.PublicAddress,
                    x.Latitude,
                    x.Longitude,
                    x.WorkingHours,
                    x.ExperienceYears,
                    x.EmergencyService,
                    x.OnsiteService,
                    isVerifiedBusiness =
                        x.OwnerUserId != null &&
                        x.OwnerUser != null &&
                        x.OwnerUser.EmailVerifiedAtUtc != null,
                    publicationStatus = x.PublicationStatus.ToString().ToLowerInvariant()
                })
                .FirstOrDefaultAsync();

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme profili bulunamadı."
                });
            }

            return Results.Ok(provider);
        });

        return app;
    }

    private static double CalculateDistanceKm(
        double latitude1,
        double longitude1,
        double latitude2,
        double longitude2)
    {
        const double earthRadiusKm = 6371.0088;

        var latitudeDelta =
            DegreesToRadians(latitude2 - latitude1);
        var longitudeDelta =
            DegreesToRadians(longitude2 - longitude1);

        var lat1 = DegreesToRadians(latitude1);
        var lat2 = DegreesToRadians(latitude2);

        var a =
            Math.Sin(latitudeDelta / 2) *
            Math.Sin(latitudeDelta / 2) +
            Math.Cos(lat1) *
            Math.Cos(lat2) *
            Math.Sin(longitudeDelta / 2) *
            Math.Sin(longitudeDelta / 2);

        var c = 2 * Math.Atan2(
            Math.Sqrt(a),
            Math.Sqrt(1 - a));

        return Math.Round(earthRadiusKm * c, 1);
    }

    private static double DegreesToRadians(double degrees)
    {
        return degrees * Math.PI / 180;
    }
}
