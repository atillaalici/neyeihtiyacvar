using System.Globalization;
using System.Net.Mail;
using System.Security.Claims;
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
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            IPasswordHasher<AppUser> passwordHasher,
            JwtTokenService tokenService) =>
        {
            AppUser? authenticatedUser = null;

            if (principal.Identity?.IsAuthenticated == true &&
                Guid.TryParse(
                    principal.FindFirstValue(ClaimTypes.NameIdentifier),
                    out var authenticatedUserId))
            {
                authenticatedUser = await dbContext.Users
                    .FirstOrDefaultAsync(x =>
                        x.Id == authenticatedUserId &&
                        x.IsActive);

                if (authenticatedUser is null)
                {
                    return Results.Unauthorized();
                }
            }

            var errors = await ValidateAsync(
                request,
                dbContext,
                requirePassword: authenticatedUser is null);

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

            /*
             * MEVCUT KULLANICI AKISI
             * Kullanici zaten giris yapmissa sifre tekrar istenmez.
             * Kimlik, Authorization Bearer token'dan gelir.
             */
            if (authenticatedUser is not null)
            {
                if (!string.Equals(
                        authenticatedUser.NormalizedEmail,
                        normalizedEmail,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return Results.BadRequest(new
                    {
                        message =
                            "İşletme kaydında giriş yaptığın hesabın e-posta adresi kullanılmalıdır."
                    });
                }

                var phoneBelongsToAnotherUser =
                    await dbContext.Users
                        .AsNoTracking()
                        .AnyAsync(x =>
                            x.Id != authenticatedUser.Id &&
                            x.NormalizedPhoneNumber == normalizedPhone);

                if (phoneBelongsToAnotherUser)
                {
                    return Results.Conflict(new
                    {
                        message =
                            "Bu telefon numarası başka bir hesapta kullanılıyor."
                    });
                }

                var hasProvider =
                    await dbContext.Providers
                        .AsNoTracking()
                        .AnyAsync(x =>
                            x.OwnerUserId == authenticatedUser.Id);

                var hasActiveMembership =
                    await dbContext.ProviderMemberships
                        .AsNoTracking()
                        .AnyAsync(x =>
                            x.UserId == authenticatedUser.Id &&
                            x.IsActive);

                if (hasProvider || hasActiveMembership)
                {
                    return Results.Conflict(new
                    {
                        message =
                            "Bu hesap zaten bir işletmeye bağlı."
                    });
                }

                authenticatedUser.DisplayName =
                    string.IsNullOrWhiteSpace(request.ApplicantName)
                        ? authenticatedUser.DisplayName
                        : request.ApplicantName.Trim();

                authenticatedUser.PhoneNumber =
                    FormatPhoneForDisplay(normalizedPhone);
                authenticatedUser.NormalizedPhoneNumber =
                    normalizedPhone;
                authenticatedUser.CitySlug =
                    request.CitySlug.Trim();
                authenticatedUser.DistrictSlug =
                    request.DistrictSlug.Trim();

                // Ödeme tamamlanmadan kullanici Provider rolüne gecmez.
                authenticatedUser.Role = UserRole.User;
                authenticatedUser.UpdatedAtUtc = now;

                await dbContext.SaveChangesAsync();

                var token =
                    tokenService.CreateToken(authenticatedUser);

                return Results.Ok(new
                {
                    accessToken = token.AccessToken,
                    token.ExpiresAtUtc,
                    user = ToUserResponse(authenticatedUser),
                    applicationId = (Guid?)null,
                    providerId = (Guid?)null,
                    verificationRequired =
                        authenticatedUser.EmailVerifiedAtUtc is null ||
                        authenticatedUser.PhoneVerifiedAtUtc is null,
                    existingAccount = true,
                    message =
                        "Mevcut hesabın kullanıldı. İşletme bilgilerin ödeme adımına kadar taslak olarak korunacak."
                });
            }

            /*
             * YENI KULLANICI AKISI
             * Giris yapilmamissa normal hesap olusturma davranisi devam eder.
             */
            var emailExists =
                await dbContext.Users
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.NormalizedEmail == normalizedEmail);

            if (emailExists)
            {
                return Results.Conflict(new
                {
                    message =
                        "Bu e-posta adresiyle zaten bir hesap var. Önce giriş yapıp Hesabım > İşletme Olmak İstiyorum üzerinden devam et."
                });
            }

            var phoneExists =
                await dbContext.Users
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.NormalizedPhoneNumber == normalizedPhone);

            if (phoneExists)
            {
                return Results.Conflict(new
                {
                    message =
                        "Bu telefon numarasıyla zaten bir hesap var. Önce giriş yaparak devam et."
                });
            }

            var user = new AppUser
            {
                Email = email,
                NormalizedEmail = normalizedEmail,
                PhoneNumber = FormatPhoneForDisplay(normalizedPhone),
                NormalizedPhoneNumber = normalizedPhone,
                DisplayName =
                    string.IsNullOrWhiteSpace(request.ApplicantName)
                        ? request.BusinessName.Trim()
                        : request.ApplicantName.Trim(),
                Role = UserRole.User,
                CitySlug = request.CitySlug.Trim(),
                DistrictSlug = request.DistrictSlug.Trim(),
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            user.PasswordHash = passwordHasher.HashPassword(
                user,
                request.Password!);

            // Ödeme tamamlanmadan Provider ve ProviderApplication oluşturulmaz.
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync();

            var newToken = tokenService.CreateToken(user);

            return Results.Created(
                $"/api/users/{user.Id}",
                new
                {
                    accessToken = newToken.AccessToken,
                    newToken.ExpiresAtUtc,
                    user = ToUserResponse(user),
                    applicationId = (Guid?)null,
                    providerId = (Guid?)null,
                    verificationRequired = true,
                    existingAccount = false,
                    message =
                        "Hesabın oluşturuldu. İşletme başvurun ödeme tamamlandıktan sonra oluşturulacak."
                });
        });

        return app;
    }

    private static async Task<Dictionary<string, string[]>>
        ValidateAsync(
            BusinessRegisterRequest request,
            AppDbContext dbContext,
            bool requirePassword)
    {
        var errors =
            new Dictionary<string, string[]>();

        Required(
            errors,
            "businessName",
            request.BusinessName,
            200,
            "İşletme adı");

        Required(
            errors,
            "applicantName",
            request.ApplicantName,
            150,
            "Yetkili kişi adı soyadı");

        Required(
            errors,
            "email",
            request.Email,
            254,
            "E-posta");

        Required(
            errors,
            "phoneNumber",
            request.PhoneNumber,
            30,
            "Telefon");

        Required(
            errors,
            "citySlug",
            request.CitySlug,
            100,
            "İl");

        Required(
            errors,
            "districtSlug",
            request.DistrictSlug,
            100,
            "İlçe");

        Required(
            errors,
            "categorySlug",
            request.CategorySlug,
            100,
            "Ana kategori");

        Required(
            errors,
            "serviceSlug",
            request.ServiceSlug,
            150,
            "Ana hizmet");

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            try
            {
                _ = new MailAddress(
                    request.Email.Trim());
            }
            catch
            {
                errors["email"] =
                    ["Geçerli bir e-posta adresi yazın."];
            }
        }

        if (NormalizePhone(
                request.PhoneNumber ?? string.Empty) is null)
        {
            errors["phoneNumber"] =
                ["Telefon +90 5XX XXX XX XX formatında olmalıdır."];
        }

        if (requirePassword)
        {
            var passwordError =
                ValidatePassword(request.Password);

            if (passwordError is not null)
            {
                errors["password"] =
                    [passwordError];
            }
        }

        if (errors.Count > 0)
        {
            return errors;
        }

        var category =
            await dbContext.Categories
                .AsNoTracking()
                .Include(x => x.Services)
                .FirstOrDefaultAsync(x =>
                    x.Slug == request.CategorySlug.Trim() &&
                    x.IsActive);

        if (category is null)
        {
            errors["categorySlug"] =
                ["Geçerli bir ana kategori seçin."];
        }
        else
        {
            var serviceSlugs =
                category.Services
                    .Where(x => x.IsActive)
                    .Select(x => ToSlug(x.Name))
                    .ToHashSet(
                        StringComparer.OrdinalIgnoreCase);

            if (!serviceSlugs.Contains(
                    request.ServiceSlug.Trim()))
            {
                errors["serviceSlug"] =
                    ["Ana hizmet seçilen ana kategoriye ait olmalıdır."];
            }
        }

        if (!string.IsNullOrWhiteSpace(
                request.AdditionalServiceSlug))
        {
            var additionalCategorySlug =
                string.IsNullOrWhiteSpace(
                    request.AdditionalCategorySlug)
                    ? request.CategorySlug.Trim()
                    : request.AdditionalCategorySlug.Trim();

            var additionalCategory =
                await dbContext.Categories
                    .AsNoTracking()
                    .Include(x => x.Services)
                    .FirstOrDefaultAsync(x =>
                        x.Slug == additionalCategorySlug &&
                        x.IsActive);

            if (additionalCategory is null)
            {
                errors["additionalCategorySlug"] =
                    ["Geçerli bir ek hizmet kategorisi seçin."];
            }
            else
            {
                var additionalServiceSlugs =
                    additionalCategory.Services
                        .Where(x => x.IsActive)
                        .Select(x => ToSlug(x.Name))
                        .ToHashSet(
                            StringComparer.OrdinalIgnoreCase);

                var additionalServiceSlug =
                    request.AdditionalServiceSlug.Trim();

                if (!additionalServiceSlugs.Contains(
                        additionalServiceSlug))
                {
                    errors["additionalServiceSlug"] =
                        ["Ek hizmet seçilen kategoriye ait olmalıdır."];
                }
                else if (
                    string.Equals(
                        additionalCategorySlug,
                        request.CategorySlug.Trim(),
                        StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(
                        additionalServiceSlug,
                        request.ServiceSlug.Trim(),
                        StringComparison.OrdinalIgnoreCase))
                {
                    errors["additionalServiceSlug"] =
                        ["Ek hizmet ana hizmet ile aynı olamaz."];
                }
            }
        }

        var city =
            await dbContext.Cities
                .AsNoTracking()
                .Include(x => x.Districts)
                .FirstOrDefaultAsync(x =>
                    x.Slug == request.CitySlug.Trim() &&
                    x.IsActive);

        if (city is null)
        {
            errors["citySlug"] =
                ["Geçerli bir il seçin."];
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
            errors[key] =
                [$"{label} zorunludur."];
        }
        else if (value.Trim().Length > maxLength)
        {
            errors[key] =
                [$"{label} en fazla {maxLength} karakter olabilir."];
        }
    }

    private static string? NormalizePhone(
        string value)
    {
        var digits =
            new string(
                value.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("90") &&
            digits.Length == 12)
        {
            digits = digits[2..];
        }

        if (digits.StartsWith("0") &&
            digits.Length == 11)
        {
            digits = digits[1..];
        }

        return digits.Length == 10 &&
               digits.StartsWith("5")
            ? $"+90{digits}"
            : null;
    }

    private static string FormatPhoneForDisplay(
        string e164)
    {
        var digits =
            new string(
                e164.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("90") &&
            digits.Length == 12)
        {
            digits = digits[2..];
        }

        return $"+90 {digits[..3]} " +
               $"{digits.Substring(3, 3)} " +
               $"{digits.Substring(6, 2)} " +
               $"{digits.Substring(8, 2)}";
    }

    private static string? ValidatePassword(
        string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return "Şifre zorunludur.";
        }

        if (password.Length < 8)
        {
            return "Şifre en az 8 karakter olmalıdır.";
        }

        if (password.Length > 128)
        {
            return "Şifre en fazla 128 karakter olabilir.";
        }

        if (!password.Any(char.IsUpper) ||
            !password.Any(char.IsLower) ||
            !password.Any(char.IsDigit))
        {
            return
                "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.";
        }

        return null;
    }

    private static object ToUserResponse(
        AppUser user)
        => new
        {
            user.Id,
            user.Email,
            user.PhoneNumber,
            user.DisplayName,
            user.CitySlug,
            user.DistrictSlug,
            user.CreatedAtUtc,
            role =
                user.Role
                    .ToString()
                    .ToLowerInvariant(),
            emailVerified =
                user.EmailVerifiedAtUtc != null,
            phoneVerified =
                user.PhoneVerifiedAtUtc != null
        };

    private static string ToSlug(
        string value)
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

        var normalized =
            value.Normalize(
                NormalizationForm.FormD);

        var builder =
            new StringBuilder();

        foreach (var character in normalized)
        {
            if (
                CharUnicodeInfo.GetUnicodeCategory(
                    character) !=
                UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        var ascii =
            builder
                .ToString()
                .Normalize(
                    NormalizationForm.FormC)
                .ToLowerInvariant();

        ascii =
            Regex.Replace(
                ascii,
                "[^a-z0-9]+",
                "-");

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
    string? AdditionalCategorySlug,
    string? AdditionalServiceSlug,
    string? Password);