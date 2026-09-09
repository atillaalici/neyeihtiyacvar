using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminUserEndpoints
{
    public static IEndpointRouteBuilder MapAdminUserEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/users");

        group.MapGet("/", async (
            string? role,
            bool? isActive,
            AppDbContext dbContext) =>
        {
            var query = dbContext.Users
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(role) &&
                TryParseRole(role, out var parsedRole))
            {
                query = query.Where(x => x.Role == parsedRole);
            }

            if (isActive.HasValue)
            {
                query = query.Where(x => x.IsActive == isActive.Value);
            }

            var users = await query
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.Email,
                    x.DisplayName,
                    role = x.Role.ToString().ToLowerInvariant(),
                    x.IsActive,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    needCount = dbContext.NeedRequests.Count(n =>
                        n.OwnerUserId == x.Id),
                    providerCount = dbContext.Providers.Count(p =>
                        p.OwnerUserId == x.Id)
                })
                .ToListAsync();

            return Results.Ok(users);
        });

        group.MapDelete("/{userId:guid}", async (
            Guid userId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var currentUserIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(currentUserIdValue, out var currentUserId))
            {
                return Results.Unauthorized();
            }

            if (userId == currentUserId)
            {
                return Results.Conflict(new
                {
                    message = "Kendi admin hesabınızı silemezsiniz."
                });
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x => x.Id == userId);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Kullanıcı bulunamadı."
                });
            }

            var hasNeeds = await dbContext.NeedRequests
                .AsNoTracking()
                .AnyAsync(x => x.OwnerUserId == userId);

            var hasProvider = await dbContext.Providers
                .AsNoTracking()
                .AnyAsync(x => x.OwnerUserId == userId);

            if (hasNeeds || hasProvider)
            {
                return Results.Conflict(new
                {
                    message = "Bu kullanıcıya bağlı geçmiş kayıtlar bulunduğu için hesap doğrudan silinemez. Hesabı pasif hale getirin. Kalıcı silme/anonimleştirme işlemini KVKK veri saklama politikasıyla birlikte uygulayacağız."
                });
            }

            dbContext.Users.Remove(user);

            try
            {
                await dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Results.Conflict(new
                {
                    message = "Bu hesaba bağlı başka kayıtlar bulunduğu için hesap silinemedi. Hesabı pasif hale getirin."
                });
            }

            dbContext.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = currentUserId,
                AdminEmail = principal.FindFirstValue(ClaimTypes.Email) ?? principal.Identity?.Name ?? "unknown",
                Action = "user.delete",
                EntityType = "user",
                EntityId = userId.ToString(),
                EntityName = user.DisplayName ?? user.Email,
                Details = $"Kullanici silindi: {user.Email}",
                CreatedAtUtc = DateTime.UtcNow
            });
            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                userId,
                message = "Kullanıcı hesabı silindi."
            });
        });
        group.MapPost("/{userId:guid}/status", async (
            Guid userId,
            UpdateAdminUserStatusRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var currentUserIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(currentUserIdValue, out var currentUserId))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x => x.Id == userId);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Kullanıcı bulunamadı."
                });
            }

            if (user.Id == currentUserId && request.IsActive == false)
            {
                return Results.Conflict(new
                {
                    message = "Kendi admin hesabınızı pasif hale getiremezsiniz."
                });
            }

            if (user.IsActive == request.IsActive)
            {
                return Results.Ok(new
                {
                    user.Id,
                    user.IsActive,
                    message = request.IsActive
                        ? "Kullanıcı zaten aktif."
                        : "Kullanıcı zaten pasif."
                });
            }

            user.IsActive = request.IsActive;
            user.UpdatedAtUtc = DateTime.UtcNow;

            dbContext.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = currentUserId,
                AdminEmail = principal.FindFirstValue(ClaimTypes.Email) ?? principal.Identity?.Name ?? "unknown",
                Action = request.IsActive ? "user.activate" : "user.deactivate",
                EntityType = "user",
                EntityId = user.Id.ToString(),
                EntityName = user.DisplayName ?? user.Email,
                Details = request.IsActive
                    ? $"Kullanici aktif edildi: {user.Email}"
                    : $"Kullanici pasife alindi: {user.Email}",
                CreatedAtUtc = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                user.Id,
                user.IsActive,
                message = request.IsActive
                    ? "Kullanıcı hesabı aktifleştirildi."
                    : "Kullanıcı hesabı pasif hale getirildi."
            });
        });

        return app;
    }

    private static bool TryParseRole(
        string value,
        out UserRole role)
    {
        switch (value.Trim().ToLowerInvariant())
        {
            case "user":
                role = UserRole.User;
                return true;
            case "provider":
                role = UserRole.Provider;
                return true;
            case "admin":
                role = UserRole.Admin;
                return true;
            default:
                role = default;
                return false;
        }
    }
}

public sealed record UpdateAdminUserStatusRequest(
    bool IsActive);
