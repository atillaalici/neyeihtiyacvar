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

public static class NeedRequestEndpoints
{
    public static IEndpointRouteBuilder MapNeedRequestEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/needs");

        group.MapGet("/", () =>
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        });

        group.MapGet("/{id:guid}", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
                principal.FindFirstValue("sub");

            if (!Guid.TryParse(userIdValue, out var userId))
                return Results.Unauthorized();

            var activeUser = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(x => x.Id == userId && x.IsActive);

            if (!activeUser)
                return Results.Unauthorized();

            var request = await dbContext.NeedRequests
                .AsNoTracking()
                .Where(x => x.Id == id && x.OwnerUserId == userId)
                .Select(x => new
                {
                    x.Id,
                    x.OwnerUserId,
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
                    status = x.Status.ToString().ToLowerInvariant(),
                    x.TrackingExpiresAtUtc,
                    x.TrackingReminderSentAtUtc,
                    trackingExpired =
                        x.TrackingExpiresAtUtc != null && x.TrackingExpiresAtUtc <= DateTime.UtcNow,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc
                })
                .FirstOrDefaultAsync();

            return request is null
                ? Results.NotFound(new { message = "İhtiyaç talebi bulunamadı." })
                : Results.Ok(request);
        });

        group.MapGet("/{id:guid}/matches", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
                principal.FindFirstValue("sub");

            if (!Guid.TryParse(userIdValue, out var userId))
                return Results.Unauthorized();

            var activeUser = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(x => x.Id == userId && x.IsActive);

            if (!activeUser)
                return Results.Unauthorized();

            var request = await dbContext.NeedRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == userId);

            if (request is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (string.IsNullOrWhiteSpace(request.CitySlug) ||
                string.IsNullOrWhiteSpace(request.DistrictSlug) ||
                (request.CategoryLibraryWorkId is null &&
                 (string.IsNullOrWhiteSpace(request.CategorySlug) ||
                  string.IsNullOrWhiteSpace(request.ServiceSlug))))
            {
                return Results.Ok(new
                {
                    requestId = request.Id,
                    matchType = "exact",
                    count = 0,
                    providers = Array.Empty<object>(),
                    message = "Bu eski talepte eşleştirme kodları bulunmuyor."
                });
            }

            var providers = await dbContext.Providers
                .AsNoTracking()
                .Where(x =>
                    x.PublicationStatus == PublicationStatus.Published &&
                    (request.TargetProviderId == null || x.Id == request.TargetProviderId) &&
                    x.CitySlug == request.CitySlug &&
                    x.DistrictSlug == request.DistrictSlug &&
                    (request.CategoryLibraryWorkId != null
                        ? dbContext.ProviderCategoryLibraryWorks.Any(link =>
                            link.ProviderId == x.Id &&
                            link.CategoryLibraryWorkId == request.CategoryLibraryWorkId)
                        : x.CategorySlug == request.CategorySlug &&
                          x.ServiceSlug == request.ServiceSlug))
                .OrderBy(x => x.BusinessName)
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
                    x.PublicWhatsapp
                })
                .ToListAsync();

            return Results.Ok(new
            {
                requestId = request.Id,
                matchType = "exact",
                count = providers.Count,
                providers
            });
        });

        group.MapPost("/", async (
            CreateNeedRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            IEmailSender emailSender,
            ILoggerFactory loggerFactory) =>
        {
            var logger = loggerFactory.CreateLogger("NeedRequestEmailNotifications");

            var userIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdValue, out var ownerUserId))
            {
                return Results.Unauthorized();
            }

            var ownerUser = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Id == ownerUserId &&
                    x.IsActive);

            if (ownerUser is null)
            {
                return Results.Unauthorized();
            }

            if (ownerUser.EmailVerifiedAtUtc is null)
            {
                return Results.Json(
                    new
                    {
                        code = "verification_required",
                        message = "İhtiyaç talebi oluşturmak için e-posta adresini doğrulamalısın.",
                        userId = ownerUser.Id,
                        ownerUser.Email,
                        ownerUser.PhoneNumber,
                        emailVerified = false,
                        phoneVerified = false
                    },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var validationErrors = Validate(request);

            if (validationErrors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Gönderilen bilgiler geçerli değil.",
                    errors = validationErrors
                });
            }

            var selectedWork = request.CategoryLibraryWorkId is Guid workId
                ? await dbContext.CategoryLibraryWorks
                    .AsNoTracking()
                    .Include(x => x.CategoryService)
                        .ThenInclude(x => x.Category)
                    .FirstOrDefaultAsync(x =>
                        x.Id == workId &&
                        x.IsActive &&
                        x.CategoryService.IsActive &&
                        x.CategoryService.Category.IsActive)
                : null;

            if (request.CategoryLibraryWorkId.HasValue && selectedWork is null)
            {
                validationErrors["categoryLibraryWorkId"] =
                    ["Geçerli bir hizmet seçin."];
            }

            var effectiveCategorySlug = selectedWork is not null
                ? selectedWork.CategoryService.Category.Slug
                : request.CategorySlug.Trim();

            var effectiveServiceSlug = selectedWork is not null
                ? ToSlug(selectedWork.CategoryService.Name)
                : request.ServiceSlug.Trim();

            var category = selectedWork is null
                ? await dbContext.Categories
                    .AsNoTracking()
                    .Include(x => x.Services)
                    .FirstOrDefaultAsync(x =>
                        x.Slug == effectiveCategorySlug &&
                        x.IsActive)
                : selectedWork.CategoryService.Category;

            if (category is null)
            {
                validationErrors["categorySlug"] =
                    ["Geçerli bir kategori seçin."];
            }

            if (selectedWork is null && category is not null)
            {
                var service = category.Services
                    .Where(x => x.IsActive)
                    .FirstOrDefault(x =>
                        ToSlug(x.Name) == effectiveServiceSlug);

                if (service is null)
                {
                    validationErrors["serviceSlug"] =
                        ["Seçilen kategoriye ait geçerli bir hizmet seçin."];
                }
            }

            var city = await dbContext.Cities
                .AsNoTracking()
                .Include(x => x.Districts)
                .FirstOrDefaultAsync(x =>
                    x.Slug == request.CitySlug.Trim() &&
                    x.IsActive);

            District? district = null;

            if (city is null)
            {
                validationErrors["citySlug"] =
                    ["Geçerli bir il seçin."];
            }
            else
            {
                district = city.Districts
                    .FirstOrDefault(x =>
                        x.Slug == request.DistrictSlug.Trim() &&
                        x.IsActive);

                if (district is null)
                {
                    validationErrors["districtSlug"] =
                        ["Seçilen ilçenin ile ait olduğunu kontrol edin."];
                }
            }

            Provider? targetProvider = null;

            if (request.TargetProviderId is Guid targetProviderId)
            {
                targetProvider = await dbContext.Providers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Id == targetProviderId &&
                        x.IsActive &&
                        x.PublicationStatus == PublicationStatus.Published);

                if (targetProvider is null)
                {
                    validationErrors["targetProviderId"] =
                        ["Seçilen işletme artık yayında değil veya bulunamadı."];
                }
                else
                {
                    var servesRequestedService =
                        string.Equals(
                            targetProvider.ServiceSlug,
                            request.ServiceSlug.Trim(),
                            StringComparison.OrdinalIgnoreCase) ||
                        targetProvider.AdditionalServices.Contains(
                            request.ServiceSlug.Trim(),
                            StringComparer.OrdinalIgnoreCase);

                    if (!string.Equals(
                            targetProvider.CategorySlug,
                            request.CategorySlug.Trim(),
                            StringComparison.OrdinalIgnoreCase) ||
                        !servesRequestedService)
                    {
                        validationErrors["targetProviderId"] =
                            ["Seçilen işletme bu ihtiyaç hizmetiyle eşleşmiyor."];
                    }
                }
            }

            if (validationErrors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Gönderilen bilgiler geçerli değil.",
                    errors = validationErrors
                });
            }


            var now = DateTime.UtcNow;

            var trackingExpiresAtUtc = request.TrackingDuration switch
            {
                "1-month" => now.AddMonths(1),
                "3-months" => now.AddMonths(3),
                "until-closed" => (DateTime?)null,
                _ => now.AddMonths(1)
            };

            var needRequest = new NeedRequest
            {
                OwnerUserId = ownerUserId,
                Title = request.Title.Trim(),
                Description = request.Description.Trim(),
                Category = category!.Name,
                City = city!.Name,
                District = district!.Name,
                CategorySlug = category.Slug,
                ServiceSlug = effectiveServiceSlug,
                CategoryLibraryWorkId = selectedWork?.Id,
                CitySlug = city.Slug,
                DistrictSlug = district.Slug,
                TargetProviderId = targetProvider?.Id,
                DistributionEnabled = targetProvider == null &&
                                      selectedWork != null,
                DistributionStage = NeedDistributionGeography.District,
                DistributionUpdatedAtUtc = null,
                AcceptingNewOffers = true,
                AutoClosedAtUtc = null,
                ContactPreferencesSet = request.ContactPreferencesSet,
                ShowFullName = request.ShowFullName,
                ContactByPhone = request.ContactByPhone,
                ContactByWhatsapp = request.ContactByWhatsapp,
                ContactByEmail = request.ContactByEmail,
                ContactBySystemMessage = request.ContactBySystemMessage,
                ContactByPush = request.ContactByPush,
                Status = NeedStatus.Open,
                TrackingExpiresAtUtc = trackingExpiresAtUtc,
                TrackingReminderSentAtUtc = null,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.NeedRequests.Add(needRequest);

            // Ilce ve C hizmeti eslesen isletmelerin sahiplerini belirle.
            // Uygulama ici bildirim e-posta tercihinden bagimsizdir.
            var matchingOwners = new List<Guid>();
            var emailRecipients = new List<(Guid UserId, string Email, string Name)>();

            if (needRequest.TargetProviderId is null &&
                needRequest.CategoryLibraryWorkId is Guid selectedWorkId)
            {
                var matchedProviders = await dbContext.Providers
                    .AsNoTracking()
                    .Where(provider =>
                        provider.IsActive &&
                        provider.PublicationStatus == PublicationStatus.Published &&
                        provider.OwnerUserId != null &&
                        provider.CitySlug == needRequest.CitySlug &&
                        provider.DistrictSlug == needRequest.DistrictSlug &&
                        dbContext.ProviderCategoryLibraryWorks.Any(link =>
                            link.ProviderId == provider.Id &&
                            link.CategoryLibraryWorkId == selectedWorkId))
                    .Select(provider => new
                    {
                        OwnerId = provider.OwnerUserId!.Value,
                        provider.NotifyByEmail
                    })
                    .ToListAsync();

                matchingOwners = matchedProviders
                    .Select(x => x.OwnerId)
                    .Distinct()
                    .ToList();

                foreach (var ownerId in matchingOwners)
                {
                    NotificationWriter.Add(
                        dbContext,
                        ownerId,
                        "new_matching_need",
                        "Yeni İş Fırsatı!",
                        $"{needRequest.Title} - {needRequest.City} / {needRequest.District} konumunda yeni bir teklif talebi oluşturuldu.",
                        $"/panel/taleplerim?talep={needRequest.Id}");
                }

                var emailOwnerIds = matchedProviders
                    .Where(x => x.NotifyByEmail)
                    .Select(x => x.OwnerId)
                    .Distinct()
                    .ToList();

                if (emailOwnerIds.Count > 0)
                {
                    var recipients = await dbContext.Users
                        .AsNoTracking()
                        .Where(user =>
                            emailOwnerIds.Contains(user.Id) &&
                            user.IsActive &&
                            user.EmailVerifiedAtUtc != null &&
                            user.Email != "")
                        .Select(user => new
                        {
                            user.Id,
                            user.Email,
                            user.DisplayName
                        })
                        .ToListAsync();

                    emailRecipients = recipients
                        .Select(x => (UserId: x.Id, Email: x.Email, Name: x.DisplayName))
                        .ToList();
                }
            }

            if (targetProvider?.OwnerUserId is Guid providerOwnerUserId)
            {
                NotificationWriter.Add(
                    dbContext,
                    providerOwnerUserId,
                    "targeted_need_received",
                    "Yeni ihtiyaç talebi",
                    $"{ownerUser.DisplayName}, \"{needRequest.Title}\" ihtiyacı için işletmenizle iletişime geçmek istiyor.",
                    $"/panel?talep={needRequest.Id}");
            }

            // Talep ve e-posta kuyruk kayitlari birlikte kaydedilir.
            foreach (var recipient in emailRecipients)
            {
                dbContext.EmailOutbox.Add(new EmailOutbox
                {
                    NeedRequestId = needRequest.Id,
                    RecipientUserId = recipient.UserId,
                    ToEmail = recipient.Email,
                    RecipientName = recipient.Name,
                    Subject = ("Yeni İş Fırsatı: " + needRequest.Title)[..Math.Min(300, ("Yeni İş Fırsatı: " + needRequest.Title).Length)],
                    Heading = "Size uygun yeni bir iş fırsatı var",
                    Message = (
                        $"Hizmet: {needRequest.Title} | Konum: {needRequest.City} / {needRequest.District}. " +
                        $"Talebi görüntülemek için: https://neyeihtiyacvar.com/panel?talep={needRequest.Id}"
                    )[..Math.Min(4000, (
                        $"Hizmet: {needRequest.Title} | Konum: {needRequest.City} / {needRequest.District}. " +
                        $"Talebi görüntülemek için: https://neyeihtiyacvar.com/panel?talep={needRequest.Id}"
                    ).Length)]
                });
            }

            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/needs/{needRequest.Id}",
                new
                {
                    needRequest.Id,
                    needRequest.Title,
                    needRequest.Description,
                    needRequest.Category,
                    needRequest.City,
                    needRequest.District,
                    needRequest.CategorySlug,
                    needRequest.ServiceSlug,
                    needRequest.CitySlug,
                    needRequest.DistrictSlug,
                    needRequest.TargetProviderId,
                    targetProviderName = targetProvider?.BusinessName,
                    status = needRequest.Status.ToString().ToLowerInvariant(),
                    needRequest.TrackingExpiresAtUtc,
                    trackingExpired = false,
                    needRequest.CreatedAtUtc
                });
        });


        group.MapPost("/{id:guid}/target-provider", async (
            Guid id,
            TargetTrackedNeedRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdValue, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Id == userId &&
                    x.IsActive);

            if (user is null)
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(user.PhoneNumber))
            {
                return Results.BadRequest(new
                {
                    code = "phone_required",
                    message = "İşletmeyle iletişime geçmek için hesabında cep telefonu numarası bulunmalıdır."
                });
            }

            var need = await dbContext.NeedRequests
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.OwnerUserId == userId);

            if (need is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (!need.IsActive ||
                need.Status is NeedStatus.Completed or NeedStatus.Cancelled)
            {
                return Results.Conflict(new
                {
                    message = "Bu ihtiyaç talebi artık işletmeye iletilemez."
                });
            }

            if (need.TargetProviderId is not null)
            {
                return Results.Conflict(new
                {
                    message = "Bu ihtiyaç daha önce bir işletmeye iletildi."
                });
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Id == request.TargetProviderId &&
                    x.IsActive &&
                    x.PublicationStatus == PublicationStatus.Published);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Seçilen işletme artık yayında değil veya bulunamadı."
                });
            }

            var serviceMatches =
                string.Equals(
                    provider.ServiceSlug,
                    need.ServiceSlug,
                    StringComparison.OrdinalIgnoreCase) ||
                (
                    need.ServiceSlug is not null &&
                    provider.AdditionalServices.Contains(
                        need.ServiceSlug,
                        StringComparer.OrdinalIgnoreCase)
                );

            var locationMatches =
                string.Equals(
                    provider.CitySlug,
                    need.CitySlug,
                    StringComparison.OrdinalIgnoreCase) &&
                string.Equals(
                    provider.DistrictSlug,
                    need.DistrictSlug,
                    StringComparison.OrdinalIgnoreCase);

            if (!serviceMatches || !locationMatches)
            {
                return Results.BadRequest(new
                {
                    message = "Seçilen işletme bu ihtiyacın hizmet ve konum bilgileriyle eşleşmiyor."
                });
            }

            var description = request.Description?.Trim();

            if (!string.IsNullOrWhiteSpace(description))
            {
                if (description.Length > 2000)
                {
                    return Results.BadRequest(new
                    {
                        message = "Açıklama en fazla 2000 karakter olabilir."
                    });
                }

                need.Description = description;
            }

            need.TargetProviderId = provider.Id;
            need.ContactByPhone = true;
            need.ContactByWhatsapp = request.ContactByWhatsapp;
            need.ContactByEmail = request.ContactByEmail;
            need.ContactByPush = request.ContactByPush;
            need.TrackingExpiresAtUtc = null;
            need.TrackingReminderSentAtUtc = null;
            need.Status = NeedStatus.Open;
            need.UpdatedAtUtc = DateTime.UtcNow;

            if (provider.OwnerUserId is Guid providerOwnerUserId)
            {
                var channels = new List<string> { "Telefon" };

                if (need.ContactByWhatsapp)
                {
                    channels.Add("WhatsApp");
                }

                if (need.ContactByEmail)
                {
                    channels.Add("E-posta");
                }

                if (need.ContactByPush)
                {
                    channels.Add("Uygulama içi bildirim");
                }

                NotificationWriter.Add(
                    dbContext,
                    providerOwnerUserId,
                    "targeted_need_received",
                    "Yeni ihtiyaç talebi",
                    $"{user.DisplayName}, \"{need.Title}\" ihtiyacı için işletmenizle iletişime geçmek istiyor. Tercih edilen iletişim: {string.Join(", ", channels)}.",
                    $"/panel?talep={need.Id}");
            }

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                need.Id,
                need.TargetProviderId,
                providerName = provider.BusinessName,
                need.ContactByPhone,
                need.ContactByWhatsapp,
                need.ContactByEmail,
                need.ContactByPush,
                status = need.Status.ToString().ToLowerInvariant(),
                message = "İhtiyacınız seçtiğiniz işletmeye iletildi."
            });
        });

        group.MapPost("/{id:guid}/tracking/renew", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdValue, out var userId))
            {
                return Results.Unauthorized();
            }

            var need = await dbContext.NeedRequests
                .FirstOrDefaultAsync(x => x.Id == id);

            if (need is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (need.OwnerUserId != userId)
            {
                return Results.Forbid();
            }

            if (need.Status is NeedStatus.Completed or NeedStatus.Cancelled)
            {
                return Results.BadRequest(new
                {
                    message = "Sonuçlanmış veya iptal edilmiş talep yenilenemez."
                });
            }

            var now = DateTime.UtcNow;

            need.TrackingExpiresAtUtc = now.AddMonths(1);
            need.TrackingReminderSentAtUtc = null;
            need.IsActive = true;
            need.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                need.Id,
                need.TrackingExpiresAtUtc,
                trackingExpired = false,
                message = "Talebin 1 ay daha takip edilecek."
            });
        });

        group.MapPost("/{id:guid}/tracking/stop", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdValue, out var userId))
            {
                return Results.Unauthorized();
            }

            var need = await dbContext.NeedRequests
                .FirstOrDefaultAsync(x => x.Id == id);

            if (need is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (need.OwnerUserId != userId)
            {
                return Results.Forbid();
            }

            if (need.Status == NeedStatus.Completed)
            {
                return Results.BadRequest(new
                {
                    message = "Sonuçlanmış talep kapatılamaz."
                });
            }

            need.Status = NeedStatus.Cancelled;
            need.IsActive = false;
            need.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                need.Id,
                status = need.Status.ToString().ToLowerInvariant(),
                need.IsActive,
                message = "Talep takibi kapatıldı."
            });
        });
        return app;
    }

    private static Dictionary<string, string[]> Validate(
        CreateNeedRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            errors["title"] = ["Başlık zorunludur."];
        }
        else if (request.Title.Trim().Length > 150)
        {
            errors["title"] = ["Başlık en fazla 150 karakter olabilir."];
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            errors["description"] = ["Açıklama zorunludur."];
        }
        else if (request.Description.Trim().Length > 2000)
        {
            errors["description"] =
                ["Açıklama en fazla 2000 karakter olabilir."];
        }

        if (!request.CategoryLibraryWorkId.HasValue)
        {
            ValidateSlug(errors, "categorySlug", request.CategorySlug, "Kategori");
            ValidateSlug(errors, "serviceSlug", request.ServiceSlug, "Hizmet");
        }
        ValidateSlug(errors, "citySlug", request.CitySlug, "İl");
        ValidateSlug(errors, "districtSlug", request.DistrictSlug, "İlçe");

        if (request.TrackingDuration is not ("1-month" or "3-months" or "until-closed"))
        {
            errors["trackingDuration"] =
                ["Talep süresi 1 ay, 3 ay veya ben kapatana kadar seçeneklerinden biri olmalıdır."];
        }

        return errors;
    }

    private static void ValidateSlug(
        Dictionary<string, string[]> errors,
        string key,
        string? value,
        string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{label} zorunludur."];
            return;
        }

        var trimmed = value.Trim();

        if (trimmed.Length > 150)
        {
            errors[key] = [$"{label} kodu çok uzun."];
            return;
        }

        if (!Regex.IsMatch(trimmed, "^[a-z0-9]+(?:-[a-z0-9]+)*$"))
        {
            errors[key] =
                [$"{label} kodu geçerli slug formatında olmalıdır."];
        }
    }

    private static string ToSlug(string value)
    {
        value = value
            .Replace('ı', 'i')
            .Replace('İ', 'I')
            .Replace('ğ', 'g')
            .Replace('Ğ', 'G')
            .Replace('ü', 'u')
            .Replace('Ü', 'U')
            .Replace('ş', 's')
            .Replace('Ş', 'S')
            .Replace('ö', 'o')
            .Replace('Ö', 'O')
            .Replace('ç', 'c')
            .Replace('Ç', 'C');

        var normalized = value.Normalize(NormalizationForm.FormD);
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
}

public sealed record CreateNeedRequest(
    string Title,
    string Description,
    string CategorySlug,
    string ServiceSlug,
    string CitySlug,
    string DistrictSlug,
    Guid? TargetProviderId = null,
    string TrackingDuration = "1-month",
    bool ContactByWhatsapp = false,
    bool ContactByEmail = false,
    bool ContactByPush = false,
    Guid? CategoryLibraryWorkId = null,
    bool ShowFullName = false,
    bool ContactByPhone = false,
    bool ContactBySystemMessage = false,
    bool ContactPreferencesSet = false);
public sealed record TargetTrackedNeedRequest(
    Guid TargetProviderId,
    string? Description,
    bool ContactByWhatsapp = false,
    bool ContactByEmail = false,
    bool ContactByPush = false);