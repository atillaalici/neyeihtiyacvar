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
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme bulunamadı."
                });
            }

            var hasOffers = await dbContext.ProviderOffers
                .AsNoTracking()
                .AnyAsync(x => x.ProviderId == id);

            var hasReviews = await dbContext.ProviderReviews
                .AsNoTracking()
                .AnyAsync(x => x.ProviderId == id);

            if (hasOffers || hasReviews)
            {
                return Results.Conflict(new
                {
                    message =
                        "Bu işletmeye bağlı teklif veya değerlendirme kayıtları bulunduğu için kalıcı olarak silinemez."
                });
            }

            dbContext.Providers.Remove(provider);

            try
            {
                await dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Results.Conflict(new
                {
                    message =
                        "Bu işletmeye bağlı başka kayıtlar bulunduğu için silinemedi."
                });
            }

            return Results.Ok(new
            {
                id,
                message = "İşletme kalıcı olarak silindi."
            });
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