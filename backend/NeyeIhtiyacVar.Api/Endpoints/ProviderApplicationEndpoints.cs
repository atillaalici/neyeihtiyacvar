using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderApplicationEndpoints
{
    public static IEndpointRouteBuilder MapProviderApplicationEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/provider-applications");

        group.MapPost("/", async (
            CreateProviderApplication request,
            AppDbContext dbContext) =>
        {
            var errors = await ValidateAsync(request, dbContext);

            if (errors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "GÃ¶nderilen baÅŸvuru bilgileri geÃ§erli deÄŸil.",
                    errors
                });
            }

            var moderation = ProviderContentModeration.Check(
                request.BusinessName,
                request.ShortDescription,
                request.PublicAddress,
                request.Note);

            var application = new ProviderApplication
            {
                BusinessName = request.BusinessName.Trim(),
                ShortDescription = request.ShortDescription.Trim(),
                CategorySlug = request.CategorySlug.Trim(),
                ServiceSlug = request.ServiceSlug.Trim(),
                CitySlug = request.CitySlug.Trim(),
                DistrictSlug = request.DistrictSlug.Trim(),
                PublicAddress = request.PublicAddress?.Trim(),
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                ApplicantName = request.ApplicantName.Trim(),
                Phone = request.Phone.Trim(),
                Whatsapp = Optional(request.Whatsapp),
                Note = Optional(request.Note),
                Status = ProviderApplicationStatus.Pending,
                ReviewNote = moderation.RequiresReview
                    ? "Otomatik içerik kontrolü: şüpheli içerik tespit edildi. Yönetici incelemesi zorunludur."
                    : null
            };

            dbContext.ProviderApplications.Add(application);
            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/provider-applications/{application.Id}",
                new
                {
                    application.Id,
                    status = application.Status.ToString().ToLowerInvariant(),
                    application.CreatedAtUtc
                });
        });

        return app;
    }

    public static IEndpointRouteBuilder MapAdminProviderWorkflowEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin");

        group.MapGet("/provider-applications", async (
            string? status,
            AppDbContext dbContext) =>
        {
            var query = dbContext.ProviderApplications.AsNoTracking();

            if (string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x =>
                    x.Status == ProviderApplicationStatus.Pending);
            }
            else if (Enum.TryParse<ProviderApplicationStatus>(
                status,
                true,
                out var parsedStatus))
            {
                query = query.Where(x => x.Status == parsedStatus);
            }

            var items = await query
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.BusinessName,
                    x.ShortDescription,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.ApplicantName,
                    x.Phone,
                    x.Whatsapp,
                    x.Note,
                    Email = dbContext.Providers
                        .Where(p => p.SourceApplicationId == x.Id && p.OwnerUserId != null)
                        .Join(
                            dbContext.Users,
                            p => p.OwnerUserId,
                            u => (Guid?)u.Id,
                            (p, u) => u.Email)
                        .FirstOrDefault(),
                    AdditionalServices = dbContext.Providers
                        .Where(p => p.SourceApplicationId == x.Id)
                        .Select(p => p.AdditionalServices)
                        .FirstOrDefault() ?? Array.Empty<string>(),
                    EmailVerified = dbContext.Providers
                        .Where(p => p.SourceApplicationId == x.Id && p.OwnerUserId != null)
                        .Join(
                            dbContext.Users,
                            p => p.OwnerUserId,
                            u => (Guid?)u.Id,
                            (p, u) => u.EmailVerifiedAtUtc)
                        .FirstOrDefault() != null,
                    PhoneVerified = dbContext.Providers
                        .Where(p => p.SourceApplicationId == x.Id && p.OwnerUserId != null)
                        .Join(
                            dbContext.Users,
                            p => p.OwnerUserId,
                            u => (Guid?)u.Id,
                            (p, u) => u.PhoneVerifiedAtUtc)
                        .FirstOrDefault() != null,
                    status = x.Status.ToString().ToLowerInvariant(),
                    x.ReviewNote,
                    x.ReviewedAtUtc,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    x.Version
                })
                .ToListAsync();

            return Results.Ok(items);
        });

        group.MapPost("/provider-applications/{id:guid}/approve", async (
            Guid id,
            ReviewProviderApplication request,
            AppDbContext dbContext) =>
        {
            var application = await dbContext.ProviderApplications
                .FirstOrDefaultAsync(x => x.Id == id);

            if (application is null)
            {
                return Results.NotFound(new
                {
                    message = "Ä°ÅŸletme baÅŸvurusu bulunamadÄ±."
                });
            }

            if (application.Status == ProviderApplicationStatus.Approved)
            {
                var existing = await dbContext.Providers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.SourceApplicationId == application.Id);

                return Results.Ok(new
                {
                    application.Id,
                    status = application.Status.ToString().ToLowerInvariant(),
                    providerId = existing?.Id,
                    providerSlug = existing?.Slug
                });
            }

            if (application.Status == ProviderApplicationStatus.Rejected)
            {
                return Results.BadRequest(new
                {
                    message = "ReddedilmiÅŸ baÅŸvuru doÄŸrudan onaylanamaz."
                });
            }

            var providerExists = await dbContext.Providers
                .AnyAsync(x => x.SourceApplicationId == application.Id);

            Provider? provider = null;

            if (!providerExists)
            {
                var baseSlug = ToSlug(application.BusinessName);
                var slug = await CreateUniqueProviderSlugAsync(
                    baseSlug,
                    dbContext);

                provider = new Provider
                {
                    SourceApplicationId = application.Id,
                    OwnerUserId = application.OwnerUserId,
                    Slug = slug,
                    BusinessName = application.BusinessName,
                    ShortDescription = application.ShortDescription,
                    CategorySlug = application.CategorySlug,
                    ServiceSlug = application.ServiceSlug,
                    AdditionalServices = [],
                    CitySlug = application.CitySlug,
                    DistrictSlug = application.DistrictSlug,
                PublicAddress = application.PublicAddress,
                Latitude = application.Latitude,
                Longitude = application.Longitude,
                    PublicPhone = application.Phone,
                    PublicWhatsapp = application.Whatsapp,
                    PublicationStatus = PublicationStatus.Draft,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow,
                    Version = 0
                };

                dbContext.Providers.Add(provider);
            }

            application.Status = ProviderApplicationStatus.Approved;
            application.ReviewNote = Optional(request.ReviewNote);
            application.ReviewedAtUtc = DateTime.UtcNow;
            application.UpdatedAtUtc = DateTime.UtcNow;
            application.Version++;

            await dbContext.SaveChangesAsync();

            provider ??= await dbContext.Providers
                .AsNoTracking()
                .FirstAsync(x => x.SourceApplicationId == application.Id);

            return Results.Ok(new
            {
                application.Id,
                status = application.Status.ToString().ToLowerInvariant(),
                providerId = provider.Id,
                providerSlug = provider.Slug,
                providerStatus = provider.PublicationStatus.ToString().ToLowerInvariant()
            });
        });

        group.MapPost("/provider-applications/{id:guid}/reject", async (
            Guid id,
            ReviewProviderApplication request,
            AppDbContext dbContext) =>
        {
            var application = await dbContext.ProviderApplications
                .FirstOrDefaultAsync(x => x.Id == id);

            if (application is null)
            {
                return Results.NotFound(new
                {
                    message = "Ä°ÅŸletme baÅŸvurusu bulunamadÄ±."
                });
            }

            if (application.Status == ProviderApplicationStatus.Approved)
            {
                return Results.BadRequest(new
                {
                    message = "OnaylanmÄ±ÅŸ baÅŸvuru reddedilemez."
                });
            }

            application.Status = ProviderApplicationStatus.Rejected;
            application.ReviewNote = Optional(request.ReviewNote);
            application.ReviewedAtUtc = DateTime.UtcNow;
            application.UpdatedAtUtc = DateTime.UtcNow;
            application.Version++;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                application.Id,
                status = application.Status.ToString().ToLowerInvariant()
            });
        });

        group.MapGet("/providers", async (
            string? status,
            bool? isActive,
            AppDbContext dbContext) =>
        {
            var query = dbContext.Providers.AsNoTracking();

            var activeFilter = isActive ?? true;
            query = query.Where(x => x.IsActive == activeFilter);

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<PublicationStatus>(
                    status,
                    true,
                    out var parsedStatus))
            {
                query = query.Where(x => x.PublicationStatus == parsedStatus);
            }

            var items = await query
                .OrderByDescending(x => x.UpdatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.SourceApplicationId,
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
                    publicationStatus = x.PublicationStatus.ToString().ToLowerInvariant(),
                    x.PublishedAtUtc,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    x.IsActive,
                    x.Version
                })
                .ToListAsync();

            return Results.Ok(items);
        });

        group.MapPut("/providers/{id:guid}", async (
            Guid id,
            UpdateProvider request,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Ä°ÅŸletme profili bulunamadÄ±."
                });
            }

            if (provider.Version != request.ExpectedVersion)
            {
                return Results.Conflict(new
                {
                    message = "Profil baÅŸka bir iÅŸlemle deÄŸiÅŸti. SayfayÄ± yenileyip tekrar deneyin."
                });
            }

            if (provider.PublicationStatus == PublicationStatus.Published)
            {
                return Results.BadRequest(new
                {
                    message = "YayÄ±ndaki profil Ã¶nce yayÄ±ndan kaldÄ±rÄ±lmalÄ±dÄ±r."
                });
            }

            var normalizedAdditionalServices = (request.AdditionalServices ?? Array.Empty<string>())
                .Select(x => x?.Trim() ?? string.Empty)
                .Where(x => x.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (normalizedAdditionalServices.Length > 1)
            {
                return Results.BadRequest(new
                {
                    message = "En fazla 1 ek hizmet seÃ§ebilirsiniz."
                });
            }

            if (normalizedAdditionalServices.Any(x =>
                string.Equals(
                    x,
                    request.ServiceSlug.Trim(),
                    StringComparison.OrdinalIgnoreCase)))
            {
                return Results.BadRequest(new
                {
                    message = "Ana hizmet ek hizmet olarak tekrar seÃ§ilemez."
                });
            }

            provider.BusinessName = request.BusinessName.Trim();
            provider.ShortDescription = request.ShortDescription.Trim();
            provider.Description = Optional(request.Description);
            provider.CategorySlug = request.CategorySlug.Trim();
            provider.ServiceSlug = request.ServiceSlug.Trim();
            provider.AdditionalServices = normalizedAdditionalServices;
            provider.CitySlug = request.CitySlug.Trim();
            provider.DistrictSlug = request.DistrictSlug.Trim();
            provider.PublicPhone = Optional(request.PublicPhone);
            provider.PublicWhatsapp = Optional(request.PublicWhatsapp);
            provider.PublicAddress = Optional(request.PublicAddress);
            provider.WorkingHours = Optional(request.WorkingHours);
            provider.ExperienceYears = request.ExperienceYears;
            provider.EmergencyService = request.EmergencyService;
            provider.OnsiteService = request.OnsiteService;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            await dbContext.SaveChangesAsync();

            return Results.Ok(ToAdminProvider(provider));
        });

        group.MapPost("/providers/{id:guid}/status", async (
            Guid id,
            ProviderActiveStatusRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Ä°ÅŸletme profili bulunamadÄ±."
                });
            }

            if (provider.IsActive == request.IsActive)
            {
                return Results.Ok(ToAdminProvider(provider));
            }

            provider.IsActive = request.IsActive;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            var statusAdminUserIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid? statusAdminUserId = Guid.TryParse(statusAdminUserIdValue, out var parsedStatusAdminId)
                ? parsedStatusAdminId
                : null;

            dbContext.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = statusAdminUserId,
                AdminEmail = principal.FindFirstValue(ClaimTypes.Email) ?? principal.Identity?.Name ?? "unknown",
                Action = request.IsActive ? "provider.activate" : "provider.deactivate",
                EntityType = "provider",
                EntityId = provider.Id.ToString(),
                EntityName = provider.BusinessName,
                Details = request.IsActive
                    ? $"Isletme aktif edildi: {provider.BusinessName}"
                    : $"Isletme pasife alindi: {provider.BusinessName}",
                CreatedAtUtc = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync();

            return Results.Ok(ToAdminProvider(provider));
        });
        group.MapPost("/providers/{id:guid}/publish", async (
            Guid id,
            VersionRequest request,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Ä°ÅŸletme profili bulunamadÄ±."
                });
            }

            if (provider.Version != request.ExpectedVersion)
            {
                return Results.Conflict(new
                {
                    message = "Profil baÅŸka bir iÅŸlemle deÄŸiÅŸti."
                });
            }

            if (provider.PublicationStatus == PublicationStatus.Published)
            {
                return Results.Ok(ToAdminProvider(provider));
            }

            if (provider.OwnerUserId is not null)
            {
                var ownerVerification = await dbContext.Users
                    .AsNoTracking()
                    .Where(x =>
                        x.Id == provider.OwnerUserId.Value &&
                        x.IsActive)
                    .Select(x => new
                    {
                        x.EmailVerifiedAtUtc,
                        x.PhoneVerifiedAtUtc
                    })
                    .FirstOrDefaultAsync();

                if (ownerVerification is null ||
                    ownerVerification.EmailVerifiedAtUtc is null)
                {
                    return Results.BadRequest(new
                    {
                        code = "business_verification_required",
                        message = "Ä°ÅŸletme yayÄ±na alÄ±nmadan Ã¶nce hesap sahibinin e-posta doÄŸrulamasÄ±nÄ± tamamlamasÄ± gerekir."
                    });
                }
            }

            var moderation = ProviderContentModeration.Check(
                provider.BusinessName,
                provider.ShortDescription,
                provider.Description,
                provider.PublicAddress,
                provider.WorkingHours);

            if (moderation.RequiresReview)
            {
                return Results.BadRequest(new
                {
                    code = "provider_content_review_required",
                    message = "İşletme profilinde yönetici incelemesi gerektiren içerik bulundu. İçerik düzeltilmeden yayınlanamaz."
                });
            }

            var publishedAtUtc = DateTime.UtcNow;

            provider.PublicationStatus = PublicationStatus.Published;
            provider.PublishedAtUtc = publishedAtUtc;
            provider.UpdatedAtUtc = publishedAtUtc;
            provider.Version++;

            await dbContext.SaveChangesAsync();

            var matchingNeeds = await dbContext.NeedRequests
                .AsNoTracking()
                .Where(x =>
                    x.IsActive &&
                    x.OwnerUserId != null &&
                    x.Status == NeedStatus.Open &&
                    (x.TrackingExpiresAtUtc ?? x.CreatedAtUtc.AddDays(7)) > publishedAtUtc &&
                    x.CitySlug == provider.CitySlug &&
                    x.DistrictSlug == provider.DistrictSlug &&
                    (
                        x.ServiceSlug == provider.ServiceSlug ||
                        (
                            x.ServiceSlug != null &&
                            provider.AdditionalServices.Contains(x.ServiceSlug)
                        )
                    ))
                .Select(x => new
                {
                    x.Id,
                    UserId = x.OwnerUserId!.Value,
                    x.Title
                })
                .ToListAsync();

            if (matchingNeeds.Count > 0)
            {
                const string eventType = "need.provider-match";

                var matchingNeedIds = matchingNeeds
                    .Select(x => x.Id.ToString())
                    .ToArray();

                var existingLinks = await dbContext.Notifications
                    .AsNoTracking()
                    .Where(x =>
                        x.EventType == eventType &&
                        matchingNeeds.Select(n => n.UserId).Contains(x.UserId) &&
                        x.Link != null)
                    .Select(x => new
                    {
                        x.UserId,
                        x.Link
                    })
                    .ToListAsync();

                var existingKeys = existingLinks
                    .Select(x => $"{x.UserId:N}|{x.Link}")
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                foreach (var need in matchingNeeds)
                {
                    var link =
                        $"/kesfet?q={Uri.EscapeDataString(need.Title)}" +
                        $"&needId={need.Id}" +
                        $"&provider={Uri.EscapeDataString(provider.Slug)}";

                    var key = $"{need.UserId:N}|{link}";

                    if (existingKeys.Contains(key))
                    {
                        continue;
                    }

                    dbContext.Notifications.Add(new Notification
                    {
                        UserId = need.UserId,
                        EventType = eventType,
                        Title = "Talebine uygun iÅŸletme bulundu",
                        Message =
                            $"{provider.BusinessName} \"{need.Title}\" talebinizi karÅŸÄ±layabilir. Uygun iÅŸletmeleri gÃ¶rmek iÃ§in dokunun.",
                        Link = link,
                        IsRead = false,
                        CreatedAtUtc = publishedAtUtc
                    });

                    existingKeys.Add(key);
                }

                await dbContext.SaveChangesAsync();
            }

            return Results.Ok(ToAdminProvider(provider));
        });

        group.MapPost("/providers/{id:guid}/unpublish", async (
            Guid id,
            VersionRequest request,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Ä°ÅŸletme profili bulunamadÄ±."
                });
            }

            if (provider.Version != request.ExpectedVersion)
            {
                return Results.Conflict(new
                {
                    message = "Profil baÅŸka bir iÅŸlemle deÄŸiÅŸti."
                });
            }

            provider.PublicationStatus = PublicationStatus.Unpublished;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            await dbContext.SaveChangesAsync();

            return Results.Ok(ToAdminProvider(provider));
        });

        return app;
    }

    private static async Task<Dictionary<string, string[]>> ValidateAsync(
        CreateProviderApplication request,
        AppDbContext dbContext)
    {
        var errors = new Dictionary<string, string[]>();

        Required(errors, "businessName", request.BusinessName, 200, "Ä°ÅŸletme adÄ±");
        Required(errors, "shortDescription", request.ShortDescription, 300, "KÄ±sa aÃ§Ä±klama");
        Required(errors, "categorySlug", request.CategorySlug, 100, "Kategori");
        Required(errors, "serviceSlug", request.ServiceSlug, 150, "Hizmet");
Required(errors, "citySlug", request.CitySlug, 100, "Ä°l");
        Required(errors, "districtSlug", request.DistrictSlug, 100, "Ä°lÃ§e");
        Required(errors, "applicantName", request.ApplicantName, 150, "BaÅŸvuran adÄ±");
        Required(errors, "phone", request.Phone, 30, "Telefon");

        if (errors.Count > 0)
        {
            return errors;
        }

        var categoryExists = await dbContext.Categories
            .AsNoTracking()
            .AnyAsync(x => x.Slug == request.CategorySlug && x.IsActive);

        if (!categoryExists)
        {
            errors["categorySlug"] = ["GeÃ§erli bir kategori seÃ§in."];
        }

        var city = await dbContext.Cities
            .AsNoTracking()
            .Include(x => x.Districts)
            .FirstOrDefaultAsync(x => x.Slug == request.CitySlug && x.IsActive);

        if (city is null)
        {
            errors["citySlug"] = ["GeÃ§erli bir il seÃ§in."];
        }
        else if (!city.Districts.Any(x =>
                     x.Slug == request.DistrictSlug &&
                     x.IsActive))
        {
            errors["districtSlug"] = ["SeÃ§ilen ilÃ§enin ile ait olduÄŸunu kontrol edin."];
        }

        return errors;
    }

    private static void Required(
        Dictionary<string, string[]> errors,
        string key,
        string? value,
        int maxLength,
        string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{label} zorunludur."];
        }
        else if (value.Trim().Length > maxLength)
        {
            errors[key] = [$"{label} en fazla {maxLength} karakter olabilir."];
        }
    }

    private static string? Optional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static async Task<string> CreateUniqueProviderSlugAsync(
        string baseSlug,
        AppDbContext dbContext)
    {
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = "isletme";
        }

        var candidate = baseSlug;
        var suffix = 2;

        while (await dbContext.Providers.AnyAsync(x => x.Slug == candidate))
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        }

        return candidate;
    }

    private static string ToSlug(string value)
    {
        value = value
            .Replace('\u0131', 'i')
            .Replace('\u0130', 'I')
            .Replace('\u011F', 'g')
            .Replace('\u011E', 'G')
            .Replace('\u00FC', 'u')
            .Replace('\u00DC', 'U')
            .Replace('\u015F', 's')
            .Replace('\u015E', 'S')
            .Replace('\u00F6', 'o')
            .Replace('\u00D6', 'O')
            .Replace('\u00E7', 'c')
            .Replace('\u00C7', 'C');

        var normalized = value
            .Normalize(NormalizationForm.FormD);

        var builder = new StringBuilder();

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) !=
                UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        var ascii = builder
            .ToString()
            .Normalize(NormalizationForm.FormC)
            .ToLowerInvariant();

        ascii = Regex.Replace(ascii, "[^a-z0-9]+", "-");

        return ascii.Trim('-');
    }

    private static object ToAdminProvider(Provider provider)
        => new
        {
            provider.Id,
            provider.SourceApplicationId,
            provider.Slug,
            provider.BusinessName,
            provider.ShortDescription,
            provider.Description,
            provider.CategorySlug,
            provider.ServiceSlug,
            provider.AdditionalServices,
            provider.CitySlug,
            provider.DistrictSlug,
            provider.PublicPhone,
            provider.PublicWhatsapp,
            provider.PublicAddress,
            provider.WorkingHours,
            provider.ExperienceYears,
            provider.EmergencyService,
            provider.OnsiteService,
            publicationStatus = provider.PublicationStatus.ToString().ToLowerInvariant(),
            provider.PublishedAtUtc,
            provider.CreatedAtUtc,
            provider.UpdatedAtUtc,
            provider.IsActive,
            provider.Version
        };
}

public sealed record CreateProviderApplication(
    string BusinessName,
    string ShortDescription,
    string CategorySlug,
    string ServiceSlug,
    string CitySlug,
    string DistrictSlug,
    string ApplicantName,
    string Phone,
    string? Whatsapp,
    string? Note,
    string? PublicAddress,
    double? Latitude,
    double? Longitude);

public sealed record ReviewProviderApplication(
    string? ReviewNote);

public sealed record VersionRequest(
    int ExpectedVersion);

public sealed record UpdateProvider(
    int ExpectedVersion,
    string BusinessName,
    string ShortDescription,
    string? Description,
    string CategorySlug,
    string ServiceSlug,
    string[] AdditionalServices,
    string CitySlug,
    string DistrictSlug,
    string? PublicPhone,
    string? PublicWhatsapp,
    string? PublicAddress,
    double? Latitude,
    double? Longitude,
    string? WorkingHours,
    int? ExperienceYears,
    bool EmergencyService,
    bool OnsiteService);

public sealed record ProviderActiveStatusRequest(
    bool IsActive);




