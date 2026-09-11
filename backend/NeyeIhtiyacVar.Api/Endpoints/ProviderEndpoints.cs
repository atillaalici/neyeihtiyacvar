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
            AppDbContext dbContext) =>
        {
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

            if (!string.IsNullOrWhiteSpace(kategori))
            {
                query = query.Where(x => x.CategorySlug == kategori.Trim());
            }

            if (!string.IsNullOrWhiteSpace(hizmet))
            {
                query = query.Where(x => x.ServiceSlug == hizmet.Trim());
            }

            if (!string.IsNullOrWhiteSpace(q))
            {
                var search = $"%{q.Trim()}%";

                query = query.Where(x =>
                    EF.Functions.ILike(x.BusinessName, search) ||
                    EF.Functions.ILike(x.ShortDescription, search) ||
                    (x.Description != null && EF.Functions.ILike(x.Description, search)));
            }

            var providers = await query
                .OrderByDescending(x => x.PublishedAtUtc)
                .ThenBy(x => x.BusinessName)
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.BusinessName,
                    x.ShortDescription,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.PublicPhone,
                    x.PublicWhatsapp,
                    isVerifiedBusiness =
                        x.OwnerUserId != null &&
                        x.OwnerUser != null &&
                        x.OwnerUser.EmailVerifiedAtUtc != null &&
                        x.OwnerUser.PhoneVerifiedAtUtc != null,
                    publicationStatus = x.PublicationStatus.ToString().ToLowerInvariant()
                })
                .ToListAsync();

            return Results.Ok(providers);
        });

        group.MapGet("/{slug}", async (
            string slug,
            AppDbContext dbContext) =>
        {
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
                    x.PublicPhone,
                    x.PublicWhatsapp,
                    x.PublicAddress,
                    x.WorkingHours,
                    x.ExperienceYears,
                    x.EmergencyService,
                    x.OnsiteService,
                    isVerifiedBusiness =
                        x.OwnerUserId != null &&
                        x.OwnerUser != null &&
                        x.OwnerUser.EmailVerifiedAtUtc != null &&
                        x.OwnerUser.PhoneVerifiedAtUtc != null,
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
}
