using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

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
                Status = NeedStatus.Open,
                TrackingExpiresAtUtc = now.AddDays(7),
                TrackingReminderSentAtUtc = null,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.NeedRequests.Add(needRequest);
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
                    status = needRequest.Status.ToString().ToLowerInvariant(),
                    needRequest.TrackingExpiresAtUtc,
                    trackingExpired = false,
                    needRequest.CreatedAtUtc
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
    string DistrictSlug);