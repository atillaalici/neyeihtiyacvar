using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminAnalyticsEndpoints
{
    public static IEndpointRouteBuilder MapAdminAnalyticsEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/admin/analytics")
            .RequireAuthorization(policy =>
                policy.RequireRole(UserRole.Admin.ToString()));

        group.MapGet("/", async (
            string? period,
            AppDbContext dbContext) =>
        {
            var normalizedPeriod = (period ?? "weekly")
                .Trim()
                .ToLowerInvariant();

            var now = DateTime.UtcNow;

            DateTime? startUtc = normalizedPeriod switch
            {
                "weekly" => now.AddDays(-7),
                "monthly" => now.AddDays(-30),
                "yearly" => now.AddDays(-365),
                "total" => null,
                _ => now.AddDays(-7)
            };

            var query = dbContext.AnalyticsEvents
                .AsNoTracking()
                .Where(x => x.CreatedAtUtc <= now);

            if (startUtc is not null)
            {
                query = query.Where(x => x.CreatedAtUtc >= startUtc.Value);
            }

            var searches = await query.CountAsync(
                x => x.EventType == "search_submit");

            var profileViews = await query.CountAsync(
                x => x.EventType == "provider_view");

            var phoneClicks = await query.CountAsync(
                x => x.EventType == "phone_click");

            var whatsappClicks = await query.CountAsync(
                x => x.EventType == "whatsapp_click");

            var topSearches = await query
                .Where(x =>
                    x.EventType == "search_submit" &&
                    x.SearchTerm != null &&
                    x.SearchTerm != "")
                .GroupBy(x => x.SearchTerm!)
                .Select(group => new
                {
                    term = group.Key,
                    count = group.Count()
                })
                .OrderByDescending(x => x.count)
                .ThenBy(x => x.term)
                .Take(10)
                .ToListAsync();

            var providerStats = await query
                .Where(x =>
                    x.ProviderId != null &&
                    (x.EventType == "provider_view" ||
                     x.EventType == "phone_click" ||
                     x.EventType == "whatsapp_click"))
                .GroupBy(x => x.ProviderId!.Value)
                .Select(group => new
                {
                    providerId = group.Key,
                    profileViews = group.Count(x =>
                        x.EventType == "provider_view"),
                    phoneClicks = group.Count(x =>
                        x.EventType == "phone_click"),
                    whatsappClicks = group.Count(x =>
                        x.EventType == "whatsapp_click")
                })
                .ToListAsync();

            var providerIds = providerStats
                .Select(x => x.providerId)
                .ToArray();

            var providers = await dbContext.Providers
                .AsNoTracking()
                .Where(x => providerIds.Contains(x.Id))
                .Select(x => new
                {
                    x.Id,
                    x.BusinessName,
                    x.Slug
                })
                .ToDictionaryAsync(x => x.Id);

            var topProviders = providerStats
                .Select(x =>
                {
                    providers.TryGetValue(x.providerId, out var provider);

                    return new
                    {
                        x.providerId,
                        businessName =
                            provider?.BusinessName ?? "Bilinmeyen İşletme",
                        slug = provider?.Slug,
                        x.profileViews,
                        x.phoneClicks,
                        x.whatsappClicks,
                        totalContactClicks =
                            x.phoneClicks + x.whatsappClicks
                    };
                })
                .OrderByDescending(x => x.totalContactClicks)
                .ThenByDescending(x => x.profileViews)
                .Take(10)
                .ToList();

            return Results.Ok(new
            {
                period = normalizedPeriod,
                startUtc,
                endUtc = now,
                generatedAtUtc = now,
                totals = new
                {
                    searches,
                    profileViews,
                    phoneClicks,
                    whatsappClicks,
                    totalContactClicks =
                        phoneClicks + whatsappClicks
                },
                topSearches,
                topProviders
            });
        });

        return app;
    }
}