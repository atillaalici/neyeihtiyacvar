using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class SearchIntentLibraryEndpoints
{
    public static IEndpointRouteBuilder MapSearchIntentLibraryEndpoints(
        this IEndpointRouteBuilder app)
    {
        app.MapGet(
            "/api/search/intents/suggest",
            async (
                string? q,
                int? limit,
                AppDbContext dbContext,
                CancellationToken cancellationToken) =>
            {
                var clean = q?.Trim() ?? string.Empty;

                if (clean.Length < 2)
                {
                    return Results.Ok(
                        Array.Empty<SearchIntentSuggestion>());
                }

                var suggestions =
                    await DbSearchIntentLibrary.SuggestAsync(
                        dbContext,
                        clean,
                        Math.Clamp(limit ?? 8, 1, 12),
                        cancellationToken);

                return Results.Ok(suggestions);
            });

        return app;
    }
}
