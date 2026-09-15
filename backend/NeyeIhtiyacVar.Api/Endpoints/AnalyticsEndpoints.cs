using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AnalyticsEndpoints
{
    private static readonly HashSet<string> AllowedEvents =
    [
        "provider_view",
        "phone_click",
        "whatsapp_click",
        "search_submit"
    ];

    private static readonly HashSet<string> AllowedSources =
    [
        "typing",
        "enter",
        "button",
        "profile",
        "search_results",
        "unknown"
    ];

    public static IEndpointRouteBuilder MapAnalyticsEndpoints(
        this IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/analytics");

        publicGroup.MapPost("/events", async (
            TrackAnalyticsEventRequest request,
            AppDbContext dbContext) =>
        {
            var eventType = Normalize(request.EventType, 40);

            if (eventType is null || !AllowedEvents.Contains(eventType))
            {
                return Results.BadRequest(new
                {
                    message = "Gecersiz istatistik olayi."
                });
            }

            var source = Normalize(request.Source, 40);

            if (source is not null && !AllowedSources.Contains(source))
            {
                source = "unknown";
            }

            Guid? providerId = null;

            if (eventType is "provider_view" or "phone_click" or "whatsapp_click")
            {
                var providerSlug = Normalize(request.ProviderSlug, 160);

                if (providerSlug is null)
                {
                    return Results.BadRequest(new
                    {
                        message = "Isletme bilgisi gerekli."
                    });
                }

                providerId = await dbContext.Providers
                    .AsNoTracking()
                    .Where(x => x.IsActive && x.Slug == providerSlug)
                    .Select(x => (Guid?)x.Id)
                    .FirstOrDefaultAsync();

                if (providerId is null)
                {
                    return Results.NotFound(new
                    {
                        message = "Isletme bulunamadi."
                    });
                }
            }

            var searchTerm =
                eventType == "search_submit"
                    ? Normalize(request.SearchTerm, 300)
                    : null;

            if (eventType == "search_submit" && searchTerm is null)
            {
                return Results.BadRequest(new
                {
                    message = "Arama metni gerekli."
                });
            }

            dbContext.AnalyticsEvents.Add(new AnalyticsEvent
            {
                EventType = eventType,
                ProviderId = providerId,
                SearchTerm = searchTerm,
                Source = source ?? "unknown",
                CreatedAtUtc = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync();

            return Results.NoContent();
        });

        var panelGroup = app
            .MapGroup("/api/provider-panel/analytics")
            .RequireAuthorization();

        panelGroup.MapGet("/", async (
            ClaimsPrincipal user,
            AppDbContext dbContext) =>
        {
            var userId = GetUserId(user);

            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .Where(x =>
                    x.OwnerUserId == userId.Value &&
                    x.IsActive)
                .Select(x => new
                {
                    x.Id,
                    x.BusinessName,
                    x.Slug
                })
                .FirstOrDefaultAsync();

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Aktif isletme profili bulunamadi."
                });
            }

            var now = DateTime.UtcNow;
            var query = dbContext.AnalyticsEvents
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id);

            var weekly = await BuildPeriod(query, now.AddDays(-7), now);
            var monthly = await BuildPeriod(query, now.AddDays(-30), now);
            var yearly = await BuildPeriod(query, now.AddDays(-365), now);
            var total = await BuildPeriod(query, null, now);

            return Results.Ok(new
            {
                provider = new
                {
                    provider.Id,
                    provider.BusinessName,
                    provider.Slug
                },
                generatedAtUtc = now,
                periods = new
                {
                    weekly,
                    monthly,
                    yearly,
                    total
                }
            });
        });

        return app;
    }

    private static async Task<object> BuildPeriod(
        IQueryable<AnalyticsEvent> query,
        DateTime? startUtc,
        DateTime endUtc)
    {
        if (startUtc is not null)
        {
            query = query.Where(x => x.CreatedAtUtc >= startUtc.Value);
        }

        query = query.Where(x => x.CreatedAtUtc <= endUtc);

        var profileViews = await query.CountAsync(
            x => x.EventType == "provider_view");

        var phoneClicks = await query.CountAsync(
            x => x.EventType == "phone_click");

        var whatsappClicks = await query.CountAsync(
            x => x.EventType == "whatsapp_click");

        return new
        {
            profileViews,
            phoneClicks,
            whatsappClicks,
            totalContactClicks = phoneClicks + whatsappClicks,
            startUtc,
            endUtc
        };
    }

    private static Guid? GetUserId(ClaimsPrincipal user)
    {
        var raw =
            user.FindFirstValue(ClaimTypes.NameIdentifier) ??
            user.FindFirstValue("sub");

        return Guid.TryParse(raw, out var id)
            ? id
            : null;
    }

    private static string? Normalize(
        string? value,
        int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();

        return normalized.Length <= maxLength
            ? normalized
            : normalized[..maxLength];
    }
}

public sealed record TrackAnalyticsEventRequest(
    string EventType,
    string? ProviderSlug,
    string? SearchTerm,
    string? Source);