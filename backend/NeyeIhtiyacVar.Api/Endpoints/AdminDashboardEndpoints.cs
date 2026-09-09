using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminDashboardEndpoints
{
    public static IEndpointRouteBuilder MapAdminDashboardEndpoints(
        this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/admin/dashboard", async (
            AppDbContext dbContext) =>
        {
            var totalNeeds = await dbContext.NeedRequests.CountAsync();
            var openNeeds = await dbContext.NeedRequests.CountAsync(
                x => x.Status == NeedStatus.Open);
            var offerReceivedNeeds = await dbContext.NeedRequests.CountAsync(
                x => x.Status == NeedStatus.OfferReceived);
            var completedNeeds = await dbContext.NeedRequests.CountAsync(
                x => x.Status == NeedStatus.Completed);
            var cancelledNeeds = await dbContext.NeedRequests.CountAsync(
                x => x.Status == NeedStatus.Cancelled);

            var pendingApplications =
                await dbContext.ProviderApplications.CountAsync(
                    x => x.Status == ProviderApplicationStatus.Pending);

            var approvedApplications =
                await dbContext.ProviderApplications.CountAsync(
                    x => x.Status == ProviderApplicationStatus.Approved);

            var totalProviders = await dbContext.Providers.CountAsync();

            var publishedProviders =
                await dbContext.Providers.CountAsync(
                    x => x.PublicationStatus == PublicationStatus.Published);

            var totalOffers = await dbContext.ProviderOffers.CountAsync();
            var pendingOffers = await dbContext.ProviderOffers.CountAsync(
                x => x.Status == OfferStatus.Pending);

            var totalReviews = await dbContext.ProviderReviews.CountAsync();

            var recentNeeds = await dbContext.NeedRequests
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAtUtc)
                .Take(6)
                .Select(x => new
                {
                    x.Id,
                    x.Title,
                    x.City,
                    x.District,
                    status = x.Status.ToString().ToLowerInvariant(),
                    x.CreatedAtUtc
                })
                .ToListAsync();

            var recentApplications = await dbContext.ProviderApplications
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAtUtc)
                .Take(6)
                .Select(x => new
                {
                    x.Id,
                    x.BusinessName,
                    x.CitySlug,
                    x.DistrictSlug,
                    status = x.Status.ToString().ToLowerInvariant(),
                    x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(new
            {
                totalNeeds,
                openNeeds,
                offerReceivedNeeds,
                completedNeeds,
                cancelledNeeds,
                pendingApplications,
                approvedApplications,
                totalProviders,
                publishedProviders,
                totalOffers,
                pendingOffers,
                totalReviews,
                recentNeeds,
                recentApplications
            });
        });

        return app;
    }
}