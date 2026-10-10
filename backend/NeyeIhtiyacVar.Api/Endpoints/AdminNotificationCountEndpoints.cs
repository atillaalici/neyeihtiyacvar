using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminNotificationCountEndpoints
{
    public static IEndpointRouteBuilder MapAdminNotificationCountEndpoints(
        this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/admin/notification-counts", async (
            AppDbContext dbContext) =>
        {
            var contactRequests = await dbContext.ContactRequests
                .CountAsync(x => x.Status == "new");

            var providerApplications = await dbContext.ProviderApplications
                .CountAsync(x =>
                    x.Status == ProviderApplicationStatus.Pending);

            return Results.Ok(new
            {
                contactRequests,
                providerApplications,
                total = contactRequests + providerApplications
            });
        })
        .RequireAuthorization("AdminOnly");

        return app;
    }
}
