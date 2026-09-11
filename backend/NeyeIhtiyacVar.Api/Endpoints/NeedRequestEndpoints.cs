using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Notifications;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class NeedRequestEndpoints
{
    public static IEndpointRouteBuilder MapNeedRequestEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/needs");

        group.MapGet("/", async (AppDbContext dbContext) =>
        {
            var requests = await dbContext.NeedRequests
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAtUtc)
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
                        (x.TrackingExpiresAtUtc ?? x.CreatedAtUtc.AddDays(7)) <= DateTime.UtcNow,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(requests);
        });

        group.MapGet("/{id:guid}", async (
            Guid id,
            AppDbContext dbContext) =>
        {
            var request = await dbContext.NeedRequests
                .AsNoTracking()
                .Where(x => x.Id == id)
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
                        (x.TrackingExpiresAtUtc ?? x.CreatedAtUtc.AddDays(7)) <= DateTime.UtcNow,
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
            AppDbContext dbContext) =>
        {
            var request = await dbContext.NeedRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (request is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (string.IsNullOrWhiteSpace(request.CategorySlug) ||
                string.IsNullOrWhiteSpace(request.ServiceSlug) ||
                string.IsNullOrWhiteSpace(request.CitySlug) ||
                string.IsNullOrWhiteSpace(request.DistrictSlug))
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
                    x.CategorySlug == request.CategorySlug &&
                    x.ServiceSlug == request.ServiceSlug &&
                    x.CitySlug == request.CitySlug &&
                    x.DistrictSlug == request.DistrictSlug)
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
            AppDbContext dbContext) =>
        {
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

            var category = await dbContext.Categories
                .AsNoTracking()
                .Include(x => x.Services)
                .FirstOrDefaultAsync(x =>
                    x.Slug == request.CategorySlug.Trim() &&
                    x.IsActive);

            if (category is null)
            {
                validationErrors["categorySlug"] =
                    ["Geçerli bir kategori seçin."];
            }

            CategoryService? service = null;

            if (category is not null)
            {
                service = category.Services
                    .Where(x => x.IsActive)
                    .FirstOrDefault(x =>
                        ToSlug(x.Name) == request.ServiceSlug.Trim());

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

            var needRequest = new NeedRequest
            {
                OwnerUserId = ownerUserId,
                Title = request.Title.Trim(),
                Description = request.Description.Trim(),
                Category = category!.Name,
                City = city!.Name,
                District = district!.Name,
                CategorySlug = category.Slug,
                ServiceSlug = request.ServiceSlug.Trim(),
                CitySlug = city.Slug,
                DistrictSlug = district.Slug,
                TargetProviderId = targetProvider?.Id,
                ContactByPhone = true,
                ContactByWhatsapp = request.ContactByWhatsapp,
                ContactByEmail = request.ContactByEmail,
                ContactByPush = request.ContactByPush,
                Status = NeedStatus.Open,
                TrackingExpiresAtUtc = now.AddDays(7),
                TrackingReminderSentAtUtc = null,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.NeedRequests.Add(needRequest);

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
            var currentExpiry =
                need.TrackingExpiresAtUtc ??
                need.CreatedAtUtc.AddDays(7);

            var renewalBase =
                currentExpiry > now
                    ? currentExpiry
                    : now;

            need.TrackingExpiresAtUtc =
                renewalBase.AddDays(7);
            need.TrackingReminderSentAtUtc = null;
            need.IsActive = true;
            need.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                need.Id,
                need.TrackingExpiresAtUtc,
                trackingExpired = false,
                message = "Talebin 7 gün daha takip edilecek."
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

        ValidateSlug(errors, "categorySlug", request.CategorySlug, "Kategori");
        ValidateSlug(errors, "serviceSlug", request.ServiceSlug, "Hizmet");
        ValidateSlug(errors, "citySlug", request.CitySlug, "İl");
        ValidateSlug(errors, "districtSlug", request.DistrictSlug, "İlçe");

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
    bool ContactByWhatsapp = false,
    bool ContactByEmail = false,
    bool ContactByPush = false);
public sealed record TargetTrackedNeedRequest(
    Guid TargetProviderId,
    string? Description,
    bool ContactByWhatsapp = false,
    bool ContactByEmail = false,
    bool ContactByPush = false);