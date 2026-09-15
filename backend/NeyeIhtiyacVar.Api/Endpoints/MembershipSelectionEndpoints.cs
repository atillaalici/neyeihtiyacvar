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

        return app;
    }
}

public sealed record SaveMembershipSelectionRequest(
    Guid ProviderId,
    string PlanCode);