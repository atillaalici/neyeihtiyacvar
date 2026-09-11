using System.Globalization;
using System.Net.Mail;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Auth;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class BusinessRegistrationEndpoints
{
    public static IEndpointRouteBuilder MapBusinessRegistrationEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/provider-applications");

        group.MapPost("/register", async (
            BusinessRegisterRequest request,
            AppDbContext dbContext,
            IPasswordHasher<AppUser> passwordHasher,
            JwtTokenService tokenService) =>
        {
            var errors = await ValidateAsync(request, dbContext);

            if (errors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Kayıt bilgileri geçerli değil.",
                    errors
                });
            }

            var email = request.Email.Trim().ToLowerInvariant();
            var normalizedEmail = email.ToUpperInvariant();
            var normalizedPhone = NormalizePhone(request.PhoneNumber)!;
            var now = DateTime.UtcNow;

            if (await dbContext.Users.AsNoTracking()
                .AnyAsync(x => x.NormalizedEmail == normalizedEmail))
            {
                return Results.Conflict(new
                {
                    message = "Bu e-posta adresiyle daha önce hesap oluşturulmuş."
                });
            }

            if (await dbContext.Users.AsNoTracking()
                .AnyAsync(x => x.NormalizedPhoneNumber == normalizedPhone))
            {
                return Results.Conflict(new
                {
                    message = "Bu telefon numarasıyla daha önce hesap oluşturulmuş."
                });
            }

            var category = await dbContext.Categories
                .AsNoTracking()
                .Include(x => x.Services)
                .FirstAsync(x =>
                    x.Slug == request.CategorySlug.Trim() &&
                    x.IsActive);

            var user = new AppUser
            {
                Email = email,
                NormalizedEmail = normalizedEmail,
                PhoneNumber = FormatPhoneForDisplay(normalizedPhone),
                NormalizedPhoneNumber = normalizedPhone,
                DisplayName = request.BusinessName.Trim(),
                Role = UserRole.Provider,
                CitySlug = request.CitySlug.Trim(),
                DistrictSlug = request.DistrictSlug.Trim(),
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            user.PasswordHash = passwordHasher.HashPassword(
                user,
                request.Password);

            var application = new ProviderApplication
            {
                BusinessName = request.BusinessName.Trim(),
                ShortDescription = $"{request.BusinessName.Trim()} - {category.Name}",
                CategorySlug = request.CategorySlug.Trim(),
                ServiceSlug = request.ServiceSlug.Trim(),
                CitySlug = request.CitySlug.Trim(),
                DistrictSlug = request.DistrictSlug.Trim(),
                ApplicantName = request.ApplicantName.Trim(),
                Phone = normalizedPhone,
                Status = ProviderApplicationStatus.Pending,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            var providerSlug = await CreateUniqueProviderSlugAsync(
                ToSlug(request.BusinessName),
                dbContext);

            var additionalServices =
                string.IsNullOrWhiteSpace(request.AdditionalServiceSlug)
                    ? Array.Empty<string>()
                    : [request.AdditionalServiceSlug.Trim()];

            var provider = new Provider
            {
                SourceApplicationId = application.Id,
                OwnerUserId = user.Id,
                Slug = providerSlug,
                BusinessName = request.BusinessName.Trim(),
                ShortDescription = $"{request.BusinessName.Trim()} - {category.Name}",
                CategorySlug = request.CategorySlug.Trim(),
                ServiceSlug = request.ServiceSlug.Trim(),
                AdditionalServices = additionalServices,
                CitySlug = request.CitySlug.Trim(),
                DistrictSlug = request.DistrictSlug.Trim(),
                PublicPhone = normalizedPhone,
                PublicationStatus = PublicationStatus.Draft,
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            await using var transaction =
                await dbContext.Database.BeginTransactionAsync();

            dbContext.Users.Add(user);
            dbContext.ProviderApplications.Add(application);
            dbContext.Providers.Add(provider);

            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            var token = tokenService.CreateToken(user);

            return Results.Created(
                $"/api/provider-applications/{application.Id}",
                new
                {
                    accessToken = token.AccessToken,
                    token.ExpiresAtUtc,
                    user = new
                    {
                        user.Id,
                        user.Email,
                        user.PhoneNumber,
                        user.DisplayName,
                        user.CitySlug,
                        user.DistrictSlug,
                        user.CreatedAtUtc,
                        role = user.Role.ToString().ToLowerInvariant(),
                        emailVerified = false,
                        phoneVerified = false
                    },
                    applicationId = application.Id,
                    providerId = provider.Id,
                    verificationRequired = true,
                    message = "İşletme hesabın ve başvurun oluşturuldu. Doğrulama e-postası henüz gönderilmedi."
                });
        });

        return app;
    }

    private static async Task<Dictionary<string, string[]>> ValidateAsync(
        BusinessRegisterRequest request,
        AppDbContext dbContext)
    {
        var errors = new Dictionary<string, string[]>();

        Required(errors, "businessName", request.BusinessName, 200, "İşletme adı");
        Required(errors, "applicantName", request.ApplicantName, 150, "Yetkili kişi adı soyadı");
        Required(errors, "email", request.Email, 254, "E-posta");
        Required(errors, "phoneNumber", request.PhoneNumber, 30, "Telefon");
        Required(errors, "citySlug", request.CitySlug, 100, "İl");
        Required(errors, "districtSlug", request.DistrictSlug, 100, "İlçe");
        Required(errors, "categorySlug", request.CategorySlug, 100, "Ana kategori");
        Required(errors, "serviceSlug", request.ServiceSlug, 150, "Ana hizmet");

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            try
            {
                _ = new MailAddress(request.Email.Trim());
            }
            catch
            {
                errors["email"] = ["Geçerli bir e-posta adresi yazın."];
            }
        }

        if (NormalizePhone(request.PhoneNumber ?? string.Empty) is null)
        {
            errors["phoneNumber"] =
                ["Telefon +90 5XX XXX XX XX formatında olmalıdır."];
        }

        var passwordError = ValidatePassword(request.Password);

        if (passwordError is not null)
        {
            errors["password"] = [passwordError];
        }

        if (errors.Count > 0)
        {
            return errors;
        }

        var category = await dbContext.Categories
            .AsNoTracking()
            .Include(x => x.Services)
            .FirstOrDefaultAsync(x =>
                x.Slug == request.CategorySlug.Trim() &&
                x.IsActive);

        if (category is null)
        {
            errors["categorySlug"] = ["Geçerli bir ana kategori seçin."];
        }
        else
        {
            var serviceSlugs = category.Services
                .Where(x => x.IsActive)
                .Select(x => ToSlug(x.Name))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (!serviceSlugs.Contains(request.ServiceSlug.Trim()))
            {
                errors["serviceSlug"] =
                    ["Ana hizmet seçilen ana kategoriye ait olmalıdır."];
            }

            if (!string.IsNullOrWhiteSpace(request.AdditionalServiceSlug))
            {
                var additional = request.AdditionalServiceSlug.Trim();

                if (!serviceSlugs.Contains(additional))
                {
                    errors["additionalServiceSlug"] =
                        ["Ek hizmet seçilen ana kategoriye ait olmalıdır."];
                }
                else if (string.Equals(
                             additional,
                             request.ServiceSlug.Trim(),
                             StringComparison.OrdinalIgnoreCase))
                {
                    errors["additionalServiceSlug"] =
                        ["Ek hizmet ana hizmet ile aynı olamaz."];
                }
            }
        }

        var city = await dbContext.Cities
            .AsNoTracking()
            .Include(x => x.Districts)
            .FirstOrDefaultAsync(x =>
                x.Slug == request.CitySlug.Trim() &&
                x.IsActive);

        if (city is null)
        {
            errors["citySlug"] = ["Geçerli bir il seçin."];
        }
        else if (!city.Districts.Any(x =>
                     x.Slug == request.DistrictSlug.Trim() &&
                     x.IsActive))
        {
            errors["districtSlug"] =
                ["Seçilen ilçenin ile ait olduğunu kontrol edin."];
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

    private static string? NormalizePhone(string value)
    {
        var digits = new string(value.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("90") && digits.Length == 12)
        {
            digits = digits[2..];
        }

        if (digits.StartsWith("0") && digits.Length == 11)
        {
            digits = digits[1..];
        }

        return digits.Length == 10 && digits.StartsWith("5")
            ? $"+90{digits}"
            : null;
    }

    private static string FormatPhoneForDisplay(string e164)
    {
        var digits = new string(e164.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("90") && digits.Length == 12)
        {
            digits = digits[2..];
        }

        return $"+90 {digits[..3]} {digits.Substring(3, 3)} {digits.Substring(6, 2)} {digits.Substring(8, 2)}";
    }

    private static string? ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            return "Şifre zorunludur.";

        if (password.Length < 8)
            return "Şifre en az 8 karakter olmalıdır.";

        if (password.Length > 128)
            return "Şifre en fazla 128 karakter olabilir.";

        if (!password.Any(char.IsUpper) ||
            !password.Any(char.IsLower) ||
            !password.Any(char.IsDigit))
        {
            return "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.";
        }

        return null;
    }

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

public sealed record BusinessRegisterRequest(
    string BusinessName,
    string ApplicantName,
    string Email,
    string PhoneNumber,
    string CitySlug,
    string DistrictSlug,
    string CategorySlug,
    string ServiceSlug,
    string? AdditionalServiceSlug,
    string Password);
