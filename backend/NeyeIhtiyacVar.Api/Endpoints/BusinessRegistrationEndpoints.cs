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

            // Yeni A-B-C hizmet secimlerinin ilk kayitta dogrulanmasi.
            var abcGroupIds = request.CategoryServiceIds ?? [];
            var abcWorkIds = request.CategoryLibraryWorkIds ?? [];

            if (abcGroupIds.Length == 0 || abcWorkIds.Length == 0)
                return Results.BadRequest(new
                {
                    message = "En az bir B hizmet grubu ve C işi seçmelisiniz."
                });

            if (abcGroupIds.Distinct().Count() != abcGroupIds.Length ||
                abcWorkIds.Distinct().Count() != abcWorkIds.Length)
                return Results.BadRequest(new
                {
                    message = "Hizmet seçimlerinde tekrarlanan kayıtlar bulunuyor."
                });

            var abcLimits = request.PlanCode?.Trim().ToLowerInvariant() switch
            {
                "profesyonel" => (GroupLimit: 12, WorkLimit: (int?)null),
                "avantaj" => (GroupLimit: 5, WorkLimit: (int?)5),
                "kobi" => (GroupLimit: 2, WorkLimit: (int?)3),
                _ => (GroupLimit: 2, WorkLimit: (int?)3)
            };

            if (abcGroupIds.Length > abcLimits.GroupLimit)
                return Results.BadRequest(new
                {
                    message = $"Paketiniz en fazla {abcLimits.GroupLimit} hizmet grubuna izin veriyor."
                });

            var abcGroups = await dbContext.CategoryServices
                .AsNoTracking()
                .Where(x => abcGroupIds.Contains(x.Id) &&
                            x.IsActive &&
                            x.Category.IsActive)
                .CountAsync();

            if (abcGroups != abcGroupIds.Length)
                return Results.BadRequest(new
                {
                    message = "Seçilen hizmet gruplarından biri geçerli değil."
                });

            var abcWorks = await dbContext.CategoryLibraryWorks
                .AsNoTracking()
                .Where(x => abcWorkIds.Contains(x.Id) &&
                            x.IsActive &&
                            abcGroupIds.Contains(x.CategoryServiceId))
                .GroupBy(x => x.CategoryServiceId)
                .Select(x => new
                {
                    GroupId = x.Key,
                    Count = x.Count()
                })
                .ToListAsync();

            if (abcWorks.Sum(x => x.Count) != abcWorkIds.Length)
                return Results.BadRequest(new
                {
                    message = "Seçilen C işlerinden biri geçerli değil."
                });

            if (abcWorks.Count != abcGroupIds.Length)
                return Results.BadRequest(new
                {
                    message = "Her B hizmet grubu için en az bir C işi seçmelisiniz."
                });

            if (abcLimits.WorkLimit.HasValue &&
                abcWorks.Any(x => x.Count > abcLimits.WorkLimit.Value))
                return Results.BadRequest(new
                {
                    message = $"Her B grubunda en fazla {abcLimits.WorkLimit.Value} C işi seçebilirsiniz."
                });

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
                        authenticatedUser.EmailVerifiedAtUtc is null,
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
            AppDbContext dbContext,
            IConfiguration configuration) =>
        {
            var userIdText = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdText, out var userId)) return Results.Unauthorized();

            await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);

            var lockedUsers = await dbContext.Users
                .FromSqlInterpolated($@"SELECT * FROM ""Users"" WHERE ""Id"" = {userId} AND ""IsActive"" = TRUE FOR UPDATE")
                .ToListAsync();

            var user = lockedUsers.FirstOrDefault();

            if (user is null) return Results.Unauthorized();

            if (user.EmailVerifiedAtUtc is null)
                return Results.BadRequest(new
                {
                    message = "Ücretsiz üyelik için önce e-posta adresinizi doğrulamalısınız."
                });

            if (!string.Equals(request.PromotionCode?.Trim(), "AUTO-FIRST500", StringComparison.OrdinalIgnoreCase) &&
                !await dbContext.Set<BillingInformation>().AsNoTracking().AnyAsync(x => x.UserId == userId))
                return Results.BadRequest(new { message = "Önce fatura bilgilerini kaydetmelisin." });

            if (await dbContext.Providers.AsNoTracking().AnyAsync(x => x.OwnerUserId == userId) ||
                await dbContext.ProviderMemberships.AsNoTracking().AnyAsync(x => x.UserId == userId && x.IsActive))
                return Results.Conflict(new { message = "Bu hesap zaten bir işletmeye bağlı." });

            if (string.IsNullOrWhiteSpace(request.BusinessName) || string.IsNullOrWhiteSpace(request.ApplicantName) ||
                string.IsNullOrWhiteSpace(request.PhoneNumber) || string.IsNullOrWhiteSpace(request.CitySlug) ||
                string.IsNullOrWhiteSpace(request.DistrictSlug) ||
                ((request.CategoryServiceIds is null || request.CategoryServiceIds.Length == 0) &&
                 (string.IsNullOrWhiteSpace(request.CategorySlug) ||
                  string.IsNullOrWhiteSpace(request.ServiceSlug))))
                return Results.BadRequest(new { message = "İşletme kayıt bilgileri eksik." });

            if (NormalizePhone(request.PhoneNumber) is null)
                return Results.BadRequest(new { message = "Telefon +90 5XX XXX XX XX formatında olmalıdır." });

            if (!request.LegalAccepted)
                return Results.BadRequest(new
                {
                    message = "Ücretli İşletme Üyeliği ve Dijital Vitrin Sözleşmesi kabul edilmelidir."
                });

            var planCode = request.PlanCode.Trim().ToLowerInvariant();
            var plan = await dbContext.MembershipPlans.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Code == planCode && x.IsActive);
            if (plan is null) return Results.BadRequest(new { message = "Geçerli bir üyelik paketi seçin." });

            var code = Regex.Replace(request.PromotionCode.Trim().ToUpperInvariant(), @"\s+", string.Empty);
            var now = DateTime.UtcNow;

            PromotionCode? promo;

            if (code == "AUTO-FIRST500")
            {
                var campaignPrefix = configuration["Promotions:First500CodePrefix"]?.Trim();

                if (string.IsNullOrWhiteSpace(campaignPrefix))
                    return Results.BadRequest(new { message = "Otomatik kampanya henüz yapılandırılmamış." });

                if (planCode != "kobi")
                    return Results.BadRequest(new { message = "İlk 500 işletme kampanyası yalnızca KOBİ paketinde geçerlidir." });

                promo = (await First500PromotionQuery
                    .Available(dbContext, campaignPrefix, now)
                    .ToListAsync())
                    .FirstOrDefault();

                if (promo is null)
                    return Results.Conflict(new { message = "İlk 500 işletme kampanyasının kontenjanı dolmuş veya kampanya sona ermiştir." });
            }
            else
            {
                promo = await dbContext.PromotionCodes.FirstOrDefaultAsync(x => x.Code == code);
                if (promo is null)
                    return Results.NotFound(new { message = "Promosyon kodu bulunamadı." });
            }
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

            // Yeni A-B-C secimlerinde eski kategori/hizmet alanlarini
            // sunucuda, secilen ilk B grubundan otomatik olustur.
            var legacyCategorySlug = request.CategorySlug?.Trim() ?? string.Empty;
            var legacyServiceSlug = request.ServiceSlug?.Trim() ?? string.Empty;

            if (request.CategoryServiceIds is { Length: > 0 })
            {
                var primaryGroupId = request.CategoryServiceIds[0];

                var primaryGroup = await dbContext.CategoryServices
                    .AsNoTracking()
                    .Where(x => x.Id == primaryGroupId &&
                                x.IsActive &&
                                x.Category.IsActive)
                    .Select(x => new
                    {
                        CategorySlug = x.Category.Slug,
                        ServiceName = x.Name
                    })
                    .FirstOrDefaultAsync();

                if (primaryGroup is null)
                    return Results.BadRequest(new { message = "Ana hizmet grubu geçerli değil." });

                legacyCategorySlug = primaryGroup.CategorySlug;
                legacyServiceSlug = RegistrationValidationHelper.ToSlug(primaryGroup.ServiceName);
            }
            else
            {
                var category = await dbContext.Categories.AsNoTracking().Include(x => x.Services)
                    .FirstOrDefaultAsync(x => x.Slug == legacyCategorySlug && x.IsActive);

                if (category is null ||
                    !category.Services.Where(x => x.IsActive)
                        .Select(x => RegistrationValidationHelper.ToSlug(x.Name))
                        .Contains(legacyServiceSlug, StringComparer.OrdinalIgnoreCase))
                    return Results.BadRequest(new { message = "Kategori veya hizmet bilgisi geçerli değil." });
            }

            // Yeni A-B-C katalog secimlerinin sunucu tarafinda dogrulanmasi.
            var selectedGroupIds = request.CategoryServiceIds ?? [];
            var selectedWorkIds = request.CategoryLibraryWorkIds ?? [];
            var hasNewSelections =
                request.CategoryServiceIds is not null ||
                request.CategoryLibraryWorkIds is not null;

            if (hasNewSelections)
            {
                if (selectedGroupIds.Length == 0 || selectedWorkIds.Length == 0)
                    return Results.BadRequest(new
                    {
                        message = "En az bir hizmet grubu ve bu gruba bağlı bir iş seçmelisiniz."
                    });

                if (selectedGroupIds.Distinct().Count() != selectedGroupIds.Length ||
                    selectedWorkIds.Distinct().Count() != selectedWorkIds.Length)
                    return Results.BadRequest(new
                    {
                        message = "Hizmet seçimlerinde tekrarlanan kayıtlar bulunuyor."
                    });

                if (selectedGroupIds.Length > plan.ServiceLimit)
                    return Results.BadRequest(new
                    {
                        message = $"Paketiniz en fazla {plan.ServiceLimit} hizmet grubuna izin veriyor."
                    });

                var validGroups = await dbContext.CategoryServices
                    .AsNoTracking()
                    .Where(x => selectedGroupIds.Contains(x.Id) &&
                                x.IsActive &&
                                x.Category.IsActive)
                    .CountAsync();

                if (validGroups != selectedGroupIds.Length)
                    return Results.BadRequest(new
                    {
                        message = "Seçilen hizmet gruplarından biri geçerli değil."
                    });

                var validWorks = await dbContext.CategoryLibraryWorks
                    .AsNoTracking()
                    .Where(x => selectedWorkIds.Contains(x.Id) &&
                                x.IsActive &&
                                selectedGroupIds.Contains(x.CategoryServiceId))
                    .CountAsync();

                if (validWorks != selectedWorkIds.Length)
                    return Results.BadRequest(new
                    {
                        message = "Seçilen işlerden biri hizmet gruplarınızla eşleşmiyor."
                    });

                // Her B grubunun kendi C secim limiti vardir.
                // Profesyonel pakette C secimi sinirsizdir.
                int? workLimit = plan.ServiceLimit switch
                {
                    2 => 3,
                    5 => 5,
                    12 => null,
                    _ => 3
                };

                var workCounts = await dbContext.CategoryLibraryWorks
                    .AsNoTracking()
                    .Where(x => selectedWorkIds.Contains(x.Id))
                    .GroupBy(x => x.CategoryServiceId)
                    .Select(x => new
                    {
                        GroupId = x.Key,
                        Count = x.Count()
                    })
                    .ToListAsync();

                if (workCounts.Count != selectedGroupIds.Length)
                    return Results.BadRequest(new
                    {
                        message = "Her hizmet grubu için en az bir iş seçmelisiniz."
                    });

                if (workLimit.HasValue &&
                    workCounts.Any(x => x.Count > workLimit.Value))
                    return Results.BadRequest(new
                    {
                        message = $"Her hizmet grubunda en fazla {workLimit.Value} iş seçebilirsiniz."
                    });
            }

            var city = await dbContext.Cities.AsNoTracking().Include(x => x.Districts)
                .FirstOrDefaultAsync(x => x.Slug == request.CitySlug.Trim() && x.IsActive);
            if (city is null || !city.Districts.Any(x => x.Slug == request.DistrictSlug.Trim() && x.IsActive))
                return Results.BadRequest(new { message = "İl veya ilçe bilgisi geçerli değil." });

            var application = new ProviderApplication
            {
                OwnerUserId = userId, BusinessName = request.BusinessName.Trim(), ShortDescription = string.Empty,
                CategorySlug = legacyCategorySlug, ServiceSlug = legacyServiceSlug,
                CitySlug = request.CitySlug.Trim(), DistrictSlug = request.DistrictSlug.Trim(),
                PublicAddress = request.PublicAddress?.Trim(),
                Latitude = request.Latitude, Longitude = request.Longitude,
                ApplicantName = request.ApplicantName.Trim(), Phone = request.PhoneNumber.Trim(),
                Whatsapp = request.PhoneNumber.Trim(), Status = ProviderApplicationStatus.Pending,
                CreatedAtUtc = now, UpdatedAtUtc = now
            };
            dbContext.ProviderApplications.Add(application);

            var provider = new Provider
            {
                SourceApplicationId = application.Id, OwnerUserId = userId,
                Slug = $"{RegistrationValidationHelper.ToSlug(request.BusinessName)}-{Guid.NewGuid().ToString("N")[..8]}",
                BusinessName = request.BusinessName.Trim(), ShortDescription = string.Empty,
                CategorySlug = legacyCategorySlug, ServiceSlug = legacyServiceSlug,
                AdditionalServices = string.IsNullOrWhiteSpace(request.AdditionalServiceSlug) ? [] : [request.AdditionalServiceSlug.Trim()],
                CitySlug = request.CitySlug.Trim(), DistrictSlug = request.DistrictSlug.Trim(),
                PublicAddress = request.PublicAddress?.Trim(),
                Latitude = request.Latitude, Longitude = request.Longitude,
                PublicPhone = request.PhoneNumber.Trim(), PublicWhatsapp = request.PhoneNumber.Trim(),
                PublicationStatus = PublicationStatus.Draft, IsActive = true,
                CreatedAtUtc = now, UpdatedAtUtc = now
            };
            dbContext.Providers.Add(provider);

            if (hasNewSelections)
            {
                dbContext.ProviderCategoryLibraryWorks.AddRange(
                    selectedWorkIds.Select(workId =>
                        new ProviderCategoryLibraryWork
                        {
                            ProviderId = provider.Id,
                            CategoryLibraryWorkId = workId
                        }));
            }

            var membership = new ProviderMembership
            {
                ProviderId = provider.Id, UserId = userId, PlanId = plan.Id,
                AnnualPriceSnapshot = plan.AnnualPrice, ServiceLimitSnapshot = plan.ServiceLimit,
                StartsAtUtc = now, ExpiresAtUtc = now.AddYears(1), IsActive = true,
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

            var membershipAgreementAcceptance = new LegalAcceptance
            {
                UserId = userId,
                DocumentCode = "ucretli-isletme-uyeligi",
                DocumentVersion = "2026-10-01",
                ActionType = "initial_membership",
                PlanCode = plan.Code,
                PlanName = plan.Name,
                OriginalPrice = plan.AnnualPrice,
                DiscountAmount = discountAmount,
                FinalPrice = finalPrice,
                PromotionCode = promo.Code,
                AcceptedAtUtc = now
            };

            var refundPolicyAcceptance = new LegalAcceptance
            {
                UserId = userId,
                DocumentCode = "iptal-iade-politikasi",
                DocumentVersion = "2026-10-01",
                ActionType = "initial_membership",
                PlanCode = plan.Code,
                PlanName = plan.Name,
                OriginalPrice = plan.AnnualPrice,
                DiscountAmount = discountAmount,
                FinalPrice = finalPrice,
                PromotionCode = promo.Code,
                AcceptedAtUtc = now
            };

            dbContext.LegalAcceptances.AddRange(
                membershipAgreementAcceptance,
                refundPolicyAcceptance);

            user.Role = UserRole.Provider;
            user.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            return Results.Ok(new
            {
                completed = true, applicationId = application.Id, providerId = provider.Id,
                providerSlug = provider.Slug, membershipId = membership.Id, promotionUsageId = usage.Id,
                legalAcceptanceIds = new[]
                {
                    membershipAgreementAcceptance.Id,
                    refundPolicyAcceptance.Id
                },
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

        // Yeni A-B-C secimlerinde eski kategori alanlari zorunlu degildir.
        if (request.CategoryServiceIds is not { Length: > 0 })
        {
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

        }

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

        if (request.CategoryServiceIds is not { Length: > 0 })
        {
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
                    .Select(x => RegistrationValidationHelper.ToSlug(x.Name))
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
                        .Select(x => RegistrationValidationHelper.ToSlug(x.Name))
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
    string? AdditionalServiceSlug,
    bool LegalAccepted,
    string? PublicAddress = null,
    double? Latitude = null,
    double? Longitude = null,
    Guid[]? CategoryServiceIds = null,
    Guid[]? CategoryLibraryWorkIds = null);

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
    string? Password,
    Guid[]? CategoryServiceIds = null,
    Guid[]? CategoryLibraryWorkIds = null,
    string? PlanCode = null);