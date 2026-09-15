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
        {
            return principal;
        }

        if (principal.IsInRole(UserRole.Admin.ToString()))
        {
            return principal;
        }

        var rawUserId =
            principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
            principal.FindFirstValue("sub");

        if (!Guid.TryParse(rawUserId, out var userId))
        {
            return principal;
        }

        var hasAdminAccess = await dbContext.Users
            .AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => x.IsAdmin || x.Role == UserRole.Admin)
            .FirstOrDefaultAsync();

        if (!hasAdminAccess)
        {
            return principal;
        }

        if (principal.Identity is ClaimsIdentity identity)
        {
            identity.AddClaim(
                new Claim(
                    ClaimTypes.Role,
                    UserRole.Admin.ToString()));
        }

        return principal;
    }
}