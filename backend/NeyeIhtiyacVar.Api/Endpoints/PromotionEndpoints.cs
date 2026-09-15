using System.Data;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class PromotionEndpoints
{
    public static IEndpointRouteBuilder MapPromotionEndpoints(
        this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/api/admin/promotions")
            .RequireAuthorization(policy =>
                policy.RequireRole(UserRole.Admin.ToString()));

        admin.MapGet("/", async (AppDbContext dbContext) =>
        {
            var now = DateTime.UtcNow;

            var codes = await dbContext.PromotionCodes
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToListAsync();

            var campaigns = await dbContext.PromotionCampaigns
                .AsNoTracking()
                .ToDictionaryAsync(x => x.Id);

            var organizations = await dbContext.PromotionOrganizations
                .AsNoTracking()
                .ToDictionaryAsync(x => x.Id);

            var items = codes.Select(x =>
            {
                PromotionCampaign? campaign = null;
                PromotionOrganization? organization = null;

                if (x.CampaignId.HasValue)
                {
                    if (campaigns.TryGetValue(
                        x.CampaignId.Value,
                        out var foundCampaign))
                    {
                        campaign = foundCampaign;

                        if (organizations.TryGetValue(
                            foundCampaign.OrganizationId,
                            out var foundOrganization))
                        {
                            organization = foundOrganization;
                        }
                    }
                }

                return new
                {
                    x.Id,
                    x.Code,
                    x.Description,
                    x.DiscountType,
                    x.DiscountValue,
                    x.PlanCode,
                    maxUses = 1,
                    x.UsedCount,
                    x.UsedAtUtc,
                    x.UsedByUserId,
                    x.StartsAtUtc,
                    x.ExpiresAtUtc,
                    x.IsActive,
                    x.CampaignId,
                    campaignName = campaign?.Name,
                    organizationId = organization?.Id,
                    organizationName = organization?.Name,
                    status = CodeStatus(x, now),
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc
                };
            });

            return Results.Ok(items);
        });

        admin.MapGet("/organizations", async (AppDbContext dbContext) =>
        {
            var organizations = await dbContext.PromotionOrganizations
                .AsNoTracking()
                .OrderBy(x => x.Name)
                .ToListAsync();

            var campaignCounts = await dbContext.PromotionCampaigns
                .AsNoTracking()
                .GroupBy(x => x.OrganizationId)
                .Select(x => new
                {
                    OrganizationId = x.Key,
                    Count = x.Count()
                })
                .ToDictionaryAsync(x => x.OrganizationId, x => x.Count);

            var result = organizations.Select(x => new
            {
                x.Id,
                x.Name,
                x.Type,
                x.ContactName,
                x.ContactPhone,
                x.ContactEmail,
                x.Notes,
                x.IsActive,
                campaignCount = campaignCounts.GetValueOrDefault(x.Id),
                x.CreatedAtUtc,
                x.UpdatedAtUtc
            });

            return Results.Ok(result);
        });

        admin.MapPost("/organizations", async (
            CreatePromotionOrganizationRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new
                {
                    message = "Kurum / oda / firma adı zorunludur."
                });
            }

            var now = DateTime.UtcNow;
            var item = new PromotionOrganization
            {
                Name = request.Name.Trim(),
                Type = NormalizeOrganizationType(request.Type),
                ContactName = Optional(request.ContactName),
                ContactPhone = NormalizeContactPhone(request.ContactPhone),
                ContactEmail = Optional(request.ContactEmail),
                Notes = Optional(request.Notes),
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.PromotionOrganizations.Add(item);
            AddAudit(
                dbContext,
                principal,
                "promotion.organization.create",
                "promotion_organization",
                item.Id,
                item.Name,
                $"Promosyon kurumu oluşturuldu: {item.Name}",
                now);

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                item.Id,
                item.Name,
                item.Type,
                item.ContactName,
                item.ContactPhone,
                item.ContactEmail,
                item.Notes,
                item.IsActive,
                item.CreatedAtUtc
            });
        });

        admin.MapPost("/organizations/{id:guid}/status", async (
            Guid id,
            PromotionStatusRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var item = await dbContext.PromotionOrganizations
                .FirstOrDefaultAsync(x => x.Id == id);

            if (item is null)
            {
                return Results.NotFound(new { message = "Kurum bulunamadı." });
            }

            item.IsActive = request.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            AddAudit(
                dbContext,
                principal,
                request.IsActive
                    ? "promotion.organization.activate"
                    : "promotion.organization.deactivate",
                "promotion_organization",
                item.Id,
                item.Name,
                request.IsActive
                    ? $"Promosyon kurumu aktif edildi: {item.Name}"
                    : $"Promosyon kurumu pasif edildi: {item.Name}",
                DateTime.UtcNow);

            await dbContext.SaveChangesAsync();

            return Results.Ok(new { item.Id, item.IsActive });
        });

        admin.MapGet("/campaigns", async (AppDbContext dbContext) =>
        {
            var now = DateTime.UtcNow;

            var campaigns = await dbContext.PromotionCampaigns
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToListAsync();

            var organizations = await dbContext.PromotionOrganizations
                .AsNoTracking()
                .ToDictionaryAsync(x => x.Id);

            var codes = await dbContext.PromotionCodes
                .AsNoTracking()
                .Where(x => x.CampaignId != null)
                .ToListAsync();

            var usages = await dbContext.PromotionUsages
                .AsNoTracking()
                .Where(x => x.CampaignId != null)
                .ToListAsync();

            var result = campaigns.Select(campaign =>
            {
                var campaignCodes = codes
                    .Where(x => x.CampaignId == campaign.Id)
                    .ToList();

                var campaignUsages = usages
                    .Where(x => x.CampaignId == campaign.Id)
                    .ToList();

                var used = campaignCodes.Count(x => x.UsedCount > 0);
                var expired = campaignCodes.Count(x =>
                    x.UsedCount == 0 &&
                    x.ExpiresAtUtc.HasValue &&
                    x.ExpiresAtUtc.Value < now);

                var available = campaignCodes.Count(x =>
                    x.UsedCount == 0 &&
                    x.IsActive &&
                    (!x.StartsAtUtc.HasValue || x.StartsAtUtc.Value <= now) &&
                    (!x.ExpiresAtUtc.HasValue || x.ExpiresAtUtc.Value >= now));

                organizations.TryGetValue(
                    campaign.OrganizationId,
                    out var organization);

                return new
                {
                    campaign.Id,
                    campaign.OrganizationId,
                    organizationName = organization?.Name ?? "Bilinmeyen kurum",
                    organizationType = organization?.Type ?? "kurum",
                    campaign.Name,
                    campaign.CodePrefix,
                    campaign.Description,
                    campaign.DiscountType,
                    campaign.DiscountValue,
                    campaign.PlanCode,
                    campaign.Quantity,
                    campaign.StartsAtUtc,
                    campaign.ExpiresAtUtc,
                    campaign.IsActive,
                    totalCodes = campaignCodes.Count,
                    usedCodes = used,
                    expiredCodes = expired,
                    availableCodes = available,
                    totalDiscount = campaignUsages.Sum(x => x.DiscountAmount),
                    participantCount = campaignUsages.Count,
                    campaign.CreatedAtUtc
                };
            });

            return Results.Ok(result);
        });

        admin.MapPost("/campaigns", async (
            CreatePromotionCampaignRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var validation = ValidateCampaign(request);

            if (validation is not null)
            {
                return Results.BadRequest(new { message = validation });
            }

            var organization = await dbContext.PromotionOrganizations
                .FirstOrDefaultAsync(x =>
                    x.Id == request.OrganizationId &&
                    x.IsActive);

            if (organization is null)
            {
                return Results.BadRequest(new
                {
                    message = "Aktif bir kurum / oda / firma seçin."
                });
            }

            var now = DateTime.UtcNow;
            var prefix = NormalizePrefix(request.CodePrefix);

            var campaign = new PromotionCampaign
            {
                OrganizationId = organization.Id,
                Name = request.Name.Trim(),
                CodePrefix = prefix,
                Description = Optional(request.Description),
                DiscountType = request.DiscountType.Trim().ToLowerInvariant(),
                DiscountValue = request.DiscountValue,
                PlanCode = NormalizePlan(request.PlanCode),
                Quantity = request.Quantity,
                StartsAtUtc = request.StartsAtUtc,
                ExpiresAtUtc = request.ExpiresAtUtc,
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.PromotionCampaigns.Add(campaign);

            var generated = new List<PromotionCode>();

            for (var i = 0; i < request.Quantity; i++)
            {
                string code;

                do
                {
                    code = $"{prefix}-{CreateRandomCode(8)}";
                }
                while (
                    generated.Any(x => x.Code == code) ||
                    await dbContext.PromotionCodes
                        .AsNoTracking()
                        .AnyAsync(x => x.Code == code));

                generated.Add(new PromotionCode
                {
                    Code = code,
                    Description =
                        Optional(request.Description) ??
                        $"{organization.Name} - {campaign.Name}",
                    DiscountType = campaign.DiscountType,
                    DiscountValue = campaign.DiscountValue,
                    PlanCode = campaign.PlanCode,
                    MaxUses = 1,
                    UsedCount = 0,
                    CampaignId = campaign.Id,
                    StartsAtUtc = campaign.StartsAtUtc,
                    ExpiresAtUtc = campaign.ExpiresAtUtc,
                    IsActive = true,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                });
            }

            dbContext.PromotionCodes.AddRange(generated);

            AddAudit(
                dbContext,
                principal,
                "promotion.campaign.create",
                "promotion_campaign",
                campaign.Id,
                campaign.Name,
                $"{organization.Name} için {request.Quantity} tek kullanımlık kod oluşturuldu.",
                now);

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                campaignId = campaign.Id,
                campaignName = campaign.Name,
                organizationId = organization.Id,
                organizationName = organization.Name,
                generatedCount = generated.Count,
                codes = generated.Select(x => x.Code)
            });
        });

        admin.MapGet("/campaigns/{id:guid}", async (
            Guid id,
            AppDbContext dbContext) =>
        {
            var campaign = await dbContext.PromotionCampaigns
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (campaign is null)
            {
                return Results.NotFound(new
                {
                    message = "Kampanya bulunamadı."
                });
            }

            var organization = await dbContext.PromotionOrganizations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == campaign.OrganizationId);

            var codes = await dbContext.PromotionCodes
                .AsNoTracking()
                .Where(x => x.CampaignId == id)
                .OrderBy(x => x.Code)
                .ToListAsync();

            var usages = await dbContext.PromotionUsages
                .AsNoTracking()
                .Where(x => x.CampaignId == id)
                .OrderByDescending(x => x.UsedAtUtc)
                .ToListAsync();

            var now = DateTime.UtcNow;

            return Results.Ok(new
            {
                campaign = new
                {
                    campaign.Id,
                    campaign.Name,
                    campaign.CodePrefix,
                    campaign.Description,
                    campaign.DiscountType,
                    campaign.DiscountValue,
                    campaign.PlanCode,
                    campaign.Quantity,
                    campaign.StartsAtUtc,
                    campaign.ExpiresAtUtc,
                    campaign.IsActive
                },
                organization = organization is null
                    ? null
                    : new
                    {
                        organization.Id,
                        organization.Name,
                        organization.Type
                    },
                summary = new
                {
                    total = codes.Count,
                    used = codes.Count(x => x.UsedCount > 0),
                    expired = codes.Count(x =>
                        x.UsedCount == 0 &&
                        x.ExpiresAtUtc.HasValue &&
                        x.ExpiresAtUtc.Value < now),
                    available = codes.Count(x =>
                        x.UsedCount == 0 &&
                        x.IsActive &&
                        (!x.StartsAtUtc.HasValue ||
                         x.StartsAtUtc.Value <= now) &&
                        (!x.ExpiresAtUtc.HasValue ||
                         x.ExpiresAtUtc.Value >= now)),
                    totalDiscount = usages.Sum(x => x.DiscountAmount),
                    participants = usages.Count
                },
                codes = codes.Select(x => new
                {
                    x.Id,
                    x.Code,
                    status = CodeStatus(x, now),
                    x.UsedAtUtc,
                    x.ExpiresAtUtc,
                    x.IsActive
                }),
                usages = usages.Select(x => new
                {
                    x.Id,
                    x.UserId,
                    x.UserDisplayName,
                    x.UserEmail,
                    x.PlanCode,
                    x.OriginalPrice,
                    x.DiscountAmount,
                    x.FinalPrice,
                    x.PaymentStatus,
                    x.UsedAtUtc
                })
            });
        });

        admin.MapPost("/campaigns/{id:guid}/status", async (
            Guid id,
            PromotionStatusRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var campaign = await dbContext.PromotionCampaigns
                .FirstOrDefaultAsync(x => x.Id == id);

            if (campaign is null)
            {
                return Results.NotFound(new { message = "Kampanya bulunamadı." });
            }

            campaign.IsActive = request.IsActive;
            campaign.UpdatedAtUtc = DateTime.UtcNow;

            var codes = await dbContext.PromotionCodes
                .Where(x =>
                    x.CampaignId == id &&
                    x.UsedCount == 0)
                .ToListAsync();

            foreach (var code in codes)
            {
                code.IsActive = request.IsActive;
                code.UpdatedAtUtc = DateTime.UtcNow;
            }

            AddAudit(
                dbContext,
                principal,
                request.IsActive
                    ? "promotion.campaign.activate"
                    : "promotion.campaign.deactivate",
                "promotion_campaign",
                campaign.Id,
                campaign.Name,
                request.IsActive
                    ? $"Kampanya aktif edildi: {campaign.Name}"
                    : $"Kampanya pasif edildi: {campaign.Name}",
                DateTime.UtcNow);

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                campaign.Id,
                campaign.IsActive,
                affectedUnusedCodes = codes.Count
            });
        });

        admin.MapPost("/", async (
            CreatePromotionCodeRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var validation = ValidateSingle(request);

            if (validation is not null)
            {
                return Results.BadRequest(new { message = validation });
            }

            var code = NormalizeCode(request.Code);

            var exists = await dbContext.PromotionCodes
                .AsNoTracking()
                .AnyAsync(x => x.Code == code);

            if (exists)
            {
                return Results.Conflict(new
                {
                    message = "Bu promosyon kodu zaten kullanılıyor."
                });
            }

            var now = DateTime.UtcNow;

            var item = new PromotionCode
            {
                Code = code,
                Description = Optional(request.Description),
                DiscountType = request.DiscountType.Trim().ToLowerInvariant(),
                DiscountValue = request.DiscountValue,
                PlanCode = NormalizePlan(request.PlanCode),
                MaxUses = 1,
                UsedCount = 0,
                StartsAtUtc = request.StartsAtUtc,
                ExpiresAtUtc = request.ExpiresAtUtc,
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.PromotionCodes.Add(item);

            AddAudit(
                dbContext,
                principal,
                "promotion.create",
                "promotion",
                item.Id,
                item.Code,
                $"Tek kullanımlık promosyon kodu oluşturuldu: {item.Code}",
                now);

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                item.Id,
                item.Code,
                item.Description,
                item.DiscountType,
                item.DiscountValue,
                item.PlanCode,
                maxUses = 1,
                item.UsedCount,
                item.StartsAtUtc,
                item.ExpiresAtUtc,
                item.IsActive,
                status = "available",
                item.CreatedAtUtc
            });
        });

        admin.MapPost("/{id:guid}/status", async (
            Guid id,
            PromotionStatusRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var item = await dbContext.PromotionCodes
                .FirstOrDefaultAsync(x => x.Id == id);

            if (item is null)
            {
                return Results.NotFound(new
                {
                    message = "Promosyon kodu bulunamadı."
                });
            }

            if (item.UsedCount > 0 && request.IsActive)
            {
                return Results.Conflict(new
                {
                    message = "Kullanılmış kod tekrar aktif edilemez."
                });
            }

            item.IsActive = request.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            AddAudit(
                dbContext,
                principal,
                request.IsActive
                    ? "promotion.activate"
                    : "promotion.deactivate",
                "promotion",
                item.Id,
                item.Code,
                request.IsActive
                    ? $"Promosyon kodu aktif edildi: {item.Code}"
                    : $"Promosyon kodu pasif edildi: {item.Code}",
                DateTime.UtcNow);

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                item.Id,
                item.IsActive,
                item.UpdatedAtUtc
            });
        });

        admin.MapDelete("/{id:guid}", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var item = await dbContext.PromotionCodes
                .FirstOrDefaultAsync(x => x.Id == id);

            if (item is null)
            {
                return Results.NotFound(new
                {
                    message = "Promosyon kodu bulunamadı."
                });
            }

            if (item.UsedCount > 0)
            {
                return Results.Conflict(new
                {
                    message =
                        "Kullanılmış promosyon kodu silinemez. Kayıt geçmişi korunur."
                });
            }

            var code = item.Code;
            dbContext.PromotionCodes.Remove(item);

            AddAudit(
                dbContext,
                principal,
                "promotion.delete",
                "promotion",
                item.Id,
                code,
                $"Promosyon kodu silindi: {code}",
                DateTime.UtcNow);

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                id,
                message = "Promosyon kodu silindi."
            });
        });

        admin.MapPost("/{id:guid}/consume-test", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var promo = await dbContext.PromotionCodes
                .FirstOrDefaultAsync(x => x.Id == id);

            if (promo is null)
            {
                return Results.NotFound(new { message = "Kod bulunamadı." });
            }

            if (promo.UsedCount > 0)
            {
                return Results.Conflict(new
                {
                    message = "Bu kod daha önce kullanılmış."
                });
            }

            var planCode = promo.PlanCode ?? "kobi";
            var plan = await dbContext.MembershipPlans
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Code == planCode &&
                    x.IsActive);

            if (plan is null)
            {
                return Results.BadRequest(new
                {
                    message = "Test için geçerli paket bulunamadı."
                });
            }

            var calculation = Calculate(
                plan.AnnualPrice,
                promo.DiscountType,
                promo.DiscountValue);

            var now = DateTime.UtcNow;
            var orgId = await OrganizationIdForPromoAsync(
                promo,
                dbContext);

            promo.UsedCount = 1;
            promo.UsedAtUtc = now;
            promo.IsActive = false;
            promo.UpdatedAtUtc = now;

            dbContext.PromotionUsages.Add(new PromotionUsage
            {
                PromotionCodeId = promo.Id,
                CampaignId = promo.CampaignId,
                OrganizationId = orgId,
                UserId = null,
                UserDisplayName = "Admin test",
                UserEmail = null,
                PlanCode = planCode,
                OriginalPrice = plan.AnnualPrice,
                DiscountAmount = calculation.DiscountAmount,
                FinalPrice = calculation.FinalPrice,
                PaymentStatus = "admin_test",
                UsedAtUtc = now,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            });

            AddAudit(
                dbContext,
                principal,
                "promotion.consume_test",
                "promotion",
                promo.Id,
                promo.Code,
                $"Promosyon kodu test kullanımında tüketildi: {promo.Code}",
                now);

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Kod test kullanımı ile tüketildi.",
                promo.Code,
                calculation.DiscountAmount,
                calculation.FinalPrice
            });
        });

        admin.MapPost("/usages/{id:guid}/payment-status", async (
            Guid id,
            UpdatePromotionUsageStatusRequest request,
            AppDbContext dbContext) =>
        {
            var usage = await dbContext.PromotionUsages
                .FirstOrDefaultAsync(x => x.Id == id);

            if (usage is null)
            {
                return Results.NotFound(new
                {
                    message = "Promosyon kullanım kaydı bulunamadı."
                });
            }

            var status = request.PaymentStatus
                .Trim()
                .ToLowerInvariant();

            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "payment_pending",
                "payment_succeeded",
                "payment_cancelled",
                "payment_failed",
                "free_completed",
                "admin_test"
            };

            if (!allowed.Contains(status))
            {
                return Results.BadRequest(new
                {
                    message = "Geçersiz ödeme durumu."
                });
            }

            usage.PaymentStatus = status;
            usage.UpdatedAtUtc = DateTime.UtcNow;

            // Bilerek kod tekrar acilmaz.
            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                usage.Id,
                usage.PaymentStatus,
                codeRestored = false
            });
        });

        app.MapPost("/api/promotions/validate", async (
            ValidatePromotionCodeRequest request,
            AppDbContext dbContext) =>
        {
            var result = await ValidateAndCalculateAsync(
                request.Code,
                request.PlanCode,
                dbContext);

            if (result.ErrorResult is not null)
            {
                return result.ErrorResult;
            }

            return Results.Ok(new
            {
                valid = true,
                result.Promo!.Id,
                result.Promo.Code,
                result.Promo.Description,
                result.Promo.DiscountType,
                result.Promo.DiscountValue,
                planCode = result.Plan!.Code,
                originalPrice = result.Plan.AnnualPrice,
                result.DiscountAmount,
                result.FinalPrice,
                result.Promo.ExpiresAtUtc,
                maxUses = 1,
                result.Promo.UsedCount,
                singleUse = true,
                campaignId = result.Promo.CampaignId
            });
        });

        app.MapPost("/api/promotions/claim", async (
            ClaimPromotionCodeRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdText =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdText, out var userId))
            {
                return Results.Unauthorized();
            }

            await using var transaction =
                await dbContext.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable);

            var result = await ValidateAndCalculateAsync(
                request.Code,
                request.PlanCode,
                dbContext,
                tracking: true);

            if (result.ErrorResult is not null)
            {
                await transaction.RollbackAsync();
                return result.ErrorResult;
            }

            var promo = result.Promo!;
            var plan = result.Plan!;

            var user = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == userId);

            if (user is null)
            {
                await transaction.RollbackAsync();
                return Results.Unauthorized();
            }

            var now = DateTime.UtcNow;
            var organizationId =
                await OrganizationIdForPromoAsync(
                    promo,
                    dbContext);

            promo.UsedCount = 1;
            promo.UsedAtUtc = now;
            promo.UsedByUserId = userId;
            promo.IsActive = false;
            promo.UpdatedAtUtc = now;

            var usage = new PromotionUsage
            {
                PromotionCodeId = promo.Id,
                CampaignId = promo.CampaignId,
                OrganizationId = organizationId,
                UserId = userId,
                UserDisplayName = user.DisplayName,
                UserEmail = user.Email,
                PlanCode = plan.Code,
                OriginalPrice = plan.AnnualPrice,
                DiscountAmount = result.DiscountAmount,
                FinalPrice = result.FinalPrice,
                PaymentStatus =
                    result.FinalPrice == 0
                        ? "free_completed"
                        : "payment_pending",
                UsedAtUtc = now,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.PromotionUsages.Add(usage);

            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            return Results.Ok(new
            {
                claimed = true,
                usageId = usage.Id,
                promo.Code,
                planCode = plan.Code,
                originalPrice = plan.AnnualPrice,
                result.DiscountAmount,
                result.FinalPrice,
                paymentRequired = result.FinalPrice > 0,
                paymentStatus = usage.PaymentStatus,
                codeRestoredOnCancel = false
            });
        }).RequireAuthorization();

        return app;
    }

    private static async Task<PromotionValidationResult>
        ValidateAndCalculateAsync(
            string codeValue,
            string planValue,
            AppDbContext dbContext,
            bool tracking = false)
    {
        if (string.IsNullOrWhiteSpace(codeValue) ||
            string.IsNullOrWhiteSpace(planValue))
        {
            return PromotionValidationResult.Error(
                Results.BadRequest(new
                {
                    message = "Promosyon kodu ve paket zorunludur."
                }));
        }

        var code = NormalizeCode(codeValue);
        var planCode = planValue.Trim().ToLowerInvariant();

        var plan = await dbContext.MembershipPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Code == planCode &&
                x.IsActive);

        if (plan is null)
        {
            return PromotionValidationResult.Error(
                Results.NotFound(new
                {
                    message = "Paket bulunamadı."
                }));
        }

        IQueryable<PromotionCode> promoQuery =
            dbContext.PromotionCodes;

        if (!tracking)
        {
            promoQuery = promoQuery.AsNoTracking();
        }

        var promo = await promoQuery
            .FirstOrDefaultAsync(x => x.Code == code);

        if (promo is null)
        {
            return PromotionValidationResult.Error(
                Results.NotFound(new
                {
                    message = "Promosyon kodu bulunamadı."
                }));
        }

        var now = DateTime.UtcNow;

        if (promo.UsedCount > 0 || promo.UsedAtUtc.HasValue)
        {
            return PromotionValidationResult.Error(
                Results.Conflict(new
                {
                    message = "Bu promosyon kodu daha önce kullanılmış."
                }));
        }

        if (!promo.IsActive)
        {
            return PromotionValidationResult.Error(
                Results.BadRequest(new
                {
                    message = "Bu promosyon kodu aktif değil."
                }));
        }

        if (promo.StartsAtUtc.HasValue &&
            promo.StartsAtUtc.Value > now)
        {
            return PromotionValidationResult.Error(
                Results.BadRequest(new
                {
                    message = "Bu promosyon henüz başlamadı."
                }));
        }

        if (promo.ExpiresAtUtc.HasValue &&
            promo.ExpiresAtUtc.Value < now)
        {
            return PromotionValidationResult.Error(
                Results.BadRequest(new
                {
                    message = "Bu promosyon kodunun süresi dolmuş."
                }));
        }

        if (!string.IsNullOrWhiteSpace(promo.PlanCode) &&
            !string.Equals(
                promo.PlanCode,
                planCode,
                StringComparison.OrdinalIgnoreCase))
        {
            return PromotionValidationResult.Error(
                Results.BadRequest(new
                {
                    message =
                        "Bu promosyon kodu seçilen pakette geçerli değil."
                }));
        }

        if (promo.CampaignId.HasValue)
        {
            var campaign = await dbContext.PromotionCampaigns
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Id == promo.CampaignId.Value);

            if (campaign is null || !campaign.IsActive)
            {
                return PromotionValidationResult.Error(
                    Results.BadRequest(new
                    {
                        message = "Bu promosyon kampanyası aktif değil."
                    }));
            }

            var organization =
                await dbContext.PromotionOrganizations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Id == campaign.OrganizationId);

            if (organization is null || !organization.IsActive)
            {
                return PromotionValidationResult.Error(
                    Results.BadRequest(new
                    {
                        message =
                            "Bu promosyonun bağlı olduğu kurum aktif değil."
                    }));
            }
        }

        var calculation = Calculate(
            plan.AnnualPrice,
            promo.DiscountType,
            promo.DiscountValue);

        return PromotionValidationResult.Success(
            promo,
            plan,
            calculation.DiscountAmount,
            calculation.FinalPrice);
    }

    private static (
        decimal DiscountAmount,
        decimal FinalPrice) Calculate(
        decimal originalPrice,
        string discountType,
        decimal discountValue)
    {
        decimal discountAmount;

        if (discountType == "percentage")
        {
            discountAmount =
                decimal.Round(
                    originalPrice * discountValue / 100m,
                    2,
                    MidpointRounding.AwayFromZero);
        }
        else
        {
            discountAmount = discountValue;
        }

        if (discountAmount > originalPrice)
        {
            discountAmount = originalPrice;
        }

        return (
            discountAmount,
            originalPrice - discountAmount);
    }

    private static string? ValidateSingle(
        CreatePromotionCodeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return "Promosyon kodu zorunludur.";
        }

        var code = NormalizeCode(request.Code);

        if (code.Length is < 3 or > 50)
        {
            return "Promosyon kodu 3 ile 50 karakter arasında olmalıdır.";
        }

        if (code.Any(x =>
            !(char.IsLetterOrDigit(x) || x is '-' or '_')))
        {
            return "Promosyon kodunda yalnızca harf, rakam, - ve _ kullanılabilir.";
        }

        return ValidateDiscountAndDates(
            request.DiscountType,
            request.DiscountValue,
            request.PlanCode,
            request.StartsAtUtc,
            request.ExpiresAtUtc);
    }

    private static string? ValidateCampaign(
        CreatePromotionCampaignRequest request)
    {
        if (request.OrganizationId == Guid.Empty)
        {
            return "Kurum / oda / firma seçimi zorunludur.";
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Kampanya adı zorunludur.";
        }

        if (request.Quantity is < 1 or > 5000)
        {
            return "Tek seferde 1 ile 5000 arasında kod üretilebilir.";
        }

        var prefix = NormalizePrefix(request.CodePrefix);

        if (prefix.Length is < 2 or > 20)
        {
            return "Kod öneki 2 ile 20 karakter arasında olmalıdır.";
        }

        return ValidateDiscountAndDates(
            request.DiscountType,
            request.DiscountValue,
            request.PlanCode,
            request.StartsAtUtc,
            request.ExpiresAtUtc);
    }

    private static string? ValidateDiscountAndDates(
        string discountType,
        decimal discountValue,
        string? planCode,
        DateTime? startsAtUtc,
        DateTime? expiresAtUtc)
    {
        var type = discountType.Trim().ToLowerInvariant();

        if (type is not "percentage" and not "fixed")
        {
            return "İndirim türü geçerli değil.";
        }

        if (discountValue <= 0)
        {
            return "İndirim değeri sıfırdan büyük olmalıdır.";
        }

        if (type == "percentage" && discountValue > 100)
        {
            return "Yüzde indirim 100'den büyük olamaz.";
        }

        var plan = NormalizePlan(planCode);

        if (plan is not null &&
            plan is not "kobi" and
            not "avantaj" and
            not "profesyonel")
        {
            return "Geçerli bir paket seçin.";
        }

        if (startsAtUtc.HasValue &&
            expiresAtUtc.HasValue &&
            expiresAtUtc.Value <= startsAtUtc.Value)
        {
            return "Bitiş zamanı başlangıç zamanından sonra olmalıdır.";
        }

        return null;
    }

    private static string CodeStatus(
        PromotionCode code,
        DateTime now)
    {
        if (code.UsedCount > 0 || code.UsedAtUtc.HasValue)
        {
            return "used";
        }

        if (code.ExpiresAtUtc.HasValue &&
            code.ExpiresAtUtc.Value < now)
        {
            return "expired";
        }

        if (!code.IsActive)
        {
            return "inactive";
        }

        if (code.StartsAtUtc.HasValue &&
            code.StartsAtUtc.Value > now)
        {
            return "scheduled";
        }

        return "available";
    }

    private static async Task<Guid?> OrganizationIdForPromoAsync(
        PromotionCode promo,
        AppDbContext dbContext)
    {
        if (!promo.CampaignId.HasValue)
        {
            return null;
        }

        return await dbContext.PromotionCampaigns
            .AsNoTracking()
            .Where(x => x.Id == promo.CampaignId.Value)
            .Select(x => (Guid?)x.OrganizationId)
            .FirstOrDefaultAsync();
    }

    private static string NormalizeCode(string value)
        => value.Trim().ToUpperInvariant();

    private static string NormalizePrefix(string value)
    {
        var chars = value
            .Trim()
            .ToUpperInvariant()
            .Where(char.IsLetterOrDigit)
            .ToArray();

        return new string(chars);
    }

    private static string CreateRandomCode(int length)
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var bytes = System.Security.Cryptography
            .RandomNumberGenerator.GetBytes(length);

        return new string(bytes
            .Select(x => alphabet[x % alphabet.Length])
            .ToArray());
    }

    private static string? NormalizePlan(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            string.Equals(
                value,
                "all",
                StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return value.Trim().ToLowerInvariant();
    }

    private static string NormalizeOrganizationType(string? value)
    {
        var type = value?.Trim().ToLowerInvariant();

        return type is "oda" or "kurum" or "firma" or
            "dernek" or "belediye" or "diger"
            ? type
            : "kurum";
    }

    private static string? NormalizeContactPhone(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var digits = new string(value.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("90") && digits.Length == 12)
        {
            digits = digits[2..];
        }

        if (digits.StartsWith("0") && digits.Length == 11)
        {
            digits = digits[1..];
        }

        if (digits.Length != 10)
        {
            return value.Trim();
        }

        return $"+90 {digits[..3]} {digits.Substring(3, 3)} {digits.Substring(6, 2)} {digits.Substring(8, 2)}";
    }

    private static string? Optional(string? value)
        => string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();

    private static Guid? TryAdminId(ClaimsPrincipal principal)
    {
        var value =
            principal.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(value, out var id)
            ? id
            : null;
    }

    private static void AddAudit(
        AppDbContext dbContext,
        ClaimsPrincipal principal,
        string action,
        string entityType,
        Guid entityId,
        string entityName,
        string details,
        DateTime createdAtUtc)
    {
        dbContext.AdminAuditLogs.Add(new AdminAuditLog
        {
            AdminUserId = TryAdminId(principal),
            AdminEmail =
                principal.FindFirstValue(ClaimTypes.Email) ??
                principal.Identity?.Name ??
                "unknown",
            Action = action,
            EntityType = entityType,
            EntityId = entityId.ToString(),
            EntityName = entityName,
            Details = details,
            CreatedAtUtc = createdAtUtc
        });
    }

    private sealed record PromotionValidationResult(
        PromotionCode? Promo,
        MembershipPlan? Plan,
        decimal DiscountAmount,
        decimal FinalPrice,
        IResult? ErrorResult)
    {
        public static PromotionValidationResult Error(
            IResult errorResult)
            => new(
                null,
                null,
                0,
                0,
                errorResult);

        public static PromotionValidationResult Success(
            PromotionCode promo,
            MembershipPlan plan,
            decimal discountAmount,
            decimal finalPrice)
            => new(
                promo,
                plan,
                discountAmount,
                finalPrice,
                null);
    }
}

public sealed record CreatePromotionOrganizationRequest(
    string Name,
    string? Type,
    string? ContactName,
    string? ContactPhone,
    string? ContactEmail,
    string? Notes);

public sealed record CreatePromotionCampaignRequest(
    Guid OrganizationId,
    string Name,
    string CodePrefix,
    string? Description,
    string DiscountType,
    decimal DiscountValue,
    string? PlanCode,
    int Quantity,
    DateTime? StartsAtUtc,
    DateTime? ExpiresAtUtc);

public sealed record CreatePromotionCodeRequest(
    string Code,
    string? Description,
    string DiscountType,
    decimal DiscountValue,
    string? PlanCode,
    int? MaxUses,
    DateTime? StartsAtUtc,
    DateTime? ExpiresAtUtc);

public sealed record PromotionStatusRequest(
    bool IsActive);

public sealed record ValidatePromotionCodeRequest(
    string Code,
    string PlanCode);

public sealed record ClaimPromotionCodeRequest(
    string Code,
    string PlanCode);

public sealed record UpdatePromotionUsageStatusRequest(
    string PaymentStatus);