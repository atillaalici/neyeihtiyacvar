using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Infrastructure.Notifications;

public static class NotificationWriter
{
    public static void Add(
        AppDbContext dbContext,
        Guid userId,
        string eventType,
        string title,
        string message,
        string? link = null)
    {
        dbContext.Notifications.Add(new Notification
        {
            UserId = userId,
            EventType = eventType,
            Title = title,
            Message = message,
            Link = link,
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow
        });
    }
}