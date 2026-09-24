using System.Data;
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

        group.MapPost("/complete-free", async (
            CompleteFreeBusinessRegistrationRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdText = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdText, out var userId)) return Results.Unauthorized();

            await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId && x.IsActive);
            if (user is null) return Results.Unauthorized();

            if (!await dbContext.Set<BillingInformation>().AsNoTracking().AnyAsync(x => x.UserId == userId))
                return Results.BadRequest(new { message = "Önce fatura bilgilerini kaydetmelisin." });

            if (await dbContext.Providers.AsNoTracking().AnyAsync(x => x.OwnerUserId == userId) ||
                await dbContext.ProviderMemberships.AsNoTracking().AnyAsync(x => x.UserId == userId && x.IsActive))
                return Results.Conflict(new { message = "Bu hesap zaten bir işletmeye bağlı." });

            if (string.IsNullOrWhiteSpace(request.BusinessName) || string.IsNullOrWhiteSpace(request.ApplicantName) ||
                string.IsNullOrWhiteSpace(request.PhoneNumber) || string.IsNullOrWhiteSpace(request.CitySlug) ||
                string.IsNullOrWhiteSpace(request.DistrictSlug) || string.IsNullOrWhiteSpace(request.CategorySlug) ||
                string.IsNullOrWhiteSpace(request.ServiceSlug))
                return Results.BadRequest(new { message = "İşletme kayıt bilgileri eksik." });

            if (NormalizePhone(request.PhoneNumber) is null)
                return Results.BadRequest(new { message = "Telefon +90 5XX XXX XX XX formatında olmalıdır." });

            var planCode = request.PlanCode.Trim().ToLowerInvariant();
            var plan = await dbContext.MembershipPlans.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Code == planCode && x.IsActive);
            if (plan is null) return Results.BadRequest(new { message = "Geçerli bir üyelik paketi seçin." });

            var code = Regex.Replace(request.PromotionCode.Trim().ToUpperInvariant(), @"\s+", string.Empty);
            var promo = await dbContext.PromotionCodes.FirstOrDefaultAsync(x => x.Code == code);
            if (promo is null) return Results.NotFound(new { message = "Promosyon kodu bulunamadı." });

            var now = DateTime.UtcNow;
            if (promo.UsedCount > 0 || promo.UsedAtUtc.HasValue)
                return Results.Conflict(new { message = "Bu promosyon kodu daha önce kullanılmış." });
            if (!promo.IsActive) return Results.BadRequest(new { message = "Bu promosyon kodu aktif değil." });
            if (promo.StartsAtUtc.HasValue && promo.StartsAtUtc.Value > now)
                return Results.BadRequest(new { message = "Bu promosyon henüz başlamadı." });
            if (promo.ExpiresAtUtc.HasValue && promo.ExpiresAtUtc.Value < now)
                return Results.BadRequest(new { message = "Bu promosyon kodunun süresi dolmuş." });
            if (!string.IsNullOrWhiteSpace(promo.PlanCode) &&
                !string.Equals(promo.PlanCode, planCode, StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { message = "Bu promosyon kodu seçilen pakette geçerli değil." });

            Guid? organizationId = null;
            if (promo.CampaignId.HasValue)
            {
                var campaign = await dbContext.PromotionCampaigns.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == promo.CampaignId.Value);
                if (campaign is null || !campaign.IsActive)
                    return Results.BadRequest(new { message = "Bu promosyon kampanyası aktif değil." });
                organizationId = campaign.OrganizationId;
                var organization = await dbContext.PromotionOrganizations.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == campaign.OrganizationId);
                if (organization is null || !organization.IsActive)
                    return Results.BadRequest(new { message = "Bu promosyonun bağlı olduğu kurum aktif değil." });
            }

            decimal discountAmount = promo.DiscountType == "percentage"
                ? decimal.Round(plan.AnnualPrice * promo.DiscountValue / 100m, 2, MidpointRounding.AwayFromZero)
                : promo.DiscountValue;
            discountAmount = Math.Clamp(discountAmount, 0m, plan.AnnualPrice);
            var finalPrice = plan.AnnualPrice - discountAmount;
            if (finalPrice != 0m)
                return Results.BadRequest(new { message = "Bu işlem yalnızca son tutarı 0 TL olan promosyonlarda kullanılabilir.", finalPrice });

            var category = await dbContext.Categories.AsNoTracking().Include(x => x.Services)
                .FirstOrDefaultAsync(x => x.Slug == request.CategorySlug.Trim() && x.IsActive);
            if (category is null || !category.Services.Where(x => x.IsActive).Select(x => ToSlug(x.Name))
                    .Contains(request.ServiceSlug.Trim(), StringComparer.OrdinalIgnoreCase))
                return Results.BadRequest(new { message = "Kategori veya hizmet bilgisi geçerli değil." });

            var city = await dbContext.Cities.AsNoTracking().Include(x => x.Districts)
                .FirstOrDefaultAsync(x => x.Slug == request.CitySlug.Trim() && x.IsActive);
            if (city is null || !city.Districts.Any(x => x.Slug == request.DistrictSlug.Trim() && x.IsActive))
                return Results.BadRequest(new { message = "İl veya ilçe bilgisi geçerli değil." });

            var application = new ProviderApplication
            {
                OwnerUserId = userId, BusinessName = request.BusinessName.Trim(), ShortDescription = string.Empty,
                CategorySlug = request.CategorySlug.Trim(), ServiceSlug = request.ServiceSlug.Trim(),
                CitySlug = request.CitySlug.Trim(), DistrictSlug = request.DistrictSlug.Trim(),
                ApplicantName = request.ApplicantName.Trim(), Phone = request.PhoneNumber.Trim(),
                Whatsapp = request.PhoneNumber.Trim(), Status = ProviderApplicationStatus.Pending,
                CreatedAtUtc = now, UpdatedAtUtc = now
            };
            dbContext.ProviderApplications.Add(application);

            var provider = new Provider
            {
                SourceApplicationId = application.Id, OwnerUserId = userId,
                Slug = $"{ToSlug(request.BusinessName)}-{Guid.NewGuid().ToString("N")[..8]}",
                BusinessName = request.BusinessName.Trim(), ShortDescription = string.Empty,
                CategorySlug = request.CategorySlug.Trim(), ServiceSlug = request.ServiceSlug.Trim(),
                AdditionalServices = string.IsNullOrWhiteSpace(request.AdditionalServiceSlug) ? [] : [request.AdditionalServiceSlug.Trim()],
                CitySlug = request.CitySlug.Trim(), DistrictSlug = request.DistrictSlug.Trim(),
                PublicPhone = request.PhoneNumber.Trim(), PublicWhatsapp = request.PhoneNumber.Trim(),
                PublicationStatus = PublicationStatus.Draft, IsActive = true,
                CreatedAtUtc = now, UpdatedAtUtc = now
            };
            dbContext.Providers.Add(provider);

            var membership = new ProviderMembership
            {
                ProviderId = provider.Id, UserId = userId, PlanId = plan.Id,
                AnnualPriceSnapshot = plan.AnnualPrice, ServiceLimitSnapshot = plan.ServiceLimit,
                StartsAtUtc = now, ExpiresAtUtc = null, IsActive = true,
                CreatedAtUtc = now, UpdatedAtUtc = now
            };
            dbContext.ProviderMemberships.Add(membership);

            promo.UsedCount = 1; promo.UsedAtUtc = now; promo.UsedByUserId = userId;
            promo.IsActive = false; promo.UpdatedAtUtc = now;

            var usage = new PromotionUsage
            {
                PromotionCodeId = promo.Id, CampaignId = promo.CampaignId, OrganizationId = organizationId,
                UserId = userId, UserDisplayName = user.DisplayName, UserEmail = user.Email,
                PlanCode = plan.Code, OriginalPrice = plan.AnnualPrice, DiscountAmount = discountAmount,
                FinalPrice = finalPrice, PaymentStatus = "free_completed", UsedAtUtc = now,
                CreatedAtUtc = now, UpdatedAtUtc = now
            };
            dbContext.PromotionUsages.Add(usage);

            user.Role = UserRole.Provider;
            user.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            return Results.Ok(new
            {
                completed = true, applicationId = application.Id, providerId = provider.Id,
                providerSlug = provider.Slug, membershipId = membership.Id, promotionUsageId = usage.Id,
                planCode = plan.Code, originalPrice = plan.AnnualPrice, discountAmount, finalPrice,
                applicationStatus = "pending", publicationStatus = "draft",
                message = "İşletme kaydın tamamlandı. İşletmen yönetim panelinde hazır; yayınlanması yönetici onayından sonra gerçekleşecek."
            });
        }).RequireAuthorization();

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

public sealed record CompleteFreeBusinessRegistrationRequest(
    string PromotionCode,
    string PlanCode,
    string BusinessName,
    string ApplicantName,
    string PhoneNumber,
    string CitySlug,
    string DistrictSlug,
    string CategorySlug,
    string ServiceSlug,
    string? AdditionalCategorySlug,
    string? AdditionalServiceSlug);

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