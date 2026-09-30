using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Notifications;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderInteractionEndpoints
{
    private static readonly HashSet<string> AllowedChannels =
    [
        "phone",
        "whatsapp",
        "email",
        "offer"
    ];

    private static readonly HashSet<string> AllowedSources =
    [
        "profile",
        "search_results",
        "need",
        "unknown"
    ];

    private static readonly HashSet<string> AllowedNoServiceReasons =
    [
        "price",
        "no_response",
        "other_provider",
        "no_longer_needed",
        "other"
    ];

    public static IEndpointRouteBuilder MapProviderInteractionEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/provider-interactions")
            .RequireAuthorization();

        // Kullanıcı işletmeyle telefon / WhatsApp / e-posta vb.
        // kanallardan iletişime geçtiğinde gerçek etkileşim kaydı oluşturur.
        group.MapPost("/", async (
            CreateProviderInteractionRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var channel = Normalize(request.Channel, 30);

            if (channel is null || !AllowedChannels.Contains(channel))
            {
                return Results.BadRequest(new
                {
                    message = "Geçersiz iletişim kanalı."
                });
            }

            var source = Normalize(request.Source, 30) ?? "unknown";

            if (!AllowedSources.Contains(source))
            {
                source = "unknown";
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .Where(x =>
                    x.Slug == request.ProviderSlug &&
                    x.IsActive &&
                    x.PublicationStatus == PublicationStatus.Published)
                .Select(x => new
                {
                    x.Id,
                    x.BusinessName,
                    x.Slug,
                    x.OwnerUserId
                })
                .FirstOrDefaultAsync();

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme bulunamadı."
                });
            }

            if (provider.OwnerUserId == userId)
            {
                return Results.BadRequest(new
                {
                    message = "Kendi işletmeniz için iletişim kaydı oluşturamazsınız."
                });
            }

            var duplicateSince = DateTime.UtcNow.AddMinutes(-10);

            var existingInteraction = await dbContext.ProviderInteractions
                .Where(x =>
                    x.UserId == userId &&
                    x.ProviderId == provider.Id &&
                    x.Channel == channel &&
                    x.Status == "pending" &&
                    x.CreatedAtUtc >= duplicateSince)
                .OrderByDescending(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync();

            if (existingInteraction is not null)
            {
                return Results.Ok(new
                {
                    existingInteraction.Id,
                    existingInteraction.ProviderId,
                    providerSlug = provider.Slug,
                    businessName = provider.BusinessName,
                    existingInteraction.Channel,
                    existingInteraction.Source,
                    existingInteraction.Status,
                    existingInteraction.FollowUpAtUtc,
                    existingInteraction.CreatedAtUtc,
                    duplicate = true
                });
            }

            var now = DateTime.UtcNow;

            var interaction = new ProviderInteraction
            {
                ProviderId = provider.Id,
                UserId = userId,
                Channel = channel,
                Source = source,
                Status = "pending",

                // Kullanıcı siteye sonraki girişinde bu etkileşim
                // değerlendirme için uygun hale gelir.
                FollowUpAtUtc = now,

                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.ProviderInteractions.Add(interaction);
            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/provider-interactions/{interaction.Id}",
                new
                {
                    interaction.Id,
                    interaction.ProviderId,
                    providerSlug = provider.Slug,
                    businessName = provider.BusinessName,
                    interaction.Channel,
                    interaction.Source,
                    interaction.Status,
                    interaction.FollowUpAtUtc,
                    interaction.CreatedAtUtc,
                    duplicate = false
                });
        });

        // Kullanıcının cevaplaması gereken en eski etkileşimi getirir.
        group.MapGet("/pending", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var now = DateTime.UtcNow;

            var interaction = await dbContext.ProviderInteractions
                .AsNoTracking()
                .Where(x =>
                    x.UserId == userId &&
                    x.Status == "pending" &&
                    (x.FollowUpAtUtc == null || x.FollowUpAtUtc <= now))
                .OrderBy(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.ProviderId,
                    providerSlug = x.Provider.Slug,
                    businessName = x.Provider.BusinessName,
                    x.Channel,
                    x.Source,
                    x.CreatedAtUtc
                })
                .FirstOrDefaultAsync();

            return Results.Ok(interaction);
        });

        // Kullanıcı hizmet almadı, süreç devam ediyor veya
        // daha sonra hatırlat seçeneğini kullandığında çağrılır.
        group.MapPost("/{interactionId:guid}/outcome", async (
            Guid interactionId,
            ProviderInteractionOutcomeRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var interaction = await dbContext.ProviderInteractions
                .FirstOrDefaultAsync(x =>
                    x.Id == interactionId &&
                    x.UserId == userId);

            if (interaction is null)
            {
                return Results.NotFound(new
                {
                    message = "İletişim kaydı bulunamadı."
                });
            }

            if (interaction.Status != "pending")
            {
                return Results.Conflict(new
                {
                    message = "Bu iletişim kaydı daha önce sonuçlandırılmış."
                });
            }

            var outcome = Normalize(request.Outcome, 30);

            if (outcome is null)
            {
                return Results.BadRequest(new
                {
                    message = "Sonuç bilgisi gereklidir."
                });
            }

            var now = DateTime.UtcNow;

            switch (outcome)
            {
                case "no_service":
                {
                    var reason = Normalize(request.Reason, 80);

                    if (reason is not null &&
                        !AllowedNoServiceReasons.Contains(reason))
                    {
                        return Results.BadRequest(new
                        {
                            message = "Geçersiz hizmet almama nedeni."
                        });
                    }

                    interaction.Status = "no_service";
                    interaction.NoServiceReason = reason;
                    interaction.ResolvedAtUtc = now;
                    interaction.FollowUpAtUtc = null;
                    break;
                }

                case "considering":
                    interaction.Status = "considering";
                    interaction.NoServiceReason = null;
                    interaction.ResolvedAtUtc = now;
                    interaction.FollowUpAtUtc = null;
                    break;

                case "not_contacted":
                    interaction.Status = "not_contacted";
                    interaction.NoServiceReason = null;
                    interaction.ResolvedAtUtc = now;
                    interaction.FollowUpAtUtc = null;
                    break;

                case "remind_later":
                    interaction.Status = "pending";
                    interaction.NoServiceReason = null;
                    interaction.ResolvedAtUtc = null;
                    interaction.FollowUpAtUtc = now.AddDays(3);
                    break;

                default:
                    return Results.BadRequest(new
                    {
                        message = "Geçersiz sonuç seçeneği."
                    });
            }

            interaction.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                interaction.Id,
                interaction.Status,
                interaction.NoServiceReason,
                interaction.FollowUpAtUtc,
                interaction.ResolvedAtUtc
            });
        });

        // Kullanıcı hizmet aldığını doğruladığında değerlendirme oluşturur.
        // Bu değerlendirme mevcut ProviderReviews sistemine dahil edilir.
        group.MapPost("/{interactionId:guid}/review", async (
            Guid interactionId,
            CreateInteractionReviewRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var interaction = await dbContext.ProviderInteractions
                .Include(x => x.Provider)
                .FirstOrDefaultAsync(x =>
                    x.Id == interactionId &&
                    x.UserId == userId);

            if (interaction is null)
            {
                return Results.NotFound(new
                {
                    message = "İletişim kaydı bulunamadı."
                });
            }

            if (interaction.Status != "pending")
            {
                return Results.Conflict(new
                {
                    message = "Bu iletişim kaydı daha önce sonuçlandırılmış."
                });
            }

            if (request.Rating is < 1 or > 5)
            {
                return Results.BadRequest(new
                {
                    message = "Puan 1 ile 5 arasında olmalıdır."
                });
            }

            var comment = request.Comment?.Trim() ?? string.Empty;

            // Doğrudan iletişim değerlendirmesinde yorum isteğe bağlıdır.
            if (comment.Length > 2000)
            {
                return Results.BadRequest(new
                {
                    message = "Yorum en fazla 2000 karakter olabilir."
                });
            }

            var alreadyReviewed = await dbContext.ProviderReviews
                .AnyAsync(x => x.ProviderInteractionId == interaction.Id);

            if (alreadyReviewed)
            {
                return Results.Conflict(new
                {
                    message = "Bu iletişim için daha önce değerlendirme yapılmış."
                });
            }

            var now = DateTime.UtcNow;

            var review = new ProviderReview
            {
                NeedRequestId = null,
                ProviderInteractionId = interaction.Id,
                ProviderId = interaction.ProviderId,
                UserId = userId,
                Rating = request.Rating,
                Comment = comment,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.ProviderReviews.Add(review);

            interaction.Status = "service_received";
            interaction.NoServiceReason = null;
            interaction.FollowUpAtUtc = null;
            interaction.ResolvedAtUtc = now;
            interaction.UpdatedAtUtc = now;

            if (interaction.Provider.OwnerUserId is Guid ownerUserId)
            {
                NotificationWriter.Add(
                    dbContext,
                    ownerUserId,
                    "new_review_received",
                    "Yeni müşteri değerlendirmesi",
                    $"{interaction.Provider.BusinessName} için {request.Rating}/5 puanlı yeni bir değerlendirme aldınız.",
                    "/panel");
            }

            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/provider-interactions/{interaction.Id}/review",
                new
                {
                    review.Id,
                    review.ProviderInteractionId,
                    review.ProviderId,
                    review.Rating,
                    review.Comment,
                    review.CreatedAtUtc,
                    interactionStatus = interaction.Status
                });
        });

        return app;
    }

    private static bool TryGetUserId(
        ClaimsPrincipal principal,
        out Guid userId)
    {
        var value =
            principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
            principal.FindFirstValue("sub");

        return Guid.TryParse(value, out userId);
    }

    private static string? Normalize(
        string? value,
        int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim().ToLowerInvariant();

        return normalized.Length <= maxLength
            ? normalized
            : normalized[..maxLength];
    }
}

public sealed record CreateProviderInteractionRequest(
    string ProviderSlug,
    string Channel,
    string? Source);

public sealed record ProviderInteractionOutcomeRequest(
    string Outcome,
    string? Reason);

public sealed record CreateInteractionReviewRequest(
    int Rating,
    string? Comment);
