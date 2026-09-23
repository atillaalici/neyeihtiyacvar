using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Notifications;

using NeyeIhtiyacVar.Api.Infrastructure.Email;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderPanelEndpoints
{
    public static IEndpointRouteBuilder MapProviderPanelEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/provider-panel")
            .RequireAuthorization();

        group.MapGet("/me", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba baÄŸlÄ± iÅŸletme bulunamadÄ±."
                });
            }

            var matchedNeedCount = await dbContext.NeedRequests
                .AsNoTracking()
                .CountAsync(x =>
                    x.IsActive &&
                    x.Status != NeedStatus.Cancelled &&
                    x.TargetProviderId == provider.Id);

            return Results.Ok(ToPanelProfile(provider, matchedNeedCount));
        });

        group.MapPut("/me", async (
            UpdateOwnProviderRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba baÄŸlÄ± iÅŸletme bulunamadÄ±."
                });
            }

            if (request.ExpectedVersion != provider.Version)
            {
                return Results.Conflict(new
                {
                    message = "Ä°ÅŸletme profili baÅŸka bir iÅŸlemde deÄŸiÅŸti. SayfayÄ± yenileyip tekrar deneyin.",
                    currentVersion = provider.Version
                });
            }

            var errors = ValidateOwnUpdate(request);

            var categorySlug =
                NormalizeProviderCategorySlug(
                    request.CategorySlug?.Trim() ?? string.Empty);
            var serviceSlug =
                NormalizeProviderServiceSlug(
                    request.ServiceSlug?.Trim() ?? string.Empty);

            var category = await dbContext.Categories
                .AsNoTracking()
                .Include(x => x.Services)
                .FirstOrDefaultAsync(x =>
                    x.IsActive &&
                    x.Slug == categorySlug);

            if (category is null)
            {
                errors["categorySlug"] =
                    ["GeÃ§erli bir ana kategori seÃ§in."];
            }

            var categoryServiceSlugs = category is null
                ? new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase)
                : category.Services
                    .Where(x => x.IsActive)
                    .Select(x => ToSlug(x.Name))
                    .ToHashSet(
                        StringComparer.OrdinalIgnoreCase);

            if (string.IsNullOrWhiteSpace(serviceSlug) ||
                !categoryServiceSlugs.Contains(serviceSlug))
            {
                errors["serviceSlug"] =
                    ["Ana hizmet seÃ§ilen kategoriye ait olmalÄ±dÄ±r."];
            }
            var normalizedAdditionalServices =
                (request.AdditionalServices ?? [])
                    .Select(x =>
                        x?.Trim().ToLowerInvariant()
                        ?? string.Empty)
                    .Where(x => x.Length > 0)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();

            if (normalizedAdditionalServices.Length > 1)
            {
                errors["additionalServices"] =
                    ["En fazla 1 adet 2. Hizmet seÃ§ebilirsiniz."];
            }

            var secondCategorySlug =
                request.AdditionalCategorySlug?.Trim() ?? string.Empty;
            var secondServiceSlug =
                normalizedAdditionalServices.FirstOrDefault() ?? string.Empty;

            var hasSecondCategory =
                !string.IsNullOrWhiteSpace(secondCategorySlug);
            var hasSecondService =
                !string.IsNullOrWhiteSpace(secondServiceSlug);

            if (hasSecondCategory != hasSecondService)
            {
                errors["additionalServices"] =
                    ["2. Hizmet iÃ§in hem ana kategori hem ana hizmet seÃ§ilmelidir."];
            }
            else if (hasSecondService)
            {
                var secondCategory = await dbContext.Categories
                    .AsNoTracking()
                    .Include(x => x.Services)
                    .FirstOrDefaultAsync(x =>
                        x.IsActive &&
                        x.Slug == secondCategorySlug);

                if (secondCategory is null)
                {
                    errors["additionalCategorySlug"] =
                        ["2. Hizmet iÃ§in geÃ§erli bir ana kategori seÃ§in."];
                }
                else
                {
                    var secondServiceSlugs = secondCategory.Services
                        .Where(x => x.IsActive)
                        .Select(x => ToSlug(x.Name))
                        .ToHashSet(StringComparer.OrdinalIgnoreCase);

                    if (!secondServiceSlugs.Contains(secondServiceSlug))
                    {
                        errors["additionalServices"] =
                            ["2. Hizmet seÃ§ilen 2. kategoriye ait olmalÄ±dÄ±r."];
                    }
                }

                if (string.Equals(
                        secondServiceSlug,
                        serviceSlug,
                        StringComparison.OrdinalIgnoreCase))
                {
                    errors["additionalServices"] =
                        ["1. Hizmet ile 2. Hizmet aynÄ± olamaz."];
                }
            }

            if (errors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "GÃ¶nderilen bilgiler geÃ§erli deÄŸil.",
                    errors
                });
            }

            var moderation = ProviderContentModeration.Check(
                provider.BusinessName,
                provider.ShortDescription,
                request.Description,
                request.PublicAddress,
                request.WorkingHours);

            var previousAdditionalServices =
                provider.AdditionalServices
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

            provider.CategorySlug = categorySlug;
            provider.ServiceSlug = serviceSlug;
            provider.Description = Optional(request.Description);
            provider.AdditionalServices = normalizedAdditionalServices;
            provider.PublicPhone = Optional(request.PublicPhone);
            provider.PublicWhatsapp = Optional(request.PublicWhatsapp);
            provider.CitySlug = Optional(request.CitySlug) ?? provider.CitySlug;
            provider.DistrictSlug = Optional(request.DistrictSlug) ?? provider.DistrictSlug;
            provider.PublicAddress = Optional(request.PublicAddress);
            provider.Latitude = request.Latitude;
            provider.Longitude = request.Longitude;
            provider.WorkingHours = Optional(request.WorkingHours);
            provider.ExperienceYears = request.ExperienceYears;
            provider.EmergencyService = request.EmergencyService;
            provider.OnsiteService = request.OnsiteService;

            if (moderation.RequiresReview &&
                provider.PublicationStatus == PublicationStatus.Published)
            {
                provider.PublicationStatus = PublicationStatus.Unpublished;
                provider.PublishedAtUtc = null;
            }

            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            var newlyAddedServices =
                provider.AdditionalServices
                    .Where(x => !previousAdditionalServices.Contains(x))
                    .ToArray();

            if (newlyAddedServices.Length > 0)
            {
                await TrackedNeedMatchNotifier.NotifyForProviderAsync(
                    dbContext,
                    provider,
                    newlyAddedServices);
            }
            await dbContext.SaveChangesAsync();

            var matchedNeedCount = await dbContext.NeedRequests
                .AsNoTracking()
                .CountAsync(x =>
                    x.IsActive &&
                    x.Status != NeedStatus.Cancelled &&
                    x.TargetProviderId == provider.Id);

            return Results.Ok(ToPanelProfile(provider, matchedNeedCount));
        });

        group.MapPut("/me/business", async (
            UpdateOwnProviderBusinessRequest request,
            ClaimsPrincipal principal,
            IEmailSender emailSender,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
                return Results.Unauthorized();

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
                return Results.NotFound(new { message = "Bu hesaba bağlı işletme bulunamadı." });

            if (request.ExpectedVersion != provider.Version)
                return Results.Conflict(new
                {
                    message = "İşletme bilgileri başka bir işlemde değişti. Sayfayı yenileyip tekrar deneyin.",
                    currentVersion = provider.Version
                });

            var businessName = request.BusinessName?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(businessName))
                return Results.BadRequest(new { message = "İşletme adı zorunludur." });
            if (businessName.Length > 200)
                return Results.BadRequest(new { message = "İşletme adı en fazla 200 karakter olabilir." });
            if (request.Description?.Trim().Length > 4000)
                return Results.BadRequest(new { message = "Açıklama en fazla 4000 karakter olabilir." });
            if (request.PublicPhone?.Trim().Length > 30)
                return Results.BadRequest(new { message = "Telefon en fazla 30 karakter olabilir." });
            if (request.PublicWhatsapp?.Trim().Length > 30)
                return Results.BadRequest(new { message = "WhatsApp numarası en fazla 30 karakter olabilir." });

            var moderation = ProviderContentModeration.Check(businessName, request.Description);

            provider.BusinessName = businessName;
            provider.Description = Optional(request.Description);
            provider.PublicPhone = Optional(request.PublicPhone);
            provider.PublicWhatsapp = Optional(request.PublicWhatsapp);
            if (moderation.RequiresReview)
            {
                provider.ModerationViolationCount++;
                if (provider.OwnerUserId is Guid moderationOwnerUserId)
                {
                    var moderationOwner = await dbContext.Users.AsNoTracking()
                        .Where(x => x.Id == moderationOwnerUserId)
                        .Select(x => new { x.Email, x.DisplayName }).FirstOrDefaultAsync();
                    if (moderationOwner is not null && !string.IsNullOrWhiteSpace(moderationOwner.Email))
                    {
                        _ = await emailSender.SendModerationNoticeAsync(
                            moderationOwner.Email,
                            moderationOwner.DisplayName ?? provider.BusinessName,
                            provider.BusinessName,
                            provider.LastModerationViolationReason ?? "Yasaklı veya kısıtlı içerik tespit edildi.",
                            provider.ModerationViolationCount,
                            provider.ModerationTerminated);
                    }
                }

                provider.LastModerationViolationAtUtc = DateTime.UtcNow;
                provider.LastModerationViolationReason =
                    $"[{moderation.Code}] {moderation.Reason} | Dayanak: {moderation.LegalBasis}";
                provider.PublicationStatus = PublicationStatus.Unpublished;
                provider.PublishedAtUtc = null;

                // 3. tespitte otomatik kalıcı silme YOK: hesap fesih/pasif durumuna alınır.
                // Yanlış pozitiflerde verinin geri döndürülebilmesi için kayıt korunur.
                if (provider.ModerationViolationCount >= 3)
                {
                    provider.IsActive = false;
                    provider.ModerationTerminated = true;
                }

                if (provider.SourceApplicationId is Guid applicationId)
                {
                    var application = await dbContext.ProviderApplications
                        .FirstOrDefaultAsync(x => x.Id == applicationId);
                    if (application is not null)
                    {
                        application.Status = ProviderApplicationStatus.Pending;
                        application.ReviewNote =
                            $"[OTOMATİK MODERASYON] İhlal {provider.ModerationViolationCount}/3. " +
                            $"{moderation.Reason} Dayanak: {moderation.LegalBasis}";
                        application.ReviewedAtUtc = null;
                        application.UpdatedAtUtc = DateTime.UtcNow;
                        application.Version++;
                    }
                }

                // İşletme sahibinin panel bildirim kaydı.
                if (provider.OwnerUserId is Guid ownerId)
                {
                    dbContext.Notifications.Add(new Notification
                    {
                        UserId = ownerId,
                        EventType = "provider.moderation-violation",
                        Title = provider.ModerationTerminated
                            ? "İşletme hesabınız fesih durumuna alındı"
                            : "İşletmeniz moderasyon nedeniyle pasife alındı",
                        Message = provider.ModerationTerminated
                            ? $"Yasaklı/kısıtlı içerik politikası kapsamında 3. ihlal tespit edildi. İşletme hesabınız pasife alınarak fesih incelemesine alındı. Neden: {moderation.Reason}"
                            : $"Yasaklı/kısıtlı içerik politikası kapsamında {provider.ModerationViolationCount}/3 ihlal tespit edildi. İşletmeniz pasife alındı. Neden: {moderation.Reason}",
                        Link = "/hesabim",
                        CreatedAtUtc = DateTime.UtcNow
                    });
                }
            }

            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = moderation.RequiresReview ? provider.ModerationTerminated
                    ? "3. moderasyon ihlali tespit edildi. İşletme hesabı pasife alınarak fesih incelemesine alındı."
                    : $"Yasaklı/kısıtlı içerik tespit edildi. İşletme pasife alındı ve yönetici incelemesine gönderildi. İhlal: {provider.ModerationViolationCount}/3." : "İşletme bilgileri kaydedildi.",
                provider.BusinessName,
                provider.Description,
                provider.PublicPhone,
                provider.PublicWhatsapp,
                provider.Version
            });
        });

        group.MapPut("/me/catalog", async (
            UpdateOwnProviderCatalogRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId)) return Results.Unauthorized();
            var provider = await dbContext.Providers.FirstOrDefaultAsync(x => x.OwnerUserId == userId);
            if (provider is null) return Results.NotFound(new { message = "Bu hesaba bağlı işletme bulunamadı." });
            if (request.ExpectedVersion != provider.Version)
                return Results.Conflict(new { message = "İşletme profili başka bir işlemde değişti. Sayfayı yenileyip tekrar deneyin.", currentVersion = provider.Version });

            var categorySlug = NormalizeProviderCategorySlug(request.CategorySlug ?? "");
            var serviceSlug = NormalizeProviderServiceSlug(request.ServiceSlug ?? "");
            var category = await dbContext.Categories.AsNoTracking().Include(x => x.Services)
                .FirstOrDefaultAsync(x => x.IsActive && x.Slug == categorySlug);
            if (category is null) return Results.BadRequest(new { message = "Geçerli bir ana kategori seçin." });

            var serviceSlugs = category.Services.Where(x => x.IsActive).Select(x => ToSlug(x.Name))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (!serviceSlugs.Contains(serviceSlug))
                return Results.BadRequest(new { message = "Ana hizmet seçilen kategoriye ait olmalıdır." });

            var secondCategorySlug = request.AdditionalCategorySlug?.Trim().ToLowerInvariant() ?? "";
            var secondServiceSlug = request.AdditionalServiceSlug?.Trim().ToLowerInvariant() ?? "";
            if (string.IsNullOrWhiteSpace(secondCategorySlug) != string.IsNullOrWhiteSpace(secondServiceSlug))
                return Results.BadRequest(new { message = "2. hizmet için kategori ve hizmet birlikte seçilmelidir." });

            if (!string.IsNullOrWhiteSpace(secondServiceSlug))
            {
                var secondCategory = await dbContext.Categories.AsNoTracking().Include(x => x.Services)
                    .FirstOrDefaultAsync(x => x.IsActive && x.Slug == secondCategorySlug);
                if (secondCategory is null) return Results.BadRequest(new { message = "Geçerli bir 2. kategori seçin." });
                var secondSlugs = secondCategory.Services.Where(x => x.IsActive).Select(x => ToSlug(x.Name))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
                if (!secondSlugs.Contains(secondServiceSlug))
                    return Results.BadRequest(new { message = "2. hizmet seçilen kategoriye ait olmalıdır." });
                if (string.Equals(serviceSlug, secondServiceSlug, StringComparison.OrdinalIgnoreCase))
                    return Results.BadRequest(new { message = "1. hizmet ile 2. hizmet aynı olamaz." });
            }

            var previous = provider.AdditionalServices.ToHashSet(StringComparer.OrdinalIgnoreCase);
            provider.CategorySlug = categorySlug;
            provider.ServiceSlug = serviceSlug;
            provider.AdditionalServices = string.IsNullOrWhiteSpace(secondServiceSlug) ? [] : [secondServiceSlug];
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            var newlyAdded = provider.AdditionalServices.Where(x => !previous.Contains(x)).ToArray();
            if (newlyAdded.Length > 0)
                await TrackedNeedMatchNotifier.NotifyForProviderAsync(dbContext, provider, newlyAdded);

            await dbContext.SaveChangesAsync();
            return Results.Ok(new {
                message = "Kategori ve hizmetler kaydedildi.",
                provider.CategorySlug, provider.ServiceSlug, provider.AdditionalServices, provider.Version
            });
        });

        group.MapPut("/me/location", async (
            UpdateOwnProviderLocationRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba bağlı işletme bulunamadı."
                });
            }

            var citySlug = request.CitySlug?.Trim().ToLowerInvariant();
            var districtSlug = request.DistrictSlug?.Trim().ToLowerInvariant();
            var publicAddress = Optional(request.PublicAddress);

            if (string.IsNullOrWhiteSpace(citySlug) ||
                string.IsNullOrWhiteSpace(districtSlug))
            {
                return Results.BadRequest(new
                {
                    message = "İl ve ilçe seçimi zorunludur."
                });
            }

            if (!request.Latitude.HasValue || !request.Longitude.HasValue)
            {
                return Results.BadRequest(new
                {
                    message = "Harita konumu seçilmelidir."
                });
            }

            if (request.Latitude is < -90 or > 90 ||
                request.Longitude is < -180 or > 180)
            {
                return Results.BadRequest(new
                {
                    message = "Geçersiz enlem veya boylam bilgisi."
                });
            }

            var city = await dbContext.Cities
                .AsNoTracking()
                .Include(x => x.Districts)
                .FirstOrDefaultAsync(x => x.Slug == citySlug);

            if (city is null)
            {
                return Results.BadRequest(new { message = "Geçerli bir il seçin." });
            }

            var districtExists = city.Districts.Any(x => x.Slug == districtSlug);
            if (!districtExists)
            {
                return Results.BadRequest(new
                {
                    message = "Seçilen ilçe bu ile ait değil."
                });
            }

            provider.CitySlug = citySlug;
            provider.DistrictSlug = districtSlug;
            provider.PublicAddress = publicAddress;
            provider.Latitude = request.Latitude;
            provider.Longitude = request.Longitude;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Konum ve adres kaydedildi.",
                provider.CitySlug,
                provider.DistrictSlug,
                provider.PublicAddress,
                provider.Latitude,
                provider.Longitude,
                provider.Version
            });
        });
        group.MapGet("/needs", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba baÄŸlÄ± iÅŸletme bulunamadÄ±."
                });
            }

            var needs = await dbContext.NeedRequests
                .AsNoTracking()
                .Where(x =>
                    x.IsActive &&
                    x.Status != NeedStatus.Cancelled &&
                    x.TargetProviderId == provider.Id)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.Title,
                    x.Description,
                    x.Category,
                    x.City,
                    x.District,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.TargetProviderId,
                    isDirectRequest = x.TargetProviderId == provider.Id,
                    contactByPhone = x.ContactByPhone,
                    contactByWhatsapp = x.ContactByWhatsapp,
                    contactByEmail = x.ContactByEmail,
                    contactByPush = x.ContactByPush,
                    requesterEmail =
                        x.TargetProviderId == provider.Id && x.OwnerUser != null
                            ? x.OwnerUser.Email
                            : null,
                    requesterName =
                        x.TargetProviderId == provider.Id && x.OwnerUser != null
                            ? x.OwnerUser.DisplayName
                            : null,
                    requesterPhone =
                        x.TargetProviderId == provider.Id && x.OwnerUser != null
                            ? x.OwnerUser.PhoneNumber
                            : null,
                    x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(needs);
        });

        group.MapPut("/notification-preferences", async (
            UpdateProviderNotificationPreferences request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba baÄŸlÄ± iÅŸletme bulunamadÄ±."
                });
            }

            provider.NotifyByEmail = request.Email;
            provider.NotifyBySms = request.Sms;
            provider.NotifyByWhatsapp = request.Whatsapp;
            provider.NotifyByPush = request.Push;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                email = provider.NotifyByEmail,
                sms = provider.NotifyBySms,
                whatsapp = provider.NotifyByWhatsapp,
                push = provider.NotifyByPush,
                provider.Version
            });
        });

        return app;
    }

    public static IEndpointRouteBuilder MapDevelopmentProviderOwnerEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin");

        group.MapPost("/providers/{id:guid}/link-owner", async (
            Guid id,
            LinkProviderOwnerRequest request,
            AppDbContext dbContext) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return Results.BadRequest(new
                {
                    message = "E-posta zorunludur."
                });
            }

            var normalizedEmail =
                request.Email.Trim().ToLowerInvariant().ToUpperInvariant();

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.NormalizedEmail == normalizedEmail);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "KullanÄ±cÄ± bulunamadÄ±."
                });
            }

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Ä°ÅŸletme profili bulunamadÄ±."
                });
            }

            var anotherProvider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.OwnerUserId == user.Id &&
                    x.Id != provider.Id);

            if (anotherProvider is not null)
            {
                return Results.Conflict(new
                {
                    message = "Bu kullanÄ±cÄ± baÅŸka bir iÅŸletmeye baÄŸlÄ±."
                });
            }

            provider.OwnerUserId = user.Id;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            user.Role = UserRole.Provider;
            user.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                providerId = provider.Id,
                providerSlug = provider.Slug,
                ownerUserId = user.Id,
                user.Email,
                user.DisplayName,
                role = user.Role.ToString().ToLowerInvariant(),
                providerVersion = provider.Version
            });
        });

        return app;
    }

    private static object ToPanelProfile(
        Provider provider,
        int matchedNeedCount)
        => new
        {
            provider.Id,
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
            provider.Latitude,
            provider.Longitude,
            provider.WorkingHours,
            provider.ExperienceYears,
            provider.EmergencyService,
            provider.OnsiteService,
            notificationPreferences = new
            {
                email = provider.NotifyByEmail,
                sms = provider.NotifyBySms,
                whatsapp = provider.NotifyByWhatsapp,
                push = provider.NotifyByPush
            },
            publicationStatus =
                provider.PublicationStatus.ToString().ToLowerInvariant(),
            provider.PublishedAtUtc,
            provider.Version,
            matchedNeedCount
        };

    private static Dictionary<string, string[]> ValidateOwnUpdate(
        UpdateOwnProviderRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.Description?.Trim().Length > 4000)
        {
            errors["description"] =
                ["DetaylÄ± aÃ§Ä±klama en fazla 4000 karakter olabilir."];
        }

        if (request.PublicPhone?.Trim().Length > 30)
        {
            errors["publicPhone"] =
                ["Telefon en fazla 30 karakter olabilir."];
        }

        if (request.PublicWhatsapp?.Trim().Length > 30)
        {
            errors["publicWhatsapp"] =
                ["WhatsApp numarasÄ± en fazla 30 karakter olabilir."];
        }

        if (request.PublicAddress?.Trim().Length > 500)
        {
            errors["publicAddress"] =
                ["Adres en fazla 500 karakter olabilir."];
        }

        if (request.Latitude is < -90 or > 90)
        {
            errors["latitude"] = ["Enlem -90 ile 90 arasında olmalıdır."];
        }

        if (request.Longitude is < -180 or > 180)
        {
            errors["longitude"] = ["Boylam -180 ile 180 arasında olmalıdır."];
        }

        if (request.Latitude.HasValue != request.Longitude.HasValue)
        {
            errors["location"] = ["Enlem ve boylam birlikte gönderilmelidir."];
        }

        if (request.WorkingHours?.Trim().Length > 500)
        {
            errors["workingHours"] =
                ["Ã‡alÄ±ÅŸma saatleri en fazla 500 karakter olabilir."];
        }

        if (request.ExperienceYears is < 0 or > 100)
        {
            errors["experienceYears"] =
                ["Deneyim yÄ±lÄ± 0 ile 100 arasÄ±nda olmalÄ±dÄ±r."];
        }

        var additionalServices = request.AdditionalServices ?? [];

        if (additionalServices.Count > 1)
        {
            errors["additionalServices"] =
                ["En fazla 1 ek hizmet seÃ§ebilirsiniz."];
        }

        if (additionalServices.Any(x =>
            x is not null && x.Trim().Length > 150))
        {
            errors["additionalServices"] =
                ["Ek hizmetlerin her biri en fazla 150 karakter olabilir."];
        }

        return errors;
    }

    private static string? Optional(string? value)
        => string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();

    private static bool TryGetUserId(
        ClaimsPrincipal principal,
        out Guid userId)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out userId);
    }

    private static string NormalizeProviderCategorySlug(string value)
        => value.Trim().ToLowerInvariant() switch
        {
            "nakliye-tasima" => "nakliye-ve-hafriyat",
            "nakliye-hafriyat" => "nakliye-ve-hafriyat",
            "hafriyat-nakliyat" => "nakliye-ve-hafriyat",
            "hafriyat-ve-nakliyat" => "nakliye-ve-hafriyat",
            "insaat-hafriyat" => "nakliye-ve-hafriyat",
            var slug => slug
        };

    private static string NormalizeProviderServiceSlug(string value)
        => value.Trim().ToLowerInvariant() switch
        {
            "hafriyat" => "hafriyat-isleri",
            var slug => slug
        };

    private static string ToSlug(string value)
    {
        var normalized = value
            .ToLower(new CultureInfo("tr-TR"))
            .Replace('\u0131', 'i')
            .Replace('\u011F', 'g')
            .Replace('\u00FC', 'u')
            .Replace('\u015F', 's')
            .Replace('\u00F6', 'o')
            .Replace('\u00E7', 'c')
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

        return Regex.Replace(
                builder
                    .ToString()
                    .Normalize(NormalizationForm.FormC),
                "[^a-z0-9]+",
                "-")
            .Trim('-');
    }
}

public sealed record LinkProviderOwnerRequest(
    string Email);

public sealed record UpdateOwnProviderRequest(
    int ExpectedVersion,
    string CategorySlug,
    string ServiceSlug,
    string? AdditionalCategorySlug,
    string? Description,
    List<string> AdditionalServices,
    string? PublicPhone,
    string? PublicWhatsapp,
    string? CitySlug,
    string? DistrictSlug,
    string? PublicAddress,
    double? Latitude,
    double? Longitude,
    string? WorkingHours,
    int? ExperienceYears,
    bool EmergencyService,
    bool OnsiteService);

public sealed record UpdateOwnProviderLocationRequest(
    string? CitySlug,
    string? DistrictSlug,
    string? PublicAddress,
    double? Latitude,
    double? Longitude);
public sealed record UpdateProviderNotificationPreferences(
    bool Email,
    bool Sms,
    bool Whatsapp,
    bool Push);









public sealed record UpdateOwnProviderBusinessRequest(
    int ExpectedVersion, string BusinessName, string? Description,
    string? PublicPhone, string? PublicWhatsapp);

public sealed record UpdateOwnProviderCatalogRequest(
    int ExpectedVersion, string CategorySlug, string ServiceSlug,
    string? AdditionalCategorySlug, string? AdditionalServiceSlug);
