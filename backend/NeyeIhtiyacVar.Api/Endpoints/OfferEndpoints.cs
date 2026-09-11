using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Notifications;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class OfferEndpoints
{
    public static IEndpointRouteBuilder MapOfferEndpoints(
        this IEndpointRouteBuilder app)
    {
        var providerGroup = app
            .MapGroup("/api/provider-panel")
            .RequireAuthorization();

        providerGroup.MapPost("/needs/{needId:guid}/offers", async (
            Guid needId,
            CreateProviderOfferRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba bağlı işletme bulunamadı."
                });
            }

            if (provider.PublicationStatus != PublicationStatus.Published)
            {
                return Results.BadRequest(new
                {
                    message = "Yalnızca yayındaki işletmeler teklif verebilir."
                });
            }

            var need = await dbContext.NeedRequests
                .FirstOrDefaultAsync(x => x.Id == needId);

            if (need is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (need.Status == NeedStatus.Completed)
            {
                return Results.Conflict(new
                {
                    message = "Bu ihtiyaç talebi sonuçlandı. Yeni teklif verilemez."
                });
            }

            if (need.Status == NeedStatus.Cancelled)
            {
                return Results.Conflict(new
                {
                    message = "Bu ihtiyaç talebi iptal edildi. Yeni teklif verilemez."
                });
            }

            if (need.TargetProviderId != provider.Id)
            {
                return Results.BadRequest(new
                {
                    message = "Bu talep henüz işletmenize iletilmedi. Kullanıcı işletmenizi seçtikten sonra teklif verebilirsiniz."
                });
            }
            var exactMatch =
                need.CitySlug == provider.CitySlug &&
                need.DistrictSlug == provider.DistrictSlug &&
                (
                    (need.CategorySlug == provider.CategorySlug &&
                     need.ServiceSlug == provider.ServiceSlug) ||
                    provider.AdditionalServices.Contains(need.ServiceSlug)
                );

            if (!exactMatch)
            {
                return Results.BadRequest(new
                {
                    message = "Bu ihtiyaç talebi işletmenizle birebir eşleşmiyor."
                });
            }

            if (need.OwnerUserId is null)
            {
                return Results.BadRequest(new
                {
                    message = "Bu eski veya anonim talebe teklif verilemez."
                });
            }

            var exists = await dbContext.ProviderOffers
                .AnyAsync(x =>
                    x.NeedRequestId == needId &&
                    x.ProviderId == provider.Id);

            if (exists)
            {
                return Results.Conflict(new
                {
                    message = "Bu ihtiyaç talebine daha önce teklif verdiniz."
                });
            }

            var message = request.Message?.Trim() ?? string.Empty;

            if (message.Length < 5 || message.Length > 2000)
            {
                return Results.BadRequest(new
                {
                    message = "Teklif mesajı 5 ile 2000 karakter arasında olmalıdır."
                });
            }

            if (request.Price is < 0 or > 100000000)
            {
                return Results.BadRequest(new
                {
                    message = "Teklif tutarı geçerli değil."
                });
            }

            var now = DateTime.UtcNow;

            var offer = new ProviderOffer
            {
                NeedRequestId = need.Id,
                ProviderId = provider.Id,
                Message = message,
                Price = request.Price,
                Status = OfferStatus.Pending,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            need.Status = NeedStatus.OfferReceived;
            need.UpdatedAtUtc = now;

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

            return Results.Created(
                $"/api/provider-panel/offers/{offer.Id}",
                new
                {
                    offer.Id,
                    offer.NeedRequestId,
                    offer.ProviderId,
                    offer.Message,
                    offer.Price,
                    status = offer.Status.ToString().ToLowerInvariant(),
                    offer.CreatedAtUtc
                });
        });

        providerGroup.MapPost("/offers/{offerId:guid}/withdraw", async (
            Guid offerId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba bağlı işletme bulunamadı."
                });
            }

            var offer = await dbContext.ProviderOffers
                .Include(x => x.NeedRequest)
                .FirstOrDefaultAsync(x =>
                    x.Id == offerId &&
                    x.ProviderId == provider.Id);

            if (offer is null)
            {
                return Results.NotFound(new
                {
                    message = "Teklif bulunamadı."
                });
            }

            if (offer.Status != OfferStatus.Pending)
            {
                return Results.Conflict(new
                {
                    message = "Yalnızca bekleyen teklifler geri çekilebilir."
                });
            }

            if (offer.NeedRequest.Status == NeedStatus.Completed)
            {
                return Results.Conflict(new
                {
                    message = "Sonuçlanmış talepte teklif geri çekilemez."
                });
            }

            if (offer.NeedRequest.Status == NeedStatus.Cancelled)
            {
                return Results.Conflict(new
                {
                    message = "İptal edilmiş talepte teklif geri çekilemez."
                });
            }

            var now = DateTime.UtcNow;

            offer.Status = OfferStatus.Withdrawn;
            offer.UpdatedAtUtc = now;

            var hasOtherPendingOffer = await dbContext.ProviderOffers
                .AnyAsync(x =>
                    x.NeedRequestId == offer.NeedRequestId &&
                    x.Id != offer.Id &&
                    x.Status == OfferStatus.Pending);

            offer.NeedRequest.Status = hasOtherPendingOffer
                ? NeedStatus.OfferReceived
                : NeedStatus.Open;

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

            return Results.Ok(new
            {
                offerId = offer.Id,
                status = "withdrawn",
                needStatus = offer.NeedRequest.Status.ToString().ToLowerInvariant()
            });
        });

        providerGroup.MapGet("/offers", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba bağlı işletme bulunamadı."
                });
            }

            var offers = await dbContext.ProviderOffers
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.NeedRequestId,
                    needTitle = x.NeedRequest.Title,
                    needStatus = x.NeedRequest.Status.ToString().ToLowerInvariant(),
                    x.Message,
                    x.Price,
                    status = x.Status.ToString().ToLowerInvariant(),
x.CreatedAtUtc,
                    x.UpdatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(offers);
        });

        var myNeedsGroup = app
            .MapGroup("/api/my-needs")
            .RequireAuthorization();

        myNeedsGroup.MapGet("/", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var needs = await dbContext.NeedRequests
                .AsNoTracking()
                .Where(x => x.OwnerUserId == userId)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.Title,
                    x.Description,
                    x.Category,
                    x.City,
                    x.District,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.CitySlug,
                    x.DistrictSlug,
                    status = x.Status.ToString().ToLowerInvariant(),
                    trackingExpiresAtUtc =
                        x.TrackingExpiresAtUtc ?? x.CreatedAtUtc.AddDays(7),
                    trackingExpired =
                        (x.TrackingExpiresAtUtc ?? x.CreatedAtUtc.AddDays(7)) <= DateTime.UtcNow,
x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    offerCount = x.Offers.Count
                })
                .ToListAsync();

            return Results.Ok(needs);
        });

        myNeedsGroup.MapPost("/{needId:guid}/cancel", async (
            Guid needId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var need = await dbContext.NeedRequests
                .FirstOrDefaultAsync(x =>
                    x.Id == needId &&
                    x.OwnerUserId == userId);

            if (need is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (need.Status == NeedStatus.Completed)
            {
                return Results.Conflict(new
                {
                    message = "Sonuçlanmış bir ihtiyaç talebi iptal edilemez."
                });
            }

            if (need.Status == NeedStatus.Cancelled)
            {
                return Results.Conflict(new
                {
                    message = "Bu ihtiyaç talebi zaten iptal edildi."
                });
            }

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

            foreach (var offer in pendingOffers)
            {
                offer.Status = OfferStatus.Withdrawn;
                offer.UpdatedAtUtc = now;
            }

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

            return Results.Ok(new
            {
                needId = need.Id,
                status = "cancelled",
                withdrawnOfferCount = pendingOffers.Count
            });
        });

        myNeedsGroup.MapGet("/{needId:guid}/offers", async (
            Guid needId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var ownsNeed = await dbContext.NeedRequests
                .AsNoTracking()
                .AnyAsync(x =>
                    x.Id == needId &&
                    x.OwnerUserId == userId);

            if (!ownsNeed)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            var offers = await dbContext.ProviderOffers
                .AsNoTracking()
                .Where(x =>
                    x.NeedRequestId == needId &&
                    x.Status != OfferStatus.Withdrawn)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.NeedRequestId,
                    x.ProviderId,
                    providerSlug = x.Provider.Slug,
                    businessName = x.Provider.BusinessName,
                    shortDescription = x.Provider.ShortDescription,
                    publicPhone = x.Provider.PublicPhone,
                    publicWhatsapp = x.Provider.PublicWhatsapp,
                    x.Message,
                    x.Price,
                    status = x.Status.ToString().ToLowerInvariant(),
x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(offers);
        });

        myNeedsGroup.MapPost("/{needId:guid}/offers/{offerId:guid}/accept", async (
            Guid needId,
            Guid offerId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var need = await dbContext.NeedRequests
                .FirstOrDefaultAsync(x =>
                    x.Id == needId &&
                    x.OwnerUserId == userId);

            if (need is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (need.Status == NeedStatus.Completed)
            {
                return Results.Conflict(new
                {
                    message = "Bu ihtiyaç talebi zaten sonuçlandı."
                });
            }

            if (need.Status == NeedStatus.Cancelled)
            {
                return Results.Conflict(new
                {
                    message = "İptal edilmiş talepte teklif kabul edilemez."
                });
            }

            var selectedOffer = await dbContext.ProviderOffers
                .FirstOrDefaultAsync(x =>
                    x.Id == offerId &&
                    x.NeedRequestId == needId);

            if (selectedOffer is null)
            {
                return Results.NotFound(new
                {
                    message = "Teklif bulunamadı."
                });
            }

            if (selectedOffer.Status == OfferStatus.Withdrawn)
            {
                return Results.BadRequest(new
                {
                    message = "Geri çekilmiş teklif kabul edilemez."
                });
            }

            if (selectedOffer.Status != OfferStatus.Pending)
            {
                return Results.Conflict(new
                {
                    message = "Yalnızca bekleyen teklifler kabul edilebilir."
                });
            }

            var allOffers = await dbContext.ProviderOffers
                .Where(x =>
                    x.NeedRequestId == needId &&
                    x.Status != OfferStatus.Withdrawn)
                .ToListAsync();

            var now = DateTime.UtcNow;

            foreach (var offer in allOffers)
            {
                offer.Status =
                    offer.Id == selectedOffer.Id
                        ? OfferStatus.Accepted
                        : OfferStatus.Rejected;

                offer.UpdatedAtUtc = now;
            }

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

            return Results.Ok(new
            {
                offerId = selectedOffer.Id,
                status = "accepted",
                needStatus = "completed"
            });
        });

        myNeedsGroup.MapPost("/{needId:guid}/offers/{offerId:guid}/reject", async (
            Guid needId,
            Guid offerId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var need = await dbContext.NeedRequests
                .FirstOrDefaultAsync(x =>
                    x.Id == needId &&
                    x.OwnerUserId == userId);

            if (need is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (need.Status == NeedStatus.Completed)
            {
                return Results.Conflict(new
                {
                    message = "Sonuçlanmış talepte teklif durumu değiştirilemez."
                });
            }

            if (need.Status == NeedStatus.Cancelled)
            {
                return Results.Conflict(new
                {
                    message = "İptal edilmiş talepte teklif durumu değiştirilemez."
                });
            }

            var offer = await dbContext.ProviderOffers
                .FirstOrDefaultAsync(x =>
                    x.Id == offerId &&
                    x.NeedRequestId == needId);

            if (offer is null)
            {
                return Results.NotFound(new
                {
                    message = "Teklif bulunamadı."
                });
            }

            if (offer.Status != OfferStatus.Pending)
            {
                return Results.Conflict(new
                {
                    message = "Yalnızca bekleyen teklifler reddedilebilir."
                });
            }

            var now = DateTime.UtcNow;

            offer.Status = OfferStatus.Rejected;
            offer.UpdatedAtUtc = now;

            var hasOtherPendingOffer = await dbContext.ProviderOffers
                .AnyAsync(x =>
                    x.NeedRequestId == needId &&
                    x.Id != offer.Id &&
                    x.Status == OfferStatus.Pending);

            need.Status = hasOtherPendingOffer
                ? NeedStatus.OfferReceived
                : NeedStatus.Open;

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
                needStatus = need.Status.ToString().ToLowerInvariant()
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

public sealed record CreateProviderOfferRequest(
    string? Message,
    decimal? Price);