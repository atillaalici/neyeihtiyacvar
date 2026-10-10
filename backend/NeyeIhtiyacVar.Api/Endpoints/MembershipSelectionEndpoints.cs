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

        // Ücretli üyelikler yalnızca doğrulanmış ödeme sonrası
        // sipariş tamamlama akışı üzerinden aktifleştirilecektir.
        // Eski POST endpoint güvenlik nedeniyle kaldırıldı.

        group.MapGet("/summary", async (
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
                .Where(x =>
                    x.UserId == userId &&
                    x.IsActive &&
                    (x.ExpiresAtUtc ?? x.StartsAtUtc.AddYears(1)) > DateTime.UtcNow)
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
                expiresAtUtc =
                    membership.ExpiresAtUtc ?? membership.StartsAtUtc.AddYears(1)
            });
        });


        return app;
    }
}

public sealed record SaveMembershipSelectionRequest(
    Guid ProviderId,
    string PlanCode);