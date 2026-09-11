using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;

namespace NeyeIhtiyacVar.Api.Infrastructure.Notifications;

public static class TrackedNeedMatchNotifier
{
    public static async Task<int> NotifyForProviderAsync(
        AppDbContext dbContext,
        Provider provider,
        IEnumerable<string>? onlyServiceSlugs = null)
    {
        if (!provider.IsActive ||
            provider.PublicationStatus != PublicationStatus.Published)
        {
            return 0;
        }

        var serviceSlugs = (onlyServiceSlugs ??
                new[] { provider.ServiceSlug }
                    .Concat(provider.AdditionalServices))
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLowerInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (serviceSlugs.Length == 0)
        {
            return 0;
        }

        var now = DateTime.UtcNow;
        var notificationCutoff = now.AddHours(-24);

        var needs = await dbContext.NeedRequests
            .AsNoTracking()
            .Where(x =>
                x.TargetProviderId == null &&
                x.OwnerUserId != null &&
                x.IsActive &&
                x.Status == NeedStatus.Open &&
                (x.TrackingExpiresAtUtc == null ||
                 x.TrackingExpiresAtUtc > now) &&
                x.CitySlug == provider.CitySlug &&
                x.DistrictSlug == provider.DistrictSlug &&
                x.ServiceSlug != null &&
                serviceSlugs.Contains(x.ServiceSlug))
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => new
            {
                x.Id,
                OwnerUserId = x.OwnerUserId!.Value,
                x.Title
            })
            .ToListAsync();

        var created = 0;

        foreach (var need in needs)
        {
            var needMarker = $"needId={need.Id}";

            var alreadyNotifiedRecently = await dbContext.Notifications
                .AsNoTracking()
                .AnyAsync(x =>
                    x.UserId == need.OwnerUserId &&
                    x.EventType == "need.provider-match" &&
                    x.CreatedAtUtc >= notificationCutoff &&
                    x.Link != null &&
                    x.Link.Contains(needMarker));

            if (alreadyNotifiedRecently)
            {
                continue;
            }

            var link =
                $"/kesfet?q={Uri.EscapeDataString(need.Title)}" +
                $"&needId={need.Id}" +
                $"&provider={Uri.EscapeDataString(provider.Slug)}";

            NotificationWriter.Add(
                dbContext,
                need.OwnerUserId,
                "need.provider-match",
                "Talebinize uygun işletme bulundu",
                $"{provider.BusinessName} \"{need.Title}\" talebinizi karşılayabilir. Uygun işletmeleri görmek için bildirime tıklayın.",
                link);

            created++;
        }

        return created;
    }
}
