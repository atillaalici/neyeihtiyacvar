using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class PublicStatsEndpoints
{
    public static IEndpointRouteBuilder MapPublicStatsEndpoints(
        this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/public/stats", async (AppDbContext db) =>
        {
            var users = await db.Users.CountAsync(x =>
                x.IsActive && x.Role != UserRole.Provider);

            var providers = await db.Providers.CountAsync(x =>
                x.IsActive &&
                x.PublicationStatus == PublicationStatus.Published);

            return Results.Ok(new { users, providers });
        });

        return app;
    }
}
