using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class MessagingEndpoints
{
    public static IEndpointRouteBuilder MapMessagingEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/messages")
            .RequireAuthorization();

        // Bir işletmeyle konuşma başlatır veya mevcut konuşmayı döndürür.
        group.MapPost("/conversations", async (
            StartConversationRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
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
                    x.Slug,
                    x.BusinessName,
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
                    message = "Kendi işletmenizle mesajlaşma başlatamazsınız."
                });
            }

            var conversation = await dbContext.Conversations
                .FirstOrDefaultAsync(x =>
                    x.UserId == userId &&
                    x.ProviderId == provider.Id);

            if (conversation is null)
            {
                var now = DateTime.UtcNow;

                conversation = new Conversation
                {
                    UserId = userId,
                    ProviderId = provider.Id,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                };

                dbContext.Conversations.Add(conversation);

                try
                {
                    await dbContext.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    // Aynı anda iki istek gelirse unique index nedeniyle
                    // ikinci kayıt başarısız olabilir. Mevcut konuşmayı al.
                    dbContext.Entry(conversation).State = EntityState.Detached;

                    conversation = await dbContext.Conversations
                        .FirstAsync(x =>
                            x.UserId == userId &&
                            x.ProviderId == provider.Id);
                }
            }

            return Results.Ok(new
            {
                conversation.Id,
                providerId = provider.Id,
                providerSlug = provider.Slug,
                businessName = provider.BusinessName,
                conversation.CreatedAtUtc,
                conversation.LastMessageAtUtc
            });
        });

        // Giriş yapan kullanıcının erişebildiği konuşmaları listeler.
        // Normal kullanıcı: kendi başlattıkları.
        // İşletme sahibi: kendi işletmesine gelenler.
        group.MapGet("/conversations", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var ownedProviderId = await dbContext.Providers
                .AsNoTracking()
                .Where(x => x.OwnerUserId == userId)
                .Select(x => (Guid?)x.Id)
                .FirstOrDefaultAsync();

            var conversations = await dbContext.Conversations
                .AsNoTracking()
                .Where(x =>
                    x.UserId == userId ||
                    (ownedProviderId.HasValue &&
                     x.ProviderId == ownedProviderId.Value))
                .OrderByDescending(x =>
                    x.LastMessageAtUtc ?? x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.ProviderId,
                    providerSlug = x.Provider.Slug,
                    businessName = x.Provider.BusinessName,
                    customerUserId = x.UserId,
                    customerName = x.User.DisplayName,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    x.LastMessageAtUtc,

                    lastMessage = x.Messages
                        .OrderByDescending(m => m.CreatedAtUtc)
                        .Select(m => new
                        {
                            m.Id,
                            m.Body,
                            m.SenderUserId,
                            m.CreatedAtUtc,
                            m.ReadAtUtc
                        })
                        .FirstOrDefault(),

                    unreadCount = x.Messages.Count(m =>
                        m.SenderUserId != userId &&
                        m.ReadAtUtc == null)
                })
                .ToListAsync();

            return Results.Ok(conversations);
        });

        // Tek konuşmanın mesajlarını getirir.
        group.MapGet("/conversations/{conversationId:guid}", async (
            Guid conversationId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var access = await GetConversationAccessAsync(
                conversationId,
                userId,
                dbContext);

            if (access is null)
            {
                return Results.NotFound(new
                {
                    message = "Konuşma bulunamadı."
                });
            }

            var messages = await dbContext.Messages
                .AsNoTracking()
                .Where(x => x.ConversationId == conversationId)
                .OrderBy(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.ConversationId,
                    x.SenderUserId,
                    senderName = x.SenderUser.DisplayName,
                    x.Body,
                    x.CreatedAtUtc,
                    x.ReadAtUtc
                })
                .ToListAsync();

            return Results.Ok(new
            {
                conversation = new
                {
                    access.Id,
                    access.ProviderId,
                    providerSlug = access.Provider.Slug,
                    businessName = access.Provider.BusinessName,
                    customerUserId = access.UserId,
                    customerName = access.User.DisplayName,
                    access.Provider.PublicPhone,
                    access.Provider.PublicWhatsapp,
                    email = access.Provider.OwnerUser != null
                        ? access.Provider.OwnerUser.Email
                        : null
                },
                messages
            });
        });

        // Konuşmaya mesaj gönderir.
        group.MapPost("/conversations/{conversationId:guid}", async (
            Guid conversationId,
            SendMessageRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var body = request.Body?.Trim();

            if (string.IsNullOrWhiteSpace(body))
            {
                return Results.BadRequest(new
                {
                    message = "Mesaj boş olamaz."
                });
            }

            if (body.Length > 4000)
            {
                return Results.BadRequest(new
                {
                    message = "Mesaj en fazla 4000 karakter olabilir."
                });
            }

            var conversation = await GetConversationAccessAsync(
                conversationId,
                userId,
                dbContext);

            if (conversation is null)
            {
                return Results.NotFound(new
                {
                    message = "Konuşma bulunamadı."
                });
            }

            var now = DateTime.UtcNow;

            var message = new Message
            {
                ConversationId = conversation.Id,
                SenderUserId = userId,
                Body = body,
                CreatedAtUtc = now
            };

            conversation.LastMessageAtUtc = now;
            conversation.UpdatedAtUtc = now;

            dbContext.Messages.Add(message);
            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/messages/conversations/{conversation.Id}",
                new
                {
                    message.Id,
                    message.ConversationId,
                    message.SenderUserId,
                    message.Body,
                    message.CreatedAtUtc,
                    message.ReadAtUtc
                });
        });

        // Karşı taraftan gelen okunmamış mesajları okundu yapar.
        group.MapPost("/conversations/{conversationId:guid}/read", async (
            Guid conversationId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var conversation = await GetConversationAccessAsync(
                conversationId,
                userId,
                dbContext);

            if (conversation is null)
            {
                return Results.NotFound(new
                {
                    message = "Konuşma bulunamadı."
                });
            }

            var now = DateTime.UtcNow;

            var unreadMessages = await dbContext.Messages
                .Where(x =>
                    x.ConversationId == conversationId &&
                    x.SenderUserId != userId &&
                    x.ReadAtUtc == null)
                .ToListAsync();

            foreach (var message in unreadMessages)
            {
                message.ReadAtUtc = now;
            }

            if (unreadMessages.Count > 0)
            {
                await dbContext.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                readCount = unreadMessages.Count
            });
        });

        // Navbar rozeti için toplam okunmamış mesaj sayısı.
        group.MapGet("/unread-count", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var ownedProviderId = await dbContext.Providers
                .AsNoTracking()
                .Where(x => x.OwnerUserId == userId)
                .Select(x => (Guid?)x.Id)
                .FirstOrDefaultAsync();

            var count = await dbContext.Messages
                .AsNoTracking()
                .Where(m =>
                    m.SenderUserId != userId &&
                    m.ReadAtUtc == null &&
                    (
                        m.Conversation.UserId == userId ||
                        (ownedProviderId.HasValue &&
                         m.Conversation.ProviderId == ownedProviderId.Value)
                    ))
                .CountAsync();

            return Results.Ok(new
            {
                unreadCount = count
            });
        });

        return app;
    }

    private static async Task<Conversation?> GetConversationAccessAsync(
        Guid conversationId,
        Guid userId,
        AppDbContext dbContext)
    {
        return await dbContext.Conversations
            .Include(x => x.User)
            .Include(x => x.Provider)
                .ThenInclude(x => x.OwnerUser)
            .FirstOrDefaultAsync(x =>
                x.Id == conversationId &&
                (
                    x.UserId == userId ||
                    x.Provider.OwnerUserId == userId
                ));
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

    public sealed record StartConversationRequest(
        string ProviderSlug);

    public sealed record SendMessageRequest(
        string Body);
}
