using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class NotificationEndpoints
{
    public static IEndpointRouteBuilder MapNotificationEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/notifications")
            .RequireAuthorization();

        group.MapGet("/", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            int? take) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var safeTake = Math.Clamp(take ?? 30, 1, 100);

            var items = await dbContext.Notifications
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Take(safeTake)
                .Select(x => new
                {
                    x.Id,
                    x.EventType,
                    x.Title,
                    x.Message,
                    x.Link,
                    x.IsRead,
                    x.CreatedAtUtc,
                    x.ReadAtUtc
                })
                .ToListAsync();

            var unreadCount = await dbContext.Notifications
                .AsNoTracking()
                .CountAsync(x =>
                    x.UserId == userId &&
                    !x.IsRead);

            return Results.Ok(new
            {
                unreadCount,
                items
            });
        });

        group.MapGet("/unread-count", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var count = await dbContext.Notifications
                .AsNoTracking()
                .CountAsync(x =>
                    x.UserId == userId &&
                    !x.IsRead);

            return Results.Ok(new
            {
                unreadCount = count
            });
        });

        group.MapPost("/{id:guid}/read", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var notification = await dbContext.Notifications
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.UserId == userId);

            if (notification is null)
            {
                return Results.NotFound(new
                {
                    message = "Bildirim bulunamadı."
                });
            }

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAtUtc = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                notification.Id,
                notification.IsRead,
                notification.ReadAtUtc
            });
        });

        group.MapPost("/read-all", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var now = DateTime.UtcNow;

            var updated = await dbContext.Notifications
                .Where(x =>
                    x.UserId == userId &&
                    !x.IsRead)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.IsRead, true)
                    .SetProperty(x => x.ReadAtUtc, now));

            return Results.Ok(new
            {
                updated
            });
        });

        return app;
    }

    private static bool TryGetUserId(
        ClaimsPrincipal principal,
        out Guid userId)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out userId);
    }
}