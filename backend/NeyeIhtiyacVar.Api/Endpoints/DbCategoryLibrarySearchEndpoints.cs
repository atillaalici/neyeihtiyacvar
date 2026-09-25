using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class DbCategoryLibrarySearchEndpoints
{
    public static IEndpointRouteBuilder MapDbCategoryLibrarySearchEndpoints(
        this IEndpointRouteBuilder app)
    {
        app.MapGet(
            "/api/search/intents/db-suggest",
            async (
                string? q,
                int? limit,
                AppDbContext db,
                CancellationToken ct) =>
            {
                var query = q?.Trim() ?? string.Empty;

                if (query.Length < 2)
                    return Results.Ok(Array.Empty<SearchIntentSuggestion>());

                var suggestions =
                    await DbSearchIntentLibrary.SuggestAsync(
                        db,
                        query,
                        Math.Clamp(limit ?? 8, 1, 12),
                        ct);

                return Results.Ok(suggestions);
            });

        return app;
    }
}
