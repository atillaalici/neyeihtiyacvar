using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class DevelopmentAdminEndpoints
{
    public static IEndpointRouteBuilder MapDevelopmentAdminEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/development/admin")
            .RequireAuthorization();

        group.MapPost("/promote-current", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var userIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdValue, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == userId &&
                    x.IsActive);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Kullanıcı bulunamadı."
                });
            }

            if (user.Role == UserRole.Admin)
            {
                return Results.Ok(new
                {
                    message = "Bu hesap zaten Admin rolünde.",
                    requiresRelogin = false
                });
            }

            user.Role = UserRole.Admin;
            user.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Hesap Development ortamında Admin yapıldı. Yeni rolün JWT'ye yansıması için çıkış yapıp tekrar giriş yapın.",
                requiresRelogin = true
            });
        });

        return app;
    }
}