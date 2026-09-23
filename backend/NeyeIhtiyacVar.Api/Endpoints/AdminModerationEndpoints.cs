using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

using NeyeIhtiyacVar.Api.Infrastructure.Email;
namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminModerationEndpoints
{
    public sealed record ActionRequest(string? Note);

    public static IEndpointRouteBuilder MapAdminModerationEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/admin/moderation")
            .RequireAuthorization(p => p.RequireRole(UserRole.Admin.ToString()));

        g.MapGet("/", async (AppDbContext db) =>
            Results.Ok(await db.Providers
                .AsNoTracking()
                .Where(x => x.ModerationViolationCount > 0 || x.ModerationTerminated)
                .OrderByDescending(x => x.ModerationTerminated)
                .ThenByDescending(x => x.ModerationViolationCount)
                .ThenByDescending(x => x.LastModerationViolationAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.BusinessName,
                    x.ModerationViolationCount,
                    x.ModerationTerminated,
                    x.LastModerationViolationAtUtc,
                    x.LastModerationViolationReason,
                    publicationStatus = x.PublicationStatus.ToString().ToLowerInvariant(),
                    x.IsActive
                })
                .ToListAsync()));

        g.MapPost("/{id:guid}/decrement", async (
            Guid id,
            ActionRequest r,
            ClaimsPrincipal user,
            AppDbContext db,
            IEmailSender emailSender) =>
        {
            var x = await db.Providers.FirstOrDefaultAsync(x => x.Id == id);
            if (x is null)
                return Results.NotFound(new { message = "İşletme bulunamadı." });

            var before = x.ModerationViolationCount;

            if (x.ModerationViolationCount > 0)
                x.ModerationViolationCount--;

            if (x.ModerationViolationCount < 3)
                x.ModerationTerminated = false;

            x.UpdatedAtUtc = DateTime.UtcNow;
            x.Version++;

            AdminAuditLogEndpoints.AddAdminAudit(
                db,
                user,
                "ModerationViolationDecremented",
                "Provider",
                x.Id.ToString(),
                x.BusinessName,
                $"İhlal {before}/3 -> {x.ModerationViolationCount}/3. Not: {Note(r.Note)}");

            await SyncApplicationModerationAsync(db, x, $"Otomatik moderasyon ihlali yönetici tarafından geri alındı. Güncel ihlal: {x.ModerationViolationCount}/3.");

            AddProviderNotification(
                db,
                x,
                "Moderasyon ihlaliniz geri alındı",
                $"İşletmeniz için oluşturulan moderasyon ihlallerinden biri yönetici incelemesi sonucunda geri alındı. Güncel ihlal sayınız: {x.ModerationViolationCount}/3.");

            await SendOwnerModerationEmailAsync(
                db, emailSender, x,
                "Moderasyon ihlaliniz geri alındı",
                $"İşletmeniz için oluşturulan moderasyon ihlallerinden biri yönetici incelemesi sonucunda geri alındı. Güncel ihlal sayınız: {x.ModerationViolationCount}/3.");

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Bir ihlal geri alındı ve işletmeye bilgi verildi."
            });
        });

        g.MapPost("/{id:guid}/reset", async (
            Guid id,
            ActionRequest r,
            ClaimsPrincipal user,
            AppDbContext db,
            IEmailSender emailSender) =>
        {
            var x = await db.Providers.FirstOrDefaultAsync(x => x.Id == id);
            if (x is null)
                return Results.NotFound(new { message = "İşletme bulunamadı." });

            var before = x.ModerationViolationCount;

            x.ModerationViolationCount = 0;
            x.ModerationTerminated = false;
            x.LastModerationViolationAtUtc = null;
            x.LastModerationViolationReason = null;
            x.UpdatedAtUtc = DateTime.UtcNow;
            x.Version++;

            AdminAuditLogEndpoints.AddAdminAudit(
                db,
                user,
                "ModerationViolationsReset",
                "Provider",
                x.Id.ToString(),
                x.BusinessName,
                $"İhlal sayacı {before}/3 -> 0/3. Not: {Note(r.Note)}");

            await SyncApplicationModerationAsync(db, x, "Otomatik moderasyon ihlal sayacı yönetici tarafından sıfırlandı. Güncel ihlal: 0/3.");

            AddProviderNotification(
                db,
                x,
                "Moderasyon ihlal sayacınız sıfırlandı",
                "İşletmenizin moderasyon ihlal sayacı yönetici incelemesi sonucunda 0/3 olarak güncellendi.");

            await SendOwnerModerationEmailAsync(
                db, emailSender, x,
                "Moderasyon ihlal sayacınız sıfırlandı",
                "İşletmenizin moderasyon ihlal sayacı yönetici incelemesi sonucunda sıfırlandı. Güncel ihlal sayınız: 0/3.");

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "İhlal sayacı sıfırlandı ve işletmeye bilgi verildi."
            });
        });

        g.MapPost("/{id:guid}/republish", async (
            Guid id,
            ActionRequest r,
            ClaimsPrincipal user,
            AppDbContext db,
            IEmailSender emailSender) =>
        {
            var x = await db.Providers.FirstOrDefaultAsync(x => x.Id == id);
            if (x is null)
                return Results.NotFound(new { message = "İşletme bulunamadı." });

            x.ModerationTerminated = false;
            x.IsActive = true;
            x.PublicationStatus = PublicationStatus.Published;
            x.PublishedAtUtc = DateTime.UtcNow;
            x.PublishedBy =
                user.FindFirstValue(ClaimTypes.Email)
                ?? user.Identity?.Name
                ?? "admin";
            x.UpdatedAtUtc = DateTime.UtcNow;
            x.Version++;

            AdminAuditLogEndpoints.AddAdminAudit(
                db,
                user,
                "ModerationProviderRepublished",
                "Provider",
                x.Id.ToString(),
                x.BusinessName,
                $"Tekrar yayına alındı. İhlal sayacı korundu: {x.ModerationViolationCount}/3. Not: {Note(r.Note)}");

            await SyncApplicationModerationAsync(db, x, $"İşletme yönetici tarafından yeniden yayına alındı. Güncel ihlal: {x.ModerationViolationCount}/3.");

            AddProviderNotification(
                db,
                x,
                "İşletmeniz yeniden yayına alındı",
                $"İşletmeniz yönetici incelemesi sonucunda yeniden yayına alındı. Güncel moderasyon ihlal sayınız: {x.ModerationViolationCount}/3.");

            await SendOwnerModerationEmailAsync(
                db, emailSender, x,
                "İşletmeniz yeniden yayına alındı",
                $"İşletmeniz yönetici incelemesi sonucunda yeniden yayına alındı. Güncel ihlal sayınız: {x.ModerationViolationCount}/3.");

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "İşletme tekrar yayına alındı; ihlal sayacı korundu ve işletmeye bilgi verildi."
            });
        });

        g.MapPost("/{id:guid}/keep-suspended", async (
            Guid id,
            ActionRequest r,
            ClaimsPrincipal user,
            AppDbContext db,
            IEmailSender emailSender) =>
        {
            var x = await db.Providers.FirstOrDefaultAsync(x => x.Id == id);
            if (x is null)
                return Results.NotFound(new { message = "İşletme bulunamadı." });

            x.PublicationStatus = PublicationStatus.Unpublished;
            x.PublishedAtUtc = null;
            x.UpdatedAtUtc = DateTime.UtcNow;
            x.Version++;

            AdminAuditLogEndpoints.AddAdminAudit(
                db,
                user,
                "ModerationSuspensionConfirmed",
                "Provider",
                x.Id.ToString(),
                x.BusinessName,
                $"Pasif durum korundu. İhlal: {x.ModerationViolationCount}/3. Not: {Note(r.Note)}");

            AddProviderNotification(
                db,
                x,
                "İşletmenizin pasif durumu devam ediyor",
                $"Yönetici incelemesi sonucunda işletmenizin pasif durumda kalmasına karar verildi. Güncel moderasyon ihlal sayınız: {x.ModerationViolationCount}/3.");

            await SendOwnerModerationEmailAsync(
                db, emailSender, x,
                "İşletmenizin pasif durumu devam ediyor",
                $"Yönetici incelemesi sonucunda işletmenizin pasif durumu devam ettirildi. Güncel ihlal sayınız: {x.ModerationViolationCount}/3.");

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "İşletme pasifte bırakıldı ve işletmeye bilgi verildi."
            });
        });

        return app;
    }



    private static async Task SendOwnerModerationEmailAsync(
        AppDbContext db, IEmailSender emailSender, Provider provider, string subject, string message)
    {
        if (provider.OwnerUserId is not Guid ownerUserId) return;
        var owner = await db.Users.AsNoTracking()
            .Where(x => x.Id == ownerUserId && x.IsActive)
            .Select(x => new { x.Email, x.DisplayName }).FirstOrDefaultAsync();
        if (owner is null || string.IsNullOrWhiteSpace(owner.Email)) return;
        try
        {
            var result = await emailSender.SendModerationNoticeAsync(
                owner.Email, owner.DisplayName, subject, message,
                provider.ModerationViolationCount, provider.ModerationTerminated, CancellationToken.None);
            if (!result.Success) Console.Error.WriteLine($"[MODERATION EMAIL] {provider.Id} gönderilemedi: {result.ErrorMessage}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MODERATION EMAIL] {provider.Id} hata: {ex.Message}");
        }
    }

    private static async Task SyncApplicationModerationAsync(AppDbContext db, Provider provider, string actionText)
    {
        if (provider.SourceApplicationId is not Guid applicationId) return;
        var application = await db.ProviderApplications.FirstOrDefaultAsync(x => x.Id == applicationId);
        if (application is null) return;
        var oldNote = application.ReviewNote;
        if (!string.IsNullOrWhiteSpace(oldNote) && oldNote.Contains("[OTOMATİK MODERASYON]", StringComparison.OrdinalIgnoreCase))
        {
            application.ReviewNote = $"[MODERASYON İNCELEMESİ] {actionText}";
            application.ReviewedAtUtc = DateTime.UtcNow;
            application.UpdatedAtUtc = DateTime.UtcNow;
            application.Version++;
        }
    }

    private static void AddProviderNotification(
        AppDbContext db,
        Provider provider,
        string title,
        string message)
    {
        if (provider.OwnerUserId is not Guid ownerUserId)
            return;

        db.Notifications.Add(new Notification
        {
            UserId = ownerUserId,
            Title = title,
            Message = message,
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow
        });
    }

    private static string Note(string? v)
    {
        var s = string.IsNullOrWhiteSpace(v)
            ? "Belirtilmedi"
            : v.Trim();

        return s.Length <= 500 ? s : s[..500];
    }
}
