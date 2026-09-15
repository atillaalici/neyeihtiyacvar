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
            else
            {
                // İşletme sahipleri İşletmeler ekranından yönetilir.
                // Kullanıcılar ekranında aynı hesabı ikinci kez göstermeyiz.
                query = query.Where(x => x.Role != UserRole.Provider);
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

            if (user.Role == UserRole.Admin)
            {
                return Results.Conflict(new
                {
                    message = "Admin hesabı bu ekrandan kalıcı olarak silinemez."
                });
            }

            var ownedProvider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (ownedProvider is not null)
            {
                return Results.Conflict(new
                {
                    message =
                        "Bu hesap bir işletmenin sahibidir. İşletmeler ekranından işletmeyi silin; bağlı hesap birlikte temizlenecektir."
                });
            }

            await using var transaction =
                await dbContext.Database.BeginTransactionAsync();

            try
            {
                var needs = await dbContext.NeedRequests
                    .Where(x => x.OwnerUserId == userId)
                    .ToListAsync();

                foreach (var need in needs)
                {
                    need.OwnerUserId = null;
                }

                var reviews = await dbContext.ProviderReviews
                    .Where(x => x.UserId == userId)
                    .ToListAsync();

                if (reviews.Count > 0)
                {
                    dbContext.ProviderReviews.RemoveRange(reviews);
                }

                var memberships = await dbContext.ProviderMemberships
                    .Where(x => x.UserId == userId)
                    .ToListAsync();

                if (memberships.Count > 0)
                {
                    dbContext.ProviderMemberships.RemoveRange(memberships);
                }

                var verificationCodes = await dbContext.AccountVerificationCodes
                    .Where(x => x.UserId == userId)
                    .ToListAsync();

                if (verificationCodes.Count > 0)
                {
                    dbContext.AccountVerificationCodes.RemoveRange(verificationCodes);
                }

                var notifications = await dbContext.Notifications
                    .Where(x => x.UserId == userId)
                    .ToListAsync();

                if (notifications.Count > 0)
                {
                    dbContext.Notifications.RemoveRange(notifications);
                }

                var deletedEmail = user.Email;
                var deletedPhone = user.PhoneNumber;
                var deletedName = user.DisplayName;

                dbContext.Users.Remove(user);
                await dbContext.SaveChangesAsync();

                dbContext.AdminAuditLogs.Add(new AdminAuditLog
                {
                    AdminUserId = currentUserId,
                    AdminEmail =
                        principal.FindFirstValue(ClaimTypes.Email) ??
                        principal.Identity?.Name ??
                        "unknown",
                    Action = "user.hard-delete",
                    EntityType = "user",
                    EntityId = userId.ToString(),
                    EntityName = deletedName ?? deletedEmail,
                    Details = $"Kullanıcı kalıcı silindi: {deletedEmail}",
                    CreatedAtUtc = DateTime.UtcNow
                });

                await dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok(new
                {
                    userId,
                    deletedEmail,
                    deletedPhone,
                    message =
                        "Kullanıcı hesabı kalıcı olarak silindi. E-posta ve telefon yeniden kullanılabilir."
                });
            }
            catch (Exception exception)
            {
                await transaction.RollbackAsync();

                return Results.Conflict(new
                {
                    message = "Kullanıcı silinirken bağlı kayıtlar temizlenemedi.",
                    detail = exception.Message
                });
            }
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
