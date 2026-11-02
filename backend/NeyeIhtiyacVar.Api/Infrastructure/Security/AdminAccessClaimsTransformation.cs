using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;

namespace NeyeIhtiyacVar.Api.Infrastructure.Security;

public sealed class AdminAccessClaimsTransformation(
    AppDbContext dbContext) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(
        ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
            return principal;

        var rawUserId =
            principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
            principal.FindFirstValue("sub");

        if (!Guid.TryParse(rawUserId, out var userId))
            return principal;

        var user = await dbContext.Users
            .AsNoTracking()
            .Where(x =>
                x.Id == userId &&
                x.IsActive &&
                x.DeletedAtUtc == null)
            .Select(x => new { x.IsAdmin, x.Role })
            .FirstOrDefaultAsync();

        var hasAdminAccess = user is not null &&
            (user.IsAdmin || user.Role == UserRole.Admin);

        // JWT'den gelen eski Admin rolünü kaldır.
        // Diğer rollere dokunma.
        foreach (var identity in principal.Identities)
        {
            var oldAdminClaims = identity.Claims
                .Where(x =>
                    x.Type == identity.RoleClaimType &&
                    x.Value == UserRole.Admin.ToString())
                .ToList();

            foreach (var claim in oldAdminClaims)
                identity.RemoveClaim(claim);
        }

        // Güncel veritabanı yetkisine göre Admin rolünü ekle.
        if (hasAdminAccess &&
            principal.Identity is ClaimsIdentity activeIdentity)
        {
            activeIdentity.AddClaim(
                new Claim(
                    activeIdentity.RoleClaimType,
                    UserRole.Admin.ToString()));
        }

        return principal;
    }
}
