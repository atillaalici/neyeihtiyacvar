using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminRoleManagementEndpoints
{
    public static IEndpointRouteBuilder MapAdminRoleManagementEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/admin/role-management")
            .RequireAuthorization(policy =>
                policy.RequireRole(UserRole.Admin.ToString()));

        group.MapGet("/me", (ClaimsPrincipal principal) =>
        {
            var userId = GetUserId(principal);

            return userId is null
                ? Results.Unauthorized()
                : Results.Ok(new
                {
                    userId,
                    hasAdminAccess = true
                });
        });

        group.MapGet("/users", async (AppDbContext dbContext) =>
        {
            var users = await dbContext.Users
                .AsNoTracking()
                .OrderBy(x => x.DisplayName)
                .ThenBy(x => x.Email)
                .Select(x => new
                {
                    x.Id,
                    x.Email,
                    x.DisplayName,
                    role = x.Role.ToString().ToLowerInvariant(),
                    hasAdminAccess =
                        x.IsAdmin || x.Role == UserRole.Admin,
                    hasProvider =
                        dbContext.Providers.Any(p =>
                            p.OwnerUserId == x.Id)
                })
                .ToListAsync();

            return Results.Ok(users);
        });

        group.MapPut("/users/{id:guid}/admin-access", async (
            Guid id,
            ChangeAdminAccessRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var currentUserId = GetUserId(principal);

            if (currentUserId is null)
            {
                return Results.Unauthorized();
            }

            if (currentUserId.Value == id && !request.Enabled)
            {
                return Results.BadRequest(new
                {
                    message =
                        "Kendi yönetici yetkinizi bu ekrandan kaldıramazsınız."
                });
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x => x.Id == id);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Kullanıcı bulunamadı."
                });
            }

            var currentlyHasAdminAccess =
                user.IsAdmin || user.Role == UserRole.Admin;

            if (currentlyHasAdminAccess && !request.Enabled)
            {
                var adminCount = await dbContext.Users
                    .CountAsync(x =>
                        x.IsAdmin ||
                        x.Role == UserRole.Admin);

                if (adminCount <= 1)
                {
                    return Results.BadRequest(new
                    {
                        message =
                            "Sistemdeki son yönetici hesabının yetkisi kaldırılamaz."
                    });
                }
            }

            var hasProvider = await dbContext.Providers
                .AnyAsync(x => x.OwnerUserId == user.Id);

            if (request.Enabled)
            {
                user.IsAdmin = true;

                // Ana hesap rolü değiştirilmez.
                // Provider ise provider kalır, normal kullanıcı ise user kalır.
            }
            else
            {
                user.IsAdmin = false;

                // Eski tek-rol sistemindeki Admin hesaplarını
                // güvenli şekilde ana rollerine geri taşı.
                if (user.Role == UserRole.Admin)
                {
                    user.Role = hasProvider
                        ? UserRole.Provider
                        : UserRole.User;
                }
            }

            user.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                role = user.Role.ToString().ToLowerInvariant(),
                hasAdminAccess =
                    user.IsAdmin || user.Role == UserRole.Admin,
                hasProvider,
                changed =
                    currentlyHasAdminAccess != request.Enabled,
                message = request.Enabled
                    ? "Yönetici yetkisi verildi. Ana hesap rolü korundu."
                    : "Yönetici yetkisi kaldırıldı. Ana hesap rolü korundu."
            });
        });

        return app;
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var raw =
            principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
            principal.FindFirstValue("sub");

        return Guid.TryParse(raw, out var id)
            ? id
            : null;
    }
}

public sealed record ChangeAdminAccessRequest(bool Enabled);