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
            var totalNeeds = await dbContext.NeedRequests.CountAsync(x => x.IsActive);
            var openNeeds = await dbContext.NeedRequests.CountAsync(
                x => x.IsActive && x.Status == NeedStatus.Open);
            var offerReceivedNeeds = await dbContext.NeedRequests.CountAsync(
                x => x.IsActive && x.Status == NeedStatus.OfferReceived);
            var completedNeeds = await dbContext.NeedRequests.CountAsync(
                x => x.IsActive && x.Status == NeedStatus.Completed);
            var cancelledNeeds = await dbContext.NeedRequests.CountAsync(
                x => x.IsActive && x.Status == NeedStatus.Cancelled);

            var pendingApplications =
                await dbContext.ProviderApplications.CountAsync(
                    x => x.Status == ProviderApplicationStatus.Pending);

            var approvedApplications =
                await dbContext.ProviderApplications.CountAsync(
                    x => x.Status == ProviderApplicationStatus.Approved);

            // Kullanıcılar ekranıyla aynı kapsam:
            // İşletme sahibi (Provider) hesapları burada kullanıcı sayısına dahil edilmez.
            var totalUsers = await dbContext.Users.CountAsync(
                x => x.Role != UserRole.Provider);

            var activeUsers = await dbContext.Users.CountAsync(
                x => x.Role != UserRole.Provider && x.IsActive);

            // İşletmeler ekranıyla aynı kapsam:
            // Pasif işletmeler "Pasifler" bölümünde yönetildiği için ana toplamda sayılmaz.
            var totalProviders = await dbContext.Providers.CountAsync(
                x => x.IsActive);

            var publishedProviders =
                await dbContext.Providers.CountAsync(
                    x =>
                        x.IsActive &&
                        x.PublicationStatus == PublicationStatus.Published);

            var totalOffers = await dbContext.ProviderOffers.CountAsync();
            var pendingOffers = await dbContext.ProviderOffers.CountAsync(
                x => x.Status == OfferStatus.Pending);

            var totalReviews = await dbContext.ProviderReviews.CountAsync();

            var recentNeeds = await dbContext.NeedRequests
            .Where(x => x.IsActive)
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
                totalUsers,
                activeUsers,
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