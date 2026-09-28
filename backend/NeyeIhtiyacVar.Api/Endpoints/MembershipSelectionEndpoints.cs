using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class MembershipSelectionEndpoints
{
    public static IEndpointRouteBuilder MapMembershipSelectionEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/membership-selection")
            .RequireAuthorization();

        group.MapPost("/", async (
            SaveMembershipSelectionRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdText = principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdText, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x =>
                    x.Id == request.ProviderId &&
                    x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme bulunamadı veya bu hesaba ait değil."
                });
            }

            var code = request.PlanCode.Trim().ToLowerInvariant();

            var plan = await dbContext.MembershipPlans
                .FirstOrDefaultAsync(x =>
                    x.Code == code &&
                    x.IsActive);

            if (plan is null)
            {
                return Results.BadRequest(new
                {
                    message = "Geçerli bir üyelik paketi seçin."
                });
            }

            var existing = await dbContext.ProviderMemberships
                .FirstOrDefaultAsync(x =>
                    x.ProviderId == provider.Id &&
                    x.UserId == userId);

            var now = DateTime.UtcNow;

            if (existing is null)
            {
                existing = new ProviderMembership
                {
                    ProviderId = provider.Id,
                    UserId = userId,
                    PlanId = plan.Id,
                    AnnualPriceSnapshot = plan.AnnualPrice,
                    ServiceLimitSnapshot = plan.ServiceLimit,
                    StartsAtUtc = now,
                    ExpiresAtUtc = null,
                    IsActive = false,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                };

                dbContext.ProviderMemberships.Add(existing);
            }
            else
            {
                if (existing.IsActive)
                {
                    return Results.Conflict(new
                    {
                        message = "Aktif üyelik doğrudan değiştirilemez. Paket yükseltme akışı kullanılmalıdır."
                    });
                }

                existing.PlanId = plan.Id;
                existing.AnnualPriceSnapshot = plan.AnnualPrice;
                existing.ServiceLimitSnapshot = plan.ServiceLimit;
                existing.StartsAtUtc = now;
                existing.ExpiresAtUtc = null;
                existing.EndedAtUtc = null;
                existing.UpdatedAtUtc = now;
            }

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                membershipId = existing.Id,
                providerId = provider.Id,
                plan = new
                {
                    plan.Id,
                    plan.Code,
                    plan.Name,
                    plan.AnnualPrice,
                    plan.ServiceLimit
                },
                status = "pending_payment"
            });
        });


        group.MapGet("/upgrade-options", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdText = principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdText, out var userId))
            {
                return Results.Unauthorized();
            }

            var membership = await dbContext.ProviderMemberships
                .AsNoTracking()
                .Include(x => x.Plan)
                .Where(x => x.UserId == userId && x.IsActive)
                .OrderByDescending(x => x.StartsAtUtc)
                .FirstOrDefaultAsync();

            if (membership is null || membership.Plan is null)
            {
                return Results.NotFound(new
                {
                    message = "Aktif üyelik bulunamadı."
                });
            }

            var currentPlan = membership.Plan;
            var now = DateTime.UtcNow;

            var effectiveExpiresAtUtc =
                membership.ExpiresAtUtc ?? membership.StartsAtUtc.AddYears(1);

            var totalSeconds = Math.Max(
                1d,
                (effectiveExpiresAtUtc - membership.StartsAtUtc).TotalSeconds);

            var remainingSeconds = Math.Clamp(
                (effectiveExpiresAtUtc - now).TotalSeconds,
                0d,
                totalSeconds);

            var remainingRatio = (decimal)(remainingSeconds / totalSeconds);

            // Ücretsiz/promosyonlu üyeliklerde liste fiyatını ödenmiş bakiye
            // kabul etmiyoruz. Aynı kullanıcının, aynı planın ve üyelik
            // başlangıcına en yakın promosyon kullanımındaki gerçek son fiyatı
            // esas alıyoruz.
            decimal paidAmount = membership.AnnualPriceSnapshot;

            var promotionUsage = await dbContext.PromotionUsages
                .AsNoTracking()
                .Where(x =>
                    x.UserId == userId &&
                    x.PlanCode == currentPlan.Code &&
                    x.UsedAtUtc >= membership.StartsAtUtc.AddMinutes(-5) &&
                    x.UsedAtUtc <= membership.StartsAtUtc.AddMinutes(5))
                .OrderByDescending(x => x.UsedAtUtc)
                .FirstOrDefaultAsync();

            if (promotionUsage is not null)
            {
                paidAmount = promotionUsage.FinalPrice;
            }

            paidAmount = Math.Max(0m, paidAmount);

            var remainingCredit = Math.Round(
                paidAmount * remainingRatio,
                2,
                MidpointRounding.AwayFromZero);

            var higherPlans = await dbContext.MembershipPlans
                .AsNoTracking()
                .Where(x =>
                    x.IsActive &&
                    x.SortOrder > currentPlan.SortOrder)
                .OrderBy(x => x.SortOrder)
                .Select(x => new
                {
                    x.Id,
                    x.Code,
                    x.Name,
                    x.Description,
                    x.AnnualPrice,
                    x.ServiceLimit,
                    x.SortOrder
                })
                .ToListAsync();

            var upgrades = higherPlans
                .Select(x => new
                {
                    x.Id,
                    x.Code,
                    x.Name,
                    x.Description,
                    x.AnnualPrice,
                    x.ServiceLimit,
                    x.SortOrder,
                    remainingCredit,
                    amountDue = Math.Max(
                        0m,
                        Math.Round(
                            x.AnnualPrice - remainingCredit,
                            2,
                            MidpointRounding.AwayFromZero))
                })
                .ToList();

            return Results.Ok(new
            {
                membershipId = membership.Id,
                currentPlan = new
                {
                    currentPlan.Id,
                    currentPlan.Code,
                    currentPlan.Name,
                    annualPrice = membership.AnnualPriceSnapshot,
                    serviceLimit = membership.ServiceLimitSnapshot,
                    currentPlan.SortOrder
                },
                startsAtUtc = membership.StartsAtUtc,
                expiresAtUtc = effectiveExpiresAtUtc,
                paidAmount,
                remainingRatio = Math.Round(
                    remainingRatio,
                    6,
                    MidpointRounding.AwayFromZero),
                remainingCredit,
                upgrades
            });
        });

        group.MapGet("/upgrade-quote/{planCode}", async (
            string planCode,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdText = principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdText, out var userId))
            {
                return Results.Unauthorized();
            }

            var membership = await dbContext.ProviderMemberships
                .AsNoTracking()
                .Include(x => x.Plan)
                .Where(x => x.UserId == userId && x.IsActive)
                .OrderByDescending(x => x.StartsAtUtc)
                .FirstOrDefaultAsync();

            if (membership is null || membership.Plan is null)
            {
                return Results.NotFound(new
                {
                    message = "Aktif üyelik bulunamadı."
                });
            }

            var targetCode = planCode.Trim().ToLowerInvariant();

            var targetPlan = await dbContext.MembershipPlans
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Code == targetCode &&
                    x.IsActive);

            if (targetPlan is null)
            {
                return Results.BadRequest(new
                {
                    message = "Geçerli bir üyelik paketi seçin."
                });
            }

            if (targetPlan.SortOrder <= membership.Plan.SortOrder)
            {
                return Results.BadRequest(new
                {
                    message = "Yalnızca mevcut paketinizden daha üst bir pakete geçebilirsiniz."
                });
            }

            var now = DateTime.UtcNow;
            var effectiveExpiresAtUtc =
                membership.ExpiresAtUtc ?? membership.StartsAtUtc.AddYears(1);

            var totalSeconds = Math.Max(
                1d,
                (effectiveExpiresAtUtc - membership.StartsAtUtc).TotalSeconds);

            var remainingSeconds = Math.Clamp(
                (effectiveExpiresAtUtc - now).TotalSeconds,
                0d,
                totalSeconds);

            var remainingRatio = (decimal)(remainingSeconds / totalSeconds);

            decimal paidAmount = membership.AnnualPriceSnapshot;

            var promotionUsage = await dbContext.PromotionUsages
                .AsNoTracking()
                .Where(x =>
                    x.UserId == userId &&
                    x.PlanCode == membership.Plan.Code &&
                    x.UsedAtUtc >= membership.StartsAtUtc.AddMinutes(-5) &&
                    x.UsedAtUtc <= membership.StartsAtUtc.AddMinutes(5))
                .OrderByDescending(x => x.UsedAtUtc)
                .FirstOrDefaultAsync();

            if (promotionUsage is not null)
            {
                paidAmount = promotionUsage.FinalPrice;
            }

            paidAmount = Math.Max(0m, paidAmount);

            var remainingCredit = Math.Round(
                paidAmount * remainingRatio,
                2,
                MidpointRounding.AwayFromZero);

            var amountDue = Math.Max(
                0m,
                Math.Round(
                    targetPlan.AnnualPrice - remainingCredit,
                    2,
                    MidpointRounding.AwayFromZero));

            return Results.Ok(new
            {
                membershipId = membership.Id,
                currentPlan = new
                {
                    membership.Plan.Code,
                    membership.Plan.Name
                },
                targetPlan = new
                {
                    targetPlan.Id,
                    targetPlan.Code,
                    targetPlan.Name,
                    targetPlan.AnnualPrice,
                    targetPlan.ServiceLimit,
                    targetPlan.SortOrder
                },
                startsAtUtc = membership.StartsAtUtc,
                expiresAtUtc = effectiveExpiresAtUtc,
                paidAmount,
                remainingCredit,
                amountDue
            });
        });

        return app;
    }
}

public sealed record SaveMembershipSelectionRequest(
    Guid ProviderId,
    string PlanCode);