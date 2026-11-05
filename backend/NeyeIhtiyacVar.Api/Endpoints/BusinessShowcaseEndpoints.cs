using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class BusinessShowcaseEndpoints
{
    public static IEndpointRouteBuilder MapBusinessShowcaseEndpoints(
        this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/api/admin/providers")
            .RequireAuthorization(policy =>
                policy.RequireRole(UserRole.Admin.ToString()));

        admin.MapPut("/{id:guid}/showcase", async (
            Guid id,
            ShowcaseDurationRequest request,
            AppDbContext db,
            CancellationToken ct) =>
        {
            if (request.Days is not (7 or 15 or 30))
                return Results.BadRequest(new
                {
                    message = "Vitrin süresi 7, 15 veya 30 gün olmalıdır."
                });

            var provider = await db.Providers
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (provider is null)
                return Results.NotFound();

            if (!provider.IsActive ||
                provider.PublicationStatus != PublicationStatus.Published ||
                provider.ModerationTerminated)
                return Results.BadRequest(new
                {
                    message = "Yalnızca aktif ve yayındaki işletmeler vitrine alınabilir."
                });

            var now = DateTime.UtcNow;

            provider.ShowcaseStartedAtUtc = now;
            provider.ShowcaseExpiresAtUtc = now.AddDays(request.Days);

            await db.SaveChangesAsync(ct);

            return Results.Ok(new
            {
                provider.Id,
                provider.ShowcaseStartedAtUtc,
                provider.ShowcaseExpiresAtUtc
            });
        });

        admin.MapDelete("/{id:guid}/showcase", async (
            Guid id,
            AppDbContext db,
            CancellationToken ct) =>
        {
            var provider = await db.Providers
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (provider is null)
                return Results.NotFound();

            provider.ShowcaseStartedAtUtc = null;
            provider.ShowcaseExpiresAtUtc = null;

            await db.SaveChangesAsync(ct);

            return Results.NoContent();
        });

        app.MapGet("/api/business-showcase", async (
            AppDbContext db,
            CancellationToken ct) =>
        {
            var now = DateTime.UtcNow;

            var providers = await db.Providers
                .AsNoTracking()
                .Where(x =>
                    x.IsActive &&
                    !x.ModerationTerminated &&
                    x.PublicationStatus == PublicationStatus.Published &&
                    x.ShowcaseExpiresAtUtc != null &&
                    x.ShowcaseExpiresAtUtc > now)
                .OrderByDescending(x => x.ShowcaseStartedAtUtc)
                .ThenBy(x => x.BusinessName)
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.BusinessName,
                    x.ServiceSlug,
                    x.CitySlug,
                    x.DistrictSlug
                })
                .ToListAsync(ct);

            return Results.Ok(new { providers });
        });

        return app;
    }

    public sealed record ShowcaseDurationRequest(int Days);
}
