using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class MembershipPlanEndpoints
{
    public static IEndpointRouteBuilder MapMembershipPlanEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/membership-plans");

        group.MapGet("/", async (AppDbContext dbContext) =>
        {
            var plans = await dbContext.MembershipPlans
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.SortOrder)
                .Select(x => new
                {
                    x.Id,
                    x.Code,
                    x.Name,
                    x.Description,
                    x.AnnualPrice,
                    monthlyEquivalent = Math.Round(x.AnnualPrice / 12m, 2),
                    x.ServiceLimit,
                    x.IsRecommended,
                    features = new
                    {
                        x.MapVisibility,
                        x.PhotoEnabled,
                        x.VideoEnabled,
                        x.FeaturedBadgeEnabled,
                        x.SearchPriorityEnabled,
                        x.AdvancedStatisticsEnabled,
                        x.CatalogCampaignEnabled,
                        x.PrioritySupportEnabled
                    }
                })
                .ToListAsync();

            return Results.Ok(plans);
        });

        return app;
    }
}