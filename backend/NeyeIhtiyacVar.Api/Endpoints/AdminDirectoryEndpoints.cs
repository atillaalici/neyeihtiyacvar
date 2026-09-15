using System.Security.Claims;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminDirectoryEndpoints
{
    public static IEndpointRouteBuilder MapAdminDirectoryEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin")
            .RequireAuthorization(policy =>
                policy.RequireRole(UserRole.Admin.ToString()));

        group.MapGet("/users/{id:guid}", async (
            Guid id,
            AppDbContext dbContext) =>
        {
            var user = await dbContext.Users
                .AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new
                {
                    x.Id,
                    x.Email,
                    x.DisplayName,
                    role = x.Role.ToString().ToLowerInvariant(),
                    x.IsActive,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    needCount = dbContext.NeedRequests.Count(n =>
                        n.OwnerUserId == x.Id),
                    providerCount = dbContext.Providers.Count(p =>
                        p.OwnerUserId == x.Id)
                })
                .FirstOrDefaultAsync();

            return user is null
                ? Results.NotFound(new { message = "Kullanıcı bulunamadı." })
                : Results.Ok(user);
        });

        group.MapPost("/users", async (
            AdminCreateUserRequest request,
            AppDbContext dbContext,
            IPasswordHasher<AppUser> passwordHasher) =>
        {
            var errors = ValidateUser(
                request.DisplayName,
                request.Email,
                request.Password,
                request.Role,
                requirePassword: true);

            if (errors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Kullanıcı bilgileri geçerli değil.",
                    errors
                });
            }

            var email = request.Email.Trim().ToLowerInvariant();
            var normalizedEmail = email.ToUpperInvariant();

            var exists = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(x => x.NormalizedEmail == normalizedEmail);

            if (exists)
            {
                return Results.Conflict(new
                {
                    message = "Bu e-posta adresiyle kayıtlı bir hesap zaten var."
                });
            }

            if (!TryParseRole(request.Role, out var role))
            {
                return Results.BadRequest(new
                {
                    message = "Geçerli bir rol seçin."
                });
            }

            var now = DateTime.UtcNow;

            var user = new AppUser
            {
                Email = email,
                NormalizedEmail = normalizedEmail,
                DisplayName = request.DisplayName.Trim(),
                Role = role,
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            user.PasswordHash = passwordHasher.HashPassword(
                user,
                request.Password!);

            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/admin/users/{user.Id}",
                new
                {
                    user.Id,
                    user.Email,
                    user.DisplayName,
                    role = user.Role.ToString().ToLowerInvariant(),
                    user.IsActive,
                    user.CreatedAtUtc
                });
        });

        group.MapPut("/users/{id:guid}", async (
            Guid id,
            AdminUpdateUserRequest request,
            System.Security.Claims.ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var user = await dbContext.Users
                .FirstOrDefaultAsync(x => x.Id == id);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Kullanıcı bulunamadı."
                });
            }

            var errors = ValidateUser(
                request.DisplayName,
                request.Email,
                null,
                request.Role,
                requirePassword: false);

            if (errors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Kullanıcı bilgileri geçerli değil.",
                    errors
                });
            }

            if (!TryParseRole(request.Role, out var role))
            {
                return Results.BadRequest(new
                {
                    message = "Geçerli bir rol seçin."
                });
            }

            var email = request.Email.Trim().ToLowerInvariant();
            var normalizedEmail = email.ToUpperInvariant();

            var duplicate = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(x =>
                    x.Id != id &&
                    x.NormalizedEmail == normalizedEmail);

            if (duplicate)
            {
                return Results.Conflict(new
                {
                    message = "Bu e-posta adresi başka bir kullanıcıya ait."
                });
            }

            var currentIdValue =
                principal.FindFirst(
                    System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (Guid.TryParse(currentIdValue, out var currentId) &&
                currentId == id &&
                role != UserRole.Admin)
            {
                return Results.Conflict(new
                {
                    message = "Kendi admin rolünüzü kaldıramazsınız."
                });
            }

            user.DisplayName = request.DisplayName.Trim();
            user.Email = email;
            user.NormalizedEmail = normalizedEmail;
            user.Role = role;
            user.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                role = user.Role.ToString().ToLowerInvariant(),
                user.IsActive,
                user.UpdatedAtUtc
            });
        });

        group.MapPost("/providers", async (
            AdminCreateProviderRequest request,
            AppDbContext dbContext) =>
        {
            var errors = ValidateProvider(request);

            if (errors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "İşletme bilgileri geçerli değil.",
                    errors
                });
            }

            var baseSlug = ToSlug(request.BusinessName);
            if (string.IsNullOrWhiteSpace(baseSlug))
            {
                baseSlug = "isletme";
            }

            var slug = baseSlug;
            var suffix = 2;

            while (await dbContext.Providers
                .AsNoTracking()
                .AnyAsync(x => x.Slug == slug))
            {
                slug = $"{baseSlug}-{suffix}";
                suffix++;
            }

            var now = DateTime.UtcNow;

            var provider = new Provider
            {
                Slug = slug,
                BusinessName = request.BusinessName.Trim(),
                ShortDescription = request.ShortDescription.Trim(),
                Description = Optional(request.Description),
                CategorySlug = request.CategorySlug.Trim(),
                ServiceSlug = request.ServiceSlug.Trim(),
                AdditionalServices = request.AdditionalServices
                    .Select(x => x.Trim())
                    .Where(x => x.Length > 0)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
                CitySlug = request.CitySlug.Trim(),
                DistrictSlug = request.DistrictSlug.Trim(),
                PublicPhone = Optional(request.PublicPhone),
                PublicWhatsapp = Optional(request.PublicWhatsapp),
                PublicAddress = Optional(request.PublicAddress),
                WorkingHours = Optional(request.WorkingHours),
                ExperienceYears = request.ExperienceYears,
                EmergencyService = request.EmergencyService,
                OnsiteService = request.OnsiteService,
                PublicationStatus = PublicationStatus.Draft,
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                Version = 0
            };

            dbContext.Providers.Add(provider);
            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/admin/providers/{provider.Id}",
                new
                {
                    provider.Id,
                    provider.Slug,
                    provider.BusinessName,
                    publicationStatus =
                        provider.PublicationStatus.ToString().ToLowerInvariant(),
                    provider.IsActive,
                    provider.CreatedAtUtc
                });
        });

        group.MapDelete("/providers/{id:guid}", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme profili bulunamadı."
                });
            }

            var providerName = provider.BusinessName;
            var ownerUserId = provider.OwnerUserId;
            var sourceApplicationId = provider.SourceApplicationId;

            AppUser? ownerUser = null;

            if (ownerUserId.HasValue)
            {
                ownerUser = await dbContext.Users
                    .FirstOrDefaultAsync(x => x.Id == ownerUserId.Value);
            }

            await using var transaction =
                await dbContext.Database.BeginTransactionAsync();

            try
            {
                // İşletmeye bağlı teklif ve değerlendirmeleri kaldır.
                var reviews = await dbContext.ProviderReviews
                    .Where(x =>
                        x.ProviderId == id ||
                        (ownerUserId.HasValue &&
                         x.UserId == ownerUserId.Value))
                    .ToListAsync();

                if (reviews.Count > 0)
                {
                    dbContext.ProviderReviews.RemoveRange(reviews);
                }

                var offers = await dbContext.ProviderOffers
                    .Where(x => x.ProviderId == id)
                    .ToListAsync();

                if (offers.Count > 0)
                {
                    dbContext.ProviderOffers.RemoveRange(offers);
                }

                // Üyelik kayıtlarını hem işletme hem sahip kullanıcı açısından temizle.
                var memberships = await dbContext
                    .Set<ProviderMembership>()
                    .Where(x =>
                        x.ProviderId == id ||
                        (ownerUserId.HasValue &&
                         x.UserId == ownerUserId.Value))
                    .ToListAsync();

                if (memberships.Count > 0)
                {
                    dbContext.RemoveRange(memberships);
                }

                // İşletmeye doğrudan yönlendirilmiş ihtiyaçları bozmadan ilişkiyi kaldır.
                var targetedNeeds = await dbContext.NeedRequests
                    .Where(x => x.TargetProviderId == id)
                    .ToListAsync();

                foreach (var need in targetedNeeds)
                {
                    need.TargetProviderId = null;
                }

                if (ownerUserId.HasValue)
                {
                    // Kullanıcının geçmiş ihtiyaçlarını koru, sadece sahip bağlantısını kaldır.
                    var ownedNeeds = await dbContext.NeedRequests
                        .Where(x => x.OwnerUserId == ownerUserId.Value)
                        .ToListAsync();

                    foreach (var need in ownedNeeds)
                    {
                        need.OwnerUserId = null;
                    }

                    var verificationCodes =
                        await dbContext.AccountVerificationCodes
                            .Where(x => x.UserId == ownerUserId.Value)
                            .ToListAsync();

                    if (verificationCodes.Count > 0)
                    {
                        dbContext.AccountVerificationCodes
                            .RemoveRange(verificationCodes);
                    }

                    var notifications = await dbContext.Notifications
                        .Where(x => x.UserId == ownerUserId.Value)
                        .ToListAsync();

                    if (notifications.Count > 0)
                    {
                        dbContext.Notifications.RemoveRange(notifications);
                    }
                }

                dbContext.Providers.Remove(provider);
                await dbContext.SaveChangesAsync();

                // Kaynağı bir başvuru ise test başvurusunu da kaldır.
                if (sourceApplicationId.HasValue)
                {
                    var application =
                        await dbContext.ProviderApplications
                            .FirstOrDefaultAsync(
                                x => x.Id == sourceApplicationId.Value);

                    if (application is not null)
                    {
                        dbContext.ProviderApplications.Remove(application);
                        await dbContext.SaveChangesAsync();
                    }
                }

                var ownerDeleted = false;
                string? deletedEmail = null;
                string? deletedPhone = null;

                if (ownerUser is not null &&
                    ownerUser.Role != UserRole.Admin)
                {
                    var hasAnotherProvider = await dbContext.Providers
                        .AsNoTracking()
                        .AnyAsync(x =>
                            x.OwnerUserId == ownerUser.Id &&
                            x.Id != id);

                    if (!hasAnotherProvider)
                    {
                        deletedEmail = ownerUser.Email;
                        deletedPhone = ownerUser.PhoneNumber;

                        dbContext.Users.Remove(ownerUser);
                        await dbContext.SaveChangesAsync();
                        ownerDeleted = true;
                    }
                }

                var adminUserIdValue =
                    principal.FindFirstValue(ClaimTypes.NameIdentifier);

                Guid? adminUserId =
                    Guid.TryParse(
                        adminUserIdValue,
                        out var parsedAdminUserId)
                        ? parsedAdminUserId
                        : null;

                dbContext.AdminAuditLogs.Add(new AdminAuditLog
                {
                    AdminUserId = adminUserId,
                    AdminEmail =
                        principal.FindFirstValue(ClaimTypes.Email) ??
                        principal.Identity?.Name ??
                        "unknown",
                    Action = "provider.hard-delete",
                    EntityType = "provider",
                    EntityId = id.ToString(),
                    EntityName = providerName,
                    Details = ownerDeleted
                        ? $"İşletme ve bağlı test hesabı silindi: {providerName}"
                        : $"İşletme silindi: {providerName}",
                    CreatedAtUtc = DateTime.UtcNow
                });

                await dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok(new
                {
                    id,
                    ownerDeleted,
                    deletedEmail,
                    deletedPhone,
                    message = ownerDeleted
                        ? "İşletme ve bağlı kullanıcı hesabı kalıcı olarak silindi. E-posta ve telefon yeniden kullanılabilir."
                        : "İşletme kalıcı olarak silindi."
                });
            }
            catch (Exception exception)
            {
                await transaction.RollbackAsync();

                return Results.Conflict(new
                {
                    message =
                        "İşletme silinirken bağlı kayıtlar temizlenemedi.",
                    detail = exception.Message
                });
            }
        });
        return app;
    }

    private static Dictionary<string, string[]> ValidateUser(
        string displayName,
        string email,
        string? password,
        string role,
        bool requirePassword)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(displayName))
        {
            errors["displayName"] = ["Ad soyad zorunludur."];
        }
        else if (displayName.Trim().Length > 150)
        {
            errors["displayName"] = ["Ad soyad en fazla 150 karakter olabilir."];
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            errors["email"] = ["E-posta zorunludur."];
        }
        else if (email.Trim().Length > 254 ||
                 !Regex.IsMatch(
                     email.Trim(),
                     "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
                     RegexOptions.CultureInvariant))
        {
            errors["email"] = ["Geçerli bir e-posta adresi yazın."];
        }

        if (requirePassword)
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                errors["password"] = ["Şifre zorunludur."];
            }
            else if (password.Length < 8 ||
                     !password.Any(char.IsUpper) ||
                     !password.Any(char.IsLower) ||
                     !password.Any(char.IsDigit))
            {
                errors["password"] =
                ["Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir."];
            }
        }

        if (!TryParseRole(role, out _))
        {
            errors["role"] = ["Geçerli bir rol seçin."];
        }

        return errors;
    }

    private static Dictionary<string, string[]> ValidateProvider(
        AdminCreateProviderRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        Required(errors, "businessName", request.BusinessName, 200, "İşletme adı");
        Required(errors, "shortDescription", request.ShortDescription, 300, "Kısa açıklama");
        Required(errors, "categorySlug", request.CategorySlug, 100, "Kategori");
        Required(errors, "serviceSlug", request.ServiceSlug, 150, "Hizmet");

        var additionalServices = (request.AdditionalServices ?? Array.Empty<string>())
            .Select(x => x?.Trim() ?? string.Empty)
            .Where(x => x.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (additionalServices.Length > 1)
        {
            errors["additionalServices"] =
                ["En fazla 1 ek hizmet seçebilirsiniz."];
        }

        if (additionalServices.Any(x =>
            string.Equals(x, request.ServiceSlug.Trim(), StringComparison.OrdinalIgnoreCase)))
        {
            errors["additionalServices"] =
                ["Ana hizmet ek hizmetler arasında tekrar seçilemez."];
        }
        Required(errors, "citySlug", request.CitySlug, 100, "İl");
        Required(errors, "districtSlug", request.DistrictSlug, 100, "İlçe");

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

    private static bool TryParseRole(string value, out UserRole role)
    {
        switch (value.Trim().ToLowerInvariant())
        {
            case "user":
                role = UserRole.User;
                return true;
            case "provider":
                role = UserRole.Provider;
                return true;
            case "admin":
                role = UserRole.Admin;
                return true;
            default:
                role = default;
                return false;
        }
    }

    private static string? Optional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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

public sealed record AdminCreateUserRequest(
    string DisplayName,
    string Email,
    string Password,
    string Role);

public sealed record AdminUpdateUserRequest(
    string DisplayName,
    string Email,
    string Role);

public sealed record AdminCreateProviderRequest(
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
    string? WorkingHours,
    int? ExperienceYears,
    bool EmergencyService,
    bool OnsiteService);