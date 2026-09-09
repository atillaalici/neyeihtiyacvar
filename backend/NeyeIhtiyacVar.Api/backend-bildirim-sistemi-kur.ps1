$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"

function Write-Utf8NoBom([string]$path, [string]$content) {
    $dir = [System.IO.Path]::GetDirectoryName($path)
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    [System.IO.File]::WriteAllText(
        $path,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

function Replace-Once([string]$content, [string]$old, [string]$new, [string]$errorMessage) {
    if (-not $content.Contains($old)) {
        throw $errorMessage
    }

    return $content.Replace($old, $new)
}

$notification = @'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public string EventType { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string? Link { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ReadAtUtc { get; set; }
}
'@

$notificationWriter = @'
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Infrastructure.Notifications;

public static class NotificationWriter
{
    public static void Add(
        AppDbContext dbContext,
        Guid userId,
        string eventType,
        string title,
        string message,
        string? link = null)
    {
        dbContext.Notifications.Add(new Notification
        {
            UserId = userId,
            EventType = eventType,
            Title = title,
            Message = message,
            Link = link,
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow
        });
    }
}
'@

$notificationEndpoints = @'
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class NotificationEndpoints
{
    public static IEndpointRouteBuilder MapNotificationEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/notifications")
            .RequireAuthorization();

        group.MapGet("/", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            int? take) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var safeTake = Math.Clamp(take ?? 30, 1, 100);

            var items = await dbContext.Notifications
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Take(safeTake)
                .Select(x => new
                {
                    x.Id,
                    x.EventType,
                    x.Title,
                    x.Message,
                    x.Link,
                    x.IsRead,
                    x.CreatedAtUtc,
                    x.ReadAtUtc
                })
                .ToListAsync();

            var unreadCount = await dbContext.Notifications
                .AsNoTracking()
                .CountAsync(x =>
                    x.UserId == userId &&
                    !x.IsRead);

            return Results.Ok(new
            {
                unreadCount,
                items
            });
        });

        group.MapGet("/unread-count", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var count = await dbContext.Notifications
                .AsNoTracking()
                .CountAsync(x =>
                    x.UserId == userId &&
                    !x.IsRead);

            return Results.Ok(new
            {
                unreadCount = count
            });
        });

        group.MapPost("/{id:guid}/read", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var notification = await dbContext.Notifications
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.UserId == userId);

            if (notification is null)
            {
                return Results.NotFound(new
                {
                    message = "Bildirim bulunamadı."
                });
            }

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAtUtc = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                notification.Id,
                notification.IsRead,
                notification.ReadAtUtc
            });
        });

        group.MapPost("/read-all", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var now = DateTime.UtcNow;

            var updated = await dbContext.Notifications
                .Where(x =>
                    x.UserId == userId &&
                    !x.IsRead)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.IsRead, true)
                    .SetProperty(x => x.ReadAtUtc, now));

            return Results.Ok(new
            {
                updated
            });
        });

        return app;
    }

    private static bool TryGetUserId(
        ClaimsPrincipal principal,
        out Guid userId)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out userId);
    }
}
'@

Write-Utf8NoBom "$root\Domain\Notification.cs" $notification
Write-Utf8NoBom "$root\Infrastructure\Notifications\NotificationWriter.cs" $notificationWriter
Write-Utf8NoBom "$root\Endpoints\NotificationEndpoints.cs" $notificationEndpoints

# AppDbContext
$dbPath = Join-Path $root "Infrastructure\AppDbContext.cs"
$db = Get-Content -Raw -Encoding UTF8 $dbPath

if ($db -notmatch 'DbSet<Notification>') {
    $anchor = '    public DbSet<ProviderReview> ProviderReviews => Set<ProviderReview>();'
    if (-not $db.Contains($anchor)) {
        throw "AppDbContext.cs icinde ProviderReviews DbSet bulunamadi."
    }

    $db = $db.Replace(
        $anchor,
        $anchor + "`r`n`r`n" +
        '    public DbSet<Notification> Notifications => Set<Notification>();'
    )
}

if ($db -notmatch 'modelBuilder\.Entity<Notification>') {
    $config = @'

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasIndex(x => new
            {
                x.UserId,
                x.IsRead,
                x.CreatedAtUtc
            });

            entity.Property(x => x.EventType)
                .HasMaxLength(80)
                .IsRequired();

            entity.Property(x => x.Title)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.Message)
                .HasMaxLength(1000)
                .IsRequired();

            entity.Property(x => x.Link)
                .HasMaxLength(500);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
'@

    $last = $db.LastIndexOf("    }")
    if ($last -lt 0) {
        throw "AppDbContext.cs OnModelCreating kapanisi bulunamadi."
    }

    $db = $db.Insert($last, $config + "`r`n")
}

Write-Utf8NoBom $dbPath $db

# Program.cs
$programPath = Join-Path $root "Program.cs"
$program = Get-Content -Raw -Encoding UTF8 $programPath

if ($program -notmatch 'MapNotificationEndpoints\(\)') {
    $anchor = 'app.MapReviewEndpoints();'

    if (-not $program.Contains($anchor)) {
        throw "Program.cs icinde MapReviewEndpoints bulunamadi."
    }

    $program = $program.Replace(
        $anchor,
        $anchor + "`r`n" +
        'app.MapNotificationEndpoints();'
    )
}

Write-Utf8NoBom $programPath $program

# OfferEndpoints.cs
$offerPath = Join-Path $root "Endpoints\OfferEndpoints.cs"
$offer = Get-Content -Raw -Encoding UTF8 $offerPath

if ($offer -notmatch 'Infrastructure\.Notifications') {
    $offer = $offer.Replace(
        'using NeyeIhtiyacVar.Api.Infrastructure;',
        'using NeyeIhtiyacVar.Api.Infrastructure;' + "`r`n" +
        'using NeyeIhtiyacVar.Api.Infrastructure.Notifications;'
    )
}

# Yeni teklif -> kullanıcı
if ($offer -notmatch 'new_offer_received') {
    $old = @'
            dbContext.ProviderOffers.Add(offer);
            await dbContext.SaveChangesAsync();
'@

    $new = @'
            dbContext.ProviderOffers.Add(offer);

            if (need.OwnerUserId is Guid needOwnerUserId)
            {
                NotificationWriter.Add(
                    dbContext,
                    needOwnerUserId,
                    "new_offer_received",
                    "Yeni teklif aldınız",
                    $"{provider.BusinessName} \"{need.Title}\" talebinize teklif verdi.",
                    "/taleplerim");
            }

            await dbContext.SaveChangesAsync();
'@

    $offer = Replace-Once $offer $old $new "OfferEndpoints: yeni teklif bildirim hedefi bulunamadi."
}

# Geri çekme -> kullanıcı
if ($offer -notmatch 'offer_withdrawn') {
    $old = @'
            offer.NeedRequest.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();
'@

    $new = @'
            offer.NeedRequest.UpdatedAtUtc = now;

            if (offer.NeedRequest.OwnerUserId is Guid needOwnerUserId)
            {
                NotificationWriter.Add(
                    dbContext,
                    needOwnerUserId,
                    "offer_withdrawn",
                    "Bir teklif geri çekildi",
                    $"{provider.BusinessName} \"{offer.NeedRequest.Title}\" talebindeki teklifini geri çekti.",
                    "/taleplerim");
            }

            await dbContext.SaveChangesAsync();
'@

    $offer = Replace-Once $offer $old $new "OfferEndpoints: teklif geri cekme bildirim hedefi bulunamadi."
}

# Kabul -> işletme
if ($offer -notmatch 'offer_accepted') {
    $old = @'
            need.Status = NeedStatus.Completed;
            need.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();
'@

    $new = @'
            need.Status = NeedStatus.Completed;
            need.UpdatedAtUtc = now;

            var acceptedProviderOwnerUserId = await dbContext.Providers
                .AsNoTracking()
                .Where(x => x.Id == selectedOffer.ProviderId)
                .Select(x => x.OwnerUserId)
                .FirstOrDefaultAsync();

            if (acceptedProviderOwnerUserId is Guid providerOwnerUserId)
            {
                NotificationWriter.Add(
                    dbContext,
                    providerOwnerUserId,
                    "offer_accepted",
                    "Teklifiniz kabul edildi",
                    $"\"{need.Title}\" talebine verdiğiniz teklif müşteri tarafından kabul edildi.",
                    "/panel");
            }

            await dbContext.SaveChangesAsync();
'@

    $offer = Replace-Once $offer $old $new "OfferEndpoints: teklif kabul bildirim hedefi bulunamadi."
}

# Ret -> işletme
if ($offer -notmatch 'offer_rejected') {
    $old = @'
            need.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                offerId = offer.Id,
                status = "rejected",
'@

    $new = @'
            need.UpdatedAtUtc = now;

            var rejectedProviderOwnerUserId = await dbContext.Providers
                .AsNoTracking()
                .Where(x => x.Id == offer.ProviderId)
                .Select(x => x.OwnerUserId)
                .FirstOrDefaultAsync();

            if (rejectedProviderOwnerUserId is Guid providerOwnerUserId)
            {
                NotificationWriter.Add(
                    dbContext,
                    providerOwnerUserId,
                    "offer_rejected",
                    "Teklifiniz reddedildi",
                    $"\"{need.Title}\" talebine verdiğiniz teklif müşteri tarafından reddedildi.",
                    "/panel");
            }

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                offerId = offer.Id,
                status = "rejected",
'@

    $offer = Replace-Once $offer $old $new "OfferEndpoints: teklif ret bildirim hedefi bulunamadi."
}

# Talep iptali -> teklif veren işletmeler
if ($offer -notmatch 'need_cancelled') {
    $old = @'
            var pendingOffers = await dbContext.ProviderOffers
                .Where(x =>
                    x.NeedRequestId == need.Id &&
                    x.Status == OfferStatus.Pending)
                .ToListAsync();

            var now = DateTime.UtcNow;
'@

    $new = @'
            var pendingOffers = await dbContext.ProviderOffers
                .Where(x =>
                    x.NeedRequestId == need.Id &&
                    x.Status == OfferStatus.Pending)
                .ToListAsync();

            var providerIds = pendingOffers
                .Select(x => x.ProviderId)
                .Distinct()
                .ToArray();

            var providerOwnerUserIds = await dbContext.Providers
                .AsNoTracking()
                .Where(x =>
                    providerIds.Contains(x.Id) &&
                    x.OwnerUserId != null)
                .Select(x => x.OwnerUserId!.Value)
                .Distinct()
                .ToListAsync();

            var now = DateTime.UtcNow;
'@

    $offer = Replace-Once $offer $old $new "OfferEndpoints: talep iptali provider listesi hedefi bulunamadi."

    $old2 = @'
            need.Status = NeedStatus.Cancelled;
            need.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();
'@

    $new2 = @'
            need.Status = NeedStatus.Cancelled;
            need.UpdatedAtUtc = now;

            foreach (var providerOwnerUserId in providerOwnerUserIds)
            {
                NotificationWriter.Add(
                    dbContext,
                    providerOwnerUserId,
                    "need_cancelled",
                    "Talep iptal edildi",
                    $"Teklif verdiğiniz \"{need.Title}\" talebi kullanıcı tarafından iptal edildi.",
                    "/panel");
            }

            await dbContext.SaveChangesAsync();
'@

    $offer = Replace-Once $offer $old2 $new2 "OfferEndpoints: talep iptali bildirim hedefi bulunamadi."
}

Write-Utf8NoBom $offerPath $offer

# ReviewEndpoints.cs
$reviewPath = Join-Path $root "Endpoints\ReviewEndpoints.cs"
$review = Get-Content -Raw -Encoding UTF8 $reviewPath

if ($review -notmatch 'Infrastructure\.Notifications') {
    $review = $review.Replace(
        'using NeyeIhtiyacVar.Api.Infrastructure;',
        'using NeyeIhtiyacVar.Api.Infrastructure;' + "`r`n" +
        'using NeyeIhtiyacVar.Api.Infrastructure.Notifications;'
    )
}

if ($review -notmatch 'new_review_received') {
    $old = @'
            dbContext.ProviderReviews.Add(review);
            await dbContext.SaveChangesAsync();
'@

    $new = @'
            dbContext.ProviderReviews.Add(review);

            var providerOwnerUserId = await dbContext.Providers
                .AsNoTracking()
                .Where(x => x.Id == acceptedOffer.ProviderId)
                .Select(x => x.OwnerUserId)
                .FirstOrDefaultAsync();

            if (providerOwnerUserId is Guid ownerUserId)
            {
                NotificationWriter.Add(
                    dbContext,
                    ownerUserId,
                    "new_review_received",
                    "Yeni müşteri değerlendirmesi",
                    $"\"{need.Title}\" işi için {request.Rating}/5 puanlı yeni bir değerlendirme aldınız.",
                    "/panel");
            }

            await dbContext.SaveChangesAsync();
'@

    $review = Replace-Once $review $old $new "ReviewEndpoints: yeni yorum bildirim hedefi bulunamadi."
}

Write-Utf8NoBom $reviewPath $review

Write-Host ""
Write-Host "Site ici bildirim backend altyapisi hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Bildirim olaylari:" -ForegroundColor Cyan
Write-Host "  Yeni teklif -> kullanici"
Write-Host "  Teklif geri cekildi -> kullanici"
Write-Host "  Teklif kabul edildi -> isletme"
Write-Host "  Teklif reddedildi -> isletme"
Write-Host "  Talep iptal edildi -> teklif veren isletmeler"
Write-Host "  Yeni degerlendirme -> isletme"
Write-Host ""
Write-Host "Endpointler:" -ForegroundColor Cyan
Write-Host "  GET  /api/notifications"
Write-Host "  GET  /api/notifications/unread-count"
Write-Host "  POST /api/notifications/{id}/read"
Write-Host "  POST /api/notifications/read-all"
Write-Host ""
Write-Host "Mimari SMS / WhatsApp kanallarinin daha sonra eklenmesine uygun tutuldu." -ForegroundColor DarkYellow
Write-Host ""
Write-Host "Simdi: dotnet build" -ForegroundColor Yellow
