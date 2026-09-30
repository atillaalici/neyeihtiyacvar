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

            var weekly = await BuildPeriod(
                dbContext, provider.Id, query, now.AddDays(-7), now);
            var monthly = await BuildPeriod(
                dbContext, provider.Id, query, now.AddDays(-30), now);
            var yearly = await BuildPeriod(
                dbContext, provider.Id, query, now.AddDays(-365), now);
            var total = await BuildPeriod(
                dbContext, provider.Id, query, null, now);

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


        publicGroup.MapGet("/popular-searches", async (AppDbContext dbContext) =>
        {
            var since = DateTime.UtcNow.AddDays(-30);
            var searchEventTypes = new[] { "search", "search_results", "search_submit" };

            var rows = await dbContext.AnalyticsEvents
                .AsNoTracking()
                .Where(x => x.CreatedAtUtc >= since
                    && searchEventTypes.Contains(x.EventType)
                    && x.SearchTerm != null
                    && x.SearchTerm != "")
                .GroupBy(x => x.SearchTerm)
                .Select(group => new
                {
                    term = group.Key,
                    count = group.Count()
                })
                .OrderByDescending(x => x.count)
                .ThenBy(x => x.term)
                .Take(8)
                .ToListAsync();

            return Results.Ok(rows);
        });

        return app;
    }

    private static async Task<object> BuildPeriod(
        AppDbContext dbContext,
        Guid providerId,
        IQueryable<AnalyticsEvent> analyticsQuery,
        DateTime? startUtc,
        DateTime endUtc)
    {
        if (startUtc is not null)
        {
            analyticsQuery = analyticsQuery.Where(
                x => x.CreatedAtUtc >= startUtc.Value);
        }

        analyticsQuery = analyticsQuery.Where(
            x => x.CreatedAtUtc <= endUtc);

        var profileViews = await analyticsQuery.CountAsync(
            x => x.EventType == "provider_view");

        var phoneClicks = await analyticsQuery.CountAsync(
            x => x.EventType == "phone_click");

        var whatsappClicks = await analyticsQuery.CountAsync(
            x => x.EventType == "whatsapp_click");

        var interactionQuery = dbContext.ProviderInteractions
            .AsNoTracking()
            .Where(x =>
                x.ProviderId == providerId &&
                x.CreatedAtUtc <= endUtc);

        if (startUtc is not null)
        {
            interactionQuery = interactionQuery.Where(
                x => x.CreatedAtUtc >= startUtc.Value);
        }

        var trackedPhoneContacts = await interactionQuery.CountAsync(
            x => x.Channel == "phone");

        var trackedWhatsappContacts = await interactionQuery.CountAsync(
            x => x.Channel == "whatsapp");

        var emailContacts = await interactionQuery.CountAsync(
            x => x.Channel == "email");

        var offerContacts = await interactionQuery.CountAsync(
            x => x.Channel == "offer");

        var serviceReceived = await interactionQuery.CountAsync(
            x => x.Status == "service_received");

        var noService = await interactionQuery.CountAsync(
            x => x.Status == "no_service");

        var considering = await interactionQuery.CountAsync(
            x => x.Status == "considering");

        var notContacted = await interactionQuery.CountAsync(
            x => x.Status == "not_contacted");

        var pending = await interactionQuery.CountAsync(
            x => x.Status == "pending");

        var offerQuery = dbContext.ProviderOffers
            .AsNoTracking()
            .Where(x =>
                x.ProviderId == providerId &&
                x.CreatedAtUtc <= endUtc);

        if (startUtc is not null)
        {
            offerQuery = offerQuery.Where(
                x => x.CreatedAtUtc >= startUtc.Value);
        }

        var offersGiven = await offerQuery.CountAsync();

        var offersAccepted = await offerQuery.CountAsync(
            x => x.Status == OfferStatus.Accepted);

        var totalTrackedContacts =
            trackedPhoneContacts +
            trackedWhatsappContacts +
            emailContacts +
            offerContacts;

        return new
        {
            profileViews,

            // Eski anonim tıklama istatistikleri korunur.
            phoneClicks,
            whatsappClicks,
            totalContactClicks = phoneClicks + whatsappClicks,

            // Giriş yapmış kullanıcıların gerçek etkileşimleri.
            trackedPhoneContacts,
            trackedWhatsappContacts,
            emailContacts,
            offerContacts,
            totalTrackedContacts,

            serviceReceived,
            noService,
            considering,
            notContacted,
            pending,

            offersGiven,
            offersAccepted,

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