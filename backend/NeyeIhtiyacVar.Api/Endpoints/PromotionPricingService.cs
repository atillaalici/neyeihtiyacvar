using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

internal static class PromotionPricingService
{
    internal static async Task<PromotionValidationResult>
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

        var code = codeValue.Trim().ToUpperInvariant();
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

    internal static (
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

    internal sealed record PromotionValidationResult(
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
