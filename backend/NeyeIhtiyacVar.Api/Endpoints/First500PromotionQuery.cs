using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class First500PromotionQuery
{
    public static IQueryable<PromotionCode> Available(
        AppDbContext dbContext,
        string campaignPrefix,
        DateTime now)
    {
        return dbContext.PromotionCodes
            .FromSqlInterpolated($"""
                SELECT p.*
                FROM "PromotionCodes" AS p
                JOIN "PromotionCampaigns" AS c
                    ON c."Id" = p."CampaignId"
                JOIN "PromotionOrganizations" AS o
                    ON o."Id" = c."OrganizationId"
                WHERE c."CodePrefix" = {campaignPrefix}
                  AND c."IsActive" = TRUE
                  AND c."PlanCode" = 'kobi'
                  AND c."DiscountType" = 'percentage'
                  AND c."DiscountValue" = 100
                  AND o."IsActive" = TRUE
                  AND p."IsActive" = TRUE
                  AND p."MaxUses" = 1
                  AND p."UsedCount" = 0
                  AND p."UsedAtUtc" IS NULL
                  AND p."DiscountType" = 'percentage'
                  AND p."DiscountValue" = 100
                  AND (p."PlanCode" IS NULL OR p."PlanCode" = 'kobi')
                  AND (p."StartsAtUtc" IS NULL OR p."StartsAtUtc" <= {now})
                  AND (p."ExpiresAtUtc" IS NULL OR p."ExpiresAtUtc" >= {now})
                  AND (c."StartsAtUtc" IS NULL OR c."StartsAtUtc" <= {now})
                  AND (c."ExpiresAtUtc" IS NULL OR c."ExpiresAtUtc" >= {now})
                ORDER BY p."CreatedAtUtc", p."Id"
                LIMIT 1
                FOR UPDATE OF p SKIP LOCKED
                """)
            .AsTracking();
    }
}
