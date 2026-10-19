using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class EmergencyServiceEndpoints
{
    public static IEndpointRouteBuilder MapEmergencyServiceEndpoints(this IEndpointRouteBuilder app)
    {
        var panel = app.MapGroup("/api/provider-panel/me/emergency-declaration").RequireAuthorization();
        panel.MapGet("", async (ClaimsPrincipal user, AppDbContext db, CancellationToken ct) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Results.Unauthorized();
            var provider = await db.Providers.AsNoTracking().FirstOrDefaultAsync(x => x.OwnerUserId == userId, ct);
            if (provider is null) return Results.NotFound();
            var declaration = await db.ProviderEmergencyDeclarations.AsNoTracking().FirstOrDefaultAsync(x => x.ProviderId == provider.Id, ct);
            return Results.Ok(new { confirmed = declaration != null && declaration.WithdrawnAtUtc == null && declaration.DeclaredByUserId == userId, declaration });
        });
        panel.MapPut("", async (ConfirmEmergencyRequest request, ClaimsPrincipal user, AppDbContext db, CancellationToken ct) =>
        {
            if (!request.Confirmed) return Results.BadRequest(new { message = "7/24 hizmet beyanını açıkça onaylayın." });
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Results.Unauthorized();
            var provider = await db.Providers.AsNoTracking().FirstOrDefaultAsync(x => x.OwnerUserId == userId, ct);
            if (provider is null) return Results.NotFound();
            // Atomic upsert; concurrent confirmations cannot create duplicate declarations.
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "ProviderEmergencyDeclarations" ("ProviderId", "DeclaredByUserId", "ConfirmedAtUtc", "WithdrawnAtUtc")
                VALUES ({provider.Id}, {userId}, {DateTime.UtcNow}, NULL)
                ON CONFLICT ("ProviderId") DO UPDATE SET
                    "DeclaredByUserId" = EXCLUDED."DeclaredByUserId",
                    "ConfirmedAtUtc" = EXCLUDED."ConfirmedAtUtc", "WithdrawnAtUtc" = NULL
                """, ct);
            return Results.NoContent();
        });
        panel.MapDelete("", async (ClaimsPrincipal user, AppDbContext db, CancellationToken ct) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Results.Unauthorized();
            var provider = await db.Providers.AsNoTracking().FirstOrDefaultAsync(x => x.OwnerUserId == userId, ct);
            if (provider is null) return Results.NotFound();
            await db.ProviderEmergencyDeclarations.Where(x => x.ProviderId == provider.Id && x.WithdrawnAtUtc == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.WithdrawnAtUtc, DateTime.UtcNow), ct);
            return Results.NoContent();
        });
        app.MapGet("/api/emergency-providers", async (string? city, string? district, AppDbContext db, CancellationToken ct) =>
        {
            city = city?.Trim().ToLowerInvariant();
            district = district?.Trim().ToLowerInvariant();
            if (!string.IsNullOrEmpty(district) && string.IsNullOrEmpty(city)) return Results.BadRequest(new { message = "İlçe için il gereklidir." });
            if (!string.IsNullOrEmpty(city) && !await db.Cities.AnyAsync(x => x.Slug == city && x.IsActive, ct)) return Results.BadRequest(new { message = "Geçersiz il." });
            if (!string.IsNullOrEmpty(district) && !await db.Districts.AnyAsync(x => x.Slug == district && x.City.Slug == city, ct)) return Results.BadRequest(new { message = "Geçersiz ilçe." });
            var neighbors = EmergencyProvinceNeighbors.Get(city);
            var providers = await (from p in EligibleProviders(db.Providers.AsNoTracking(), db.ProviderEmergencyDeclarations)
                let rank = city != null && city != "" && p.CitySlug == city
                    ? (district != null && district != "" && p.DistrictSlug == district ? 0 : 1)
                    : (neighbors.Contains(p.CitySlug) ? 2 : 3)
                orderby rank, p.BusinessName, p.Id
                select new { p.Id, p.Slug, p.BusinessName, p.ServiceSlug, p.CitySlug, p.DistrictSlug, locationRank = rank })
                .Take(24).ToListAsync(ct);
            return Results.Ok(new { providers, neighborSource = "geoBoundaries TUR-ADM1-25984515" });
        });
        return app;
    }
    public static IQueryable<Provider> EligibleProviders(IQueryable<Provider> providers,
        IQueryable<ProviderEmergencyDeclaration> declarations) =>
        from p in providers
        join d in declarations on p.Id equals d.ProviderId
        where p.IsActive && p.PublicationStatus == PublicationStatus.Published
            && !p.ModerationTerminated && d.WithdrawnAtUtc == null && d.DeclaredByUserId == p.OwnerUserId
        select p;

    public sealed record ConfirmEmergencyRequest(bool Confirmed);
}
