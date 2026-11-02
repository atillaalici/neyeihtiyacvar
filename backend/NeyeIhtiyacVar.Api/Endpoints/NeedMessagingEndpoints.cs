using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class NeedMessagingEndpoints
{
    public static IEndpointRouteBuilder MapNeedMessagingEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/need-messages")
            .RequireAuthorization();

        // Talep ve işletme üzerinden konuşma başlat.
        group.MapPost("/needs/{needId:guid}/providers/{providerId:guid}/conversation",
            async (Guid needId, Guid providerId,
                ClaimsPrincipal principal, AppDbContext db) =>
            {
                if (!TryGetUserId(principal, out var userId))
                    return Results.Unauthorized();

                var need = await db.NeedRequests
                    .FirstOrDefaultAsync(x => x.Id == needId);

                var provider = await db.Providers
                    .FirstOrDefaultAsync(x => x.Id == providerId);

                if (need is null || provider is null)
                    return Results.NotFound();

                if (need.OwnerUserId != userId &&
                    provider.OwnerUserId != userId)
                    return Results.NotFound();

                var existing = await db.NeedConversations
                    .FirstOrDefaultAsync(x =>
                        x.NeedRequestId == needId &&
                        x.ProviderId == providerId);

                if (existing is not null)
                    return Results.Ok(new {
                        existing.Id,
                        existing.NeedRequestId,
                        existing.ProviderId,
                        existing.ProviderOfferId
                    });

                if (!await CanStartConversationAsync(db, need, provider))
                    return Results.NotFound(new {
                        message = "Bu talep için mesajlaşma başlatılamıyor."
                    });

                var offerId = await db.ProviderOffers
                    .Where(x => x.NeedRequestId == needId &&
                                x.ProviderId == providerId)
                    .Select(x => (Guid?)x.Id)
                    .FirstOrDefaultAsync();

                var conversation = new NeedConversation {
                    NeedRequestId = needId,
                    ProviderId = providerId,
                    ProviderOfferId = offerId
                };

                db.NeedConversations.Add(conversation);

                try {
                    await db.SaveChangesAsync();
                }
                catch (DbUpdateException) {
                    db.Entry(conversation).State = EntityState.Detached;
                    conversation = await db.NeedConversations
                        .FirstOrDefaultAsync(x =>
                            x.NeedRequestId == needId &&
                            x.ProviderId == providerId);

                    if (conversation is null)
                        return Results.Conflict(new {
                            message = "Konuşma oluşturulamadı."
                        });
                }

                return Results.Ok(new {
                    conversation.Id,
                    conversation.NeedRequestId,
                    conversation.ProviderId,
                    conversation.ProviderOfferId
                });
            });

        // Eski teklif bağlantısını koru.
        group.MapPost("/offers/{offerId:guid}/conversation",
            async (Guid offerId, ClaimsPrincipal principal,
                AppDbContext db) =>
            {
                if (!TryGetUserId(principal, out var userId))
                    return Results.Unauthorized();

                var offer = await db.ProviderOffers
                    .Include(x => x.NeedRequest)
                    .Include(x => x.Provider)
                    .FirstOrDefaultAsync(x => x.Id == offerId);

                if (offer is null ||
                    (offer.NeedRequest.OwnerUserId != userId &&
                     offer.Provider.OwnerUserId != userId))
                    return Results.NotFound();

                var conversation = await db.NeedConversations
                    .FirstOrDefaultAsync(x =>
                        x.NeedRequestId == offer.NeedRequestId &&
                        x.ProviderId == offer.ProviderId);

                if (conversation is null) {
                    if (!await CanStartConversationAsync(
                            db, offer.NeedRequest, offer.Provider))
                        return Results.NotFound();

                    conversation = new NeedConversation {
                        NeedRequestId = offer.NeedRequestId,
                        ProviderId = offer.ProviderId,
                        ProviderOfferId = offer.Id
                    };
                    db.NeedConversations.Add(conversation);

                    try {
                        await db.SaveChangesAsync();
                    }
                    catch (DbUpdateException) {
                        db.Entry(conversation).State = EntityState.Detached;
                        conversation = await db.NeedConversations
                            .FirstOrDefaultAsync(x =>
                                x.NeedRequestId == offer.NeedRequestId &&
                                x.ProviderId == offer.ProviderId);

                        if (conversation is null)
                            return Results.Conflict();
                    }
                }
                else if (conversation.ProviderOfferId is null) {
                    conversation.ProviderOfferId = offer.Id;
                    await db.SaveChangesAsync();
                }

                return Results.Ok(new {
                    conversation.Id,
                    conversation.NeedRequestId,
                    conversation.ProviderId,
                    conversation.ProviderOfferId
                });
            });

        // Kullanıcının talep konuşmalarını listele.
        group.MapGet("/conversations", async (
            ClaimsPrincipal principal, AppDbContext db) =>
        {
            if (!TryGetUserId(principal, out var userId))
                return Results.Unauthorized();

            var conversations = await db.NeedConversations
                .AsNoTracking()
                .Where(x =>
                    x.NeedRequest.OwnerUserId == userId ||
                    x.Provider.OwnerUserId == userId)
                .OrderByDescending(x => x.LastMessageAtUtc ?? x.CreatedAtUtc)
                .Select(x => new {
                    x.Id,
                    x.NeedRequestId,
                    needTitle = x.NeedRequest.Title,
                    x.ProviderId,
                    businessName = x.Provider.BusinessName,
                    customerUserId = x.NeedRequest.OwnerUserId,
                    customerName = x.NeedRequest.ShowFullName
                        ? x.NeedRequest.OwnerUser!.DisplayName
                        : "Müşteri",
                    x.ProviderOfferId,
                    x.CreatedAtUtc,
                    x.LastMessageAtUtc,
                    x.UpdatedAtUtc,
                    unreadCount = x.Messages.Count(m =>
                        m.SenderUserId != userId &&
                        m.ReadAtUtc == null &&
                        m.DeletedForRecipientAtUtc == null &&
                        m.DeletedForEveryoneAtUtc == null),
                    lastMessage = x.Messages
                        .Where(m =>
                            m.SenderUserId == userId
                                ? m.DeletedForSenderAtUtc == null
                                : m.DeletedForRecipientAtUtc == null)
                        .OrderByDescending(m => m.CreatedAtUtc)
                        .Select(m => new {
                            m.Id,
                            body = m.DeletedForEveryoneAtUtc != null
                                ? "Bu mesaj silindi"
                                : m.Body,
                            m.SenderUserId,
                            m.CreatedAtUtc,
                            m.ReadAtUtc
                        })
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Results.Ok(conversations);
        });

        // Konuşmayı ve mesaj geçmişini görüntüle.
        group.MapGet("/conversations/{conversationId:guid}",
            async (Guid conversationId, ClaimsPrincipal principal,
                AppDbContext db) =>
            {
                if (!TryGetUserId(principal, out var userId))
                    return Results.Unauthorized();

                var conversation = await GetAuthorizedConversationAsync(
                    db, conversationId, userId);

                if (conversation is null)
                    return Results.NotFound();

                var need = conversation.NeedRequest;
                var provider = conversation.Provider;

                var messages = await db.NeedMessages
                    .AsNoTracking()
                    .Where(x =>
                        x.NeedConversationId == conversationId &&
                        (x.SenderUserId == userId
                            ? x.DeletedForSenderAtUtc == null
                            : x.DeletedForRecipientAtUtc == null))
                    .OrderBy(x => x.CreatedAtUtc)
                    .Select(x => new {
                        x.Id,
                        conversationId = x.NeedConversationId,
                        x.SenderUserId,
                        senderName = x.SenderUserId == need.OwnerUserId
                            ? (need.ShowFullName
                                ? need.OwnerUser!.DisplayName
                                : MaskName(need.OwnerUser!.DisplayName))
                            : provider.BusinessName,
                        Body = x.DeletedForEveryoneAtUtc != null
                            ? "Bu mesaj silindi"
                            : x.Body,
                        isDeletedForEveryone = x.DeletedForEveryoneAtUtc != null,
                        x.CreatedAtUtc,
                        x.ReadAtUtc
                    })
                    .ToListAsync();

                return Results.Ok(new {
                    conversation = new {
                        conversation.Id,
                        conversation.ProviderOfferId,
                        needId = need.Id,
                        needTitle = need.Title,
                        businessName = provider.BusinessName,
                        providerId = provider.Id,
                        providerSlug = provider.Slug,
                        customerUserId = need.OwnerUserId,
                        customerName = need.ShowFullName
                            ? need.OwnerUser?.DisplayName ?? "Müşteri"
                            : MaskName(need.OwnerUser?.DisplayName)
                    },
                    messages
                });
            });

        // Talep tamamlanmış veya iptal edilmiş olsa da mesaj gönder.
        group.MapPost("/conversations/{conversationId:guid}",
            async (Guid conversationId, SendNeedMessageRequest request,
                ClaimsPrincipal principal, AppDbContext db) =>
            {
                if (!TryGetUserId(principal, out var userId))
                    return Results.Unauthorized();

                var conversation = await GetAuthorizedConversationAsync(
                    db, conversationId, userId);

                if (conversation is null)
                    return Results.NotFound();

                var body = request.Body?.Trim();

                if (string.IsNullOrWhiteSpace(body))
                    return Results.BadRequest(new {
                        message = "Mesaj boş olamaz."
                    });

                if (body.Length > 4000)
                    return Results.BadRequest(new {
                        message = "Mesaj en fazla 4000 karakter olabilir."
                    });

                var now = DateTime.UtcNow;

                var message = new NeedMessage {
                    NeedConversationId = conversation.Id,
                    SenderUserId = userId,
                    Body = body,
                    CreatedAtUtc = now
                };

                conversation.UpdatedAtUtc = now;
                conversation.LastMessageAtUtc = now;

                db.NeedMessages.Add(message);
                await db.SaveChangesAsync();

                return Results.Created(
                    $"/api/need-messages/conversations/{conversation.Id}",
                    new {
                        message.Id,
                        message.NeedConversationId,
                        message.SenderUserId,
                        message.Body,
                        message.CreatedAtUtc
                    });
            });

        // Karşı taraftan gelen okunmamış talep mesajlarını okundu yap.
        group.MapPost("/conversations/{conversationId:guid}/read",
            async (Guid conversationId, ClaimsPrincipal principal,
                AppDbContext db) =>
            {
                if (!TryGetUserId(principal, out var userId))
                    return Results.Unauthorized();

                var conversation = await GetAuthorizedConversationAsync(
                    db, conversationId, userId);

                if (conversation is null)
                    return Results.NotFound();

                var now = DateTime.UtcNow;

                var unreadMessages = await db.NeedMessages
                    .Where(x =>
                        x.NeedConversationId == conversationId &&
                        x.SenderUserId != userId &&
                        x.ReadAtUtc == null &&
                        x.DeletedForRecipientAtUtc == null &&
                        x.DeletedForEveryoneAtUtc == null)
                    .ToListAsync();

                foreach (var message in unreadMessages)
                    message.ReadAtUtc = now;

                if (unreadMessages.Count > 0)
                    await db.SaveChangesAsync();

                return Results.Ok(new {
                    readCount = unreadMessages.Count
                });
            });


        // Talep mesajını kendimden veya herkesten sil.
        group.MapPost(
            "/conversations/{conversationId:guid}/messages/{messageId:guid}/delete",
            async (
                Guid conversationId,
                Guid messageId,
                DeleteNeedMessageRequest request,
                ClaimsPrincipal principal,
                AppDbContext db) =>
            {
                if (!TryGetUserId(principal, out var userId))
                    return Results.Unauthorized();

                var conversation = await GetAuthorizedConversationAsync(
                    db, conversationId, userId);

                if (conversation is null)
                    return Results.NotFound();

                var message = await db.NeedMessages
                    .FirstOrDefaultAsync(x =>
                        x.Id == messageId &&
                        x.NeedConversationId == conversationId);

                if (message is null)
                    return Results.NotFound();

                if (message.DeletedForEveryoneAtUtc != null)
                    return Results.Conflict(new {
                        message = "Bu mesaj zaten herkesten silinmiş."
                    });

                var now = DateTime.UtcNow;

                if (request.Scope == "me")
                {
                    if (message.SenderUserId == userId)
                        message.DeletedForSenderAtUtc ??= now;
                    else
                        message.DeletedForRecipientAtUtc ??= now;
                }
                else if (request.Scope == "everyone")
                {
                    if (message.SenderUserId != userId)
                        return Results.Forbid();

                    message.DeletedForEveryoneAtUtc ??= now;
                    message.Body = string.Empty;
                }
                else
                {
                    return Results.BadRequest(new {
                        message = "Geçersiz silme seçeneği."
                    });
                }

                await db.SaveChangesAsync();

                return Results.Ok(new {
                    success = true,
                    scope = request.Scope
                });
            });

        return app;
    }

    private static async Task<bool> CanStartConversationAsync(
        AppDbContext db, NeedRequest need, Provider provider)
    {
        if (need.OwnerUserId is null ||
            provider.OwnerUserId is null)
            return false;

        if (need.Status == NeedStatus.Completed)
        {
            return await db.ProviderOffers.AnyAsync(x =>
                x.NeedRequestId == need.Id &&
                x.ProviderId == provider.Id &&
                x.Status == OfferStatus.Accepted);
        }

        if (!need.IsActive ||
            need.Status == NeedStatus.Cancelled)
            return false;

        if (need.TargetProviderId is Guid targetId)
            return targetId == provider.Id;

        if (provider.PublicationStatus != PublicationStatus.Published ||
            !provider.IsActive ||
            need.CategoryLibraryWorkId is null ||
            need.CitySlug != provider.CitySlug ||
            need.DistrictSlug != provider.DistrictSlug)
            return false;

        return await db.ProviderCategoryLibraryWorks.AnyAsync(x =>
            x.ProviderId == provider.Id &&
            x.CategoryLibraryWorkId == need.CategoryLibraryWorkId);
    }

    private static Task<NeedConversation?> GetAuthorizedConversationAsync(
        AppDbContext db, Guid conversationId, Guid userId)
    {
        return db.NeedConversations
            .Include(x => x.NeedRequest)
                .ThenInclude(x => x.OwnerUser)
            .Include(x => x.Provider)
            .FirstOrDefaultAsync(x =>
                x.Id == conversationId &&
                (x.NeedRequest.OwnerUserId == userId ||
                 x.Provider.OwnerUserId == userId));
    }

    private static string MaskName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return "Müşteri";

        return string.Join(" ",
            name.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(part => $"{part[0]}."));
    }

    private static bool TryGetUserId(
        ClaimsPrincipal principal, out Guid userId)
    {
        var value =
            principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
            principal.FindFirstValue("sub");

        return Guid.TryParse(value, out userId);
    }

    public sealed record DeleteNeedMessageRequest(string Scope);

    public sealed record SendNeedMessageRequest(string Body);
}
