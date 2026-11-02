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

            if (need.TargetProviderId != null &&
                need.TargetProviderId != provider.Id)
            {
                return Results.BadRequest(new
                {
                    message = "Bu talep başka bir işletmeye gönderilmiş."
                });
            }

            var directRequest = need.TargetProviderId == provider.Id;

            var legacyDirectMatch =
                need.CitySlug == provider.CitySlug &&
                need.DistrictSlug == provider.DistrictSlug &&
                (
                    (need.CategorySlug == provider.CategorySlug &&
                     need.ServiceSlug == provider.ServiceSlug) ||
                    provider.AdditionalServices.Contains(need.ServiceSlug)
                );

            var categoryWorkMatch =
                need.CategoryLibraryWorkId != null &&
                await dbContext.ProviderCategoryLibraryWorks.AnyAsync(link =>
                    link.ProviderId == provider.Id &&
                    link.CategoryLibraryWorkId == need.CategoryLibraryWorkId);

            var sameDistrict =
                need.CitySlug == provider.CitySlug &&
                need.DistrictSlug == provider.DistrictSlug;

            var geographicMatch = !need.DistributionEnabled
                ? sameDistrict
                : NeedDistributionGeography.IsMatch(
                    need.CitySlug,
                    need.DistrictSlug,
                    provider.CitySlug,
                    provider.DistrictSlug,
                    need.DistributionStage);

            var exactMatch = directRequest
                ? legacyDirectMatch || (sameDistrict && categoryWorkMatch)
                : need.IsActive &&
                  need.OwnerUserId != null &&
                  (!need.DistributionEnabled || need.AcceptingNewOffers) &&
                  geographicMatch &&
                  categoryWorkMatch;

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
                    $"/taleplerim?talep={need.Id}");
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

        providerGroup.MapPut("/offers/{offerId:guid}", async (
            Guid offerId,
            CreateProviderOfferRequest request,
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
                    message = "Yalnızca bekleyen teklifler düzenlenebilir."
                });
            }

            if (offer.NeedRequest.Status is NeedStatus.Completed or NeedStatus.Cancelled)
            {
                return Results.Conflict(new
                {
                    message = "Sonuçlanmış veya iptal edilmiş taleplerde teklif düzenlenemez."
                });
            }

            var hasChanged = offer.Message != message || offer.Price != request.Price;

            if (hasChanged)
            {
                offer.Message = message;
                offer.Price = request.Price;
                offer.UpdatedAtUtc = DateTime.UtcNow;

                if (offer.NeedRequest.OwnerUserId is Guid customerId)
                {
                    NotificationWriter.Add(
                        dbContext,
                        customerId,
                        "offer_updated",
                        "Teklifiniz güncellendi",
                        $"{provider.BusinessName} - {offer.NeedRequest.Title} talebinize verdiği teklifi güncelledi. Yeni teklif detaylarını inceleyebilirsiniz.",
                        $"/taleplerim?talep={offer.NeedRequestId}");
                }

                await dbContext.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                offer.Id,
                offer.Message,
                offer.Price,
                status = offer.Status.ToString().ToLowerInvariant(),
                offer.UpdatedAtUtc
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
                    needDescription = x.NeedRequest.Description,
                    needCategory = x.NeedRequest.Category,
                    needCity = x.NeedRequest.City,
                    needDistrict = x.NeedRequest.District,
                    needCreatedAtUtc = x.NeedRequest.CreatedAtUtc,
                    needStatus = x.NeedRequest.Status.ToString().ToLowerInvariant(),
                    contactByPhone = x.NeedRequest.ContactPreferencesSet &&
                        x.NeedRequest.ContactByPhone,
                    contactByWhatsapp = x.NeedRequest.ContactPreferencesSet &&
                        x.NeedRequest.ContactByWhatsapp,
                    contactByEmail = x.NeedRequest.ContactPreferencesSet &&
                        x.NeedRequest.ContactByEmail,
                    contactBySystemMessage = x.NeedRequest.ContactPreferencesSet &&
                        x.NeedRequest.ContactBySystemMessage,
                    requesterFullName = x.NeedRequest.OwnerUser == null
                        ? null
                        : x.NeedRequest.OwnerUser.DisplayName,
                    showFullName = x.NeedRequest.ContactPreferencesSet &&
                        x.NeedRequest.ShowFullName,
                    requesterMemberSinceUtc = x.NeedRequest.OwnerUser == null
                        ? (DateTime?)null
                        : x.NeedRequest.OwnerUser.CreatedAtUtc,
                    requesterCompletedNeedCount = x.NeedRequest.OwnerUserId == null
                        ? 0
                        : dbContext.NeedRequests.Count(n =>
                            n.OwnerUserId == x.NeedRequest.OwnerUserId &&
                            n.Status == NeedStatus.Completed),
                    requesterPhone = x.Status != OfferStatus.Withdrawn &&
                        x.NeedRequest.ContactPreferencesSet &&
                        x.NeedRequest.ContactByPhone &&
                        x.NeedRequest.OwnerUser != null
                            ? x.NeedRequest.OwnerUser.PhoneNumber
                            : null,
                    requesterWhatsapp = x.Status != OfferStatus.Withdrawn &&
                        x.NeedRequest.ContactPreferencesSet &&
                        x.NeedRequest.ContactByWhatsapp &&
                        x.NeedRequest.OwnerUser != null
                            ? x.NeedRequest.OwnerUser.WhatsAppNumber
                            : null,
                    requesterEmail = x.Status != OfferStatus.Withdrawn &&
                        x.NeedRequest.ContactPreferencesSet &&
                        x.NeedRequest.ContactByEmail &&
                        x.NeedRequest.OwnerUser != null
                            ? x.NeedRequest.OwnerUser.Email
                            : null,
                    x.Message,
                    x.Price,
                    status = x.Status.ToString().ToLowerInvariant(),
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc
                })
                .ToListAsync();

            var safeOffers = offers.Select(x => new
            {
                x.Id,
                x.NeedRequestId,
                x.needTitle,
                x.needDescription,
                x.needCategory,
                x.needCity,
                x.needDistrict,
                x.needCreatedAtUtc,
                x.needStatus,
                x.contactByPhone,
                x.contactByWhatsapp,
                x.contactByEmail,
                x.contactBySystemMessage,
                requesterName = string.IsNullOrWhiteSpace(x.requesterFullName)
                    ? null
                    : x.showFullName
                        ? x.requesterFullName
                        : string.Join(" ",
                            x.requesterFullName
                                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                                .Select(part => part.Substring(0, 1) + ".")),
                x.requesterMemberSinceUtc,
                x.requesterCompletedNeedCount,
                x.requesterPhone,
                x.requesterWhatsapp,
                x.requesterEmail,
                x.Message,
                x.Price,
                x.status,
                x.CreatedAtUtc,
                x.UpdatedAtUtc
            }).ToList();

            return Results.Ok(safeOffers);
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
                    x.DistributionEnabled,
                    x.AcceptingNewOffers,
                    acceptedJobCount = dbContext.NeedJobs.Count(
                        job => job.NeedRequestId == x.Id),
                    trackingExpiresAtUtc = x.TrackingExpiresAtUtc,
                    trackingExpired =
                        x.TrackingExpiresAtUtc != null && x.TrackingExpiresAtUtc <= DateTime.UtcNow,
x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    offerCount = x.Offers.Count
                })
                .ToListAsync();

            return Results.Ok(needs);
        });

        myNeedsGroup.MapPost("/{needId:guid}/details", async (
            Guid needId,
            AddNeedDetailsRequest request,
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
                    message = "Talep bulunamadı."
                });
            }

            if (need.Status == NeedStatus.Cancelled ||
                need.Status == NeedStatus.Completed)
            {
                return Results.Conflict(new
                {
                    message = "Bu talep artık detaylandırılamaz."
                });
            }

            var additionalDetails = request.Details?.Trim();

            if (string.IsNullOrWhiteSpace(additionalDetails))
            {
                return Results.BadRequest(new
                {
                    message = "Ek açıklama boş olamaz."
                });
            }

            var updatedDescription =
                need.Description.TrimEnd() +
                "\\n\\nEk Açıklama:\\n" +
                additionalDetails;

            if (updatedDescription.Length > 2000)
            {
                return Results.BadRequest(new
                {
                    message = "Toplam açıklama 2000 karakteri aşamaz."
                });
            }

            need.Description = updatedDescription;
            need.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                need.Id,
                need.Description,
                need.UpdatedAtUtc
            });
        });

        myNeedsGroup.MapPost("/{needId:guid}/offer-preference", async (
            Guid needId,
            UpdateOfferPreferenceRequest request,
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

            if (!need.DistributionEnabled)
            {
                return Results.Conflict(new
                {
                    message = "Bu işlem yalnızca yeni teklif sistemi için kullanılabilir."
                });
            }

            if (need.Status == NeedStatus.Cancelled ||
                need.Status == NeedStatus.Completed)
            {
                return Results.Conflict(new
                {
                    message = "Kapalı veya sonuçlanmış talebin tercihi değiştirilemez."
                });
            }

            var hasAcceptedOffer = await dbContext.NeedJobs
                .AnyAsync(x => x.NeedRequestId == needId);

            if (!hasAcceptedOffer)
            {
                return Results.Conflict(new
                {
                    message = "Teklif alma tercihi ilk teklif kabul edildikten sonra değiştirilebilir."
                });
            }

            need.AcceptingNewOffers = request.AcceptingNewOffers;
            need.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                needId = need.Id,
                acceptingNewOffers = need.AcceptingNewOffers
            });
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

            var now = DateTime.UtcNow;

            if (need.DistributionEnabled)
            {
                var existingJob = await dbContext.NeedJobs
                    .AnyAsync(x => x.ProviderOfferId == selectedOffer.Id);

                if (existingJob)
                {
                    return Results.Conflict(new
                    {
                        message = "Bu teklif için zaten iş kaydı oluşturulmuş."
                    });
                }

                selectedOffer.Status = OfferStatus.Accepted;
                selectedOffer.UpdatedAtUtc = now;

                dbContext.NeedJobs.Add(new NeedJob
                {
                    NeedRequestId = need.Id,
                    ProviderOfferId = selectedOffer.Id,
                    ProviderId = selectedOffer.ProviderId,
                    Status = "Accepted",
                    AcceptedAtUtc = now,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                });

                need.Status = NeedStatus.OfferReceived;
                need.UpdatedAtUtc = now;
            }
            else
            {
                var allOffers = await dbContext.ProviderOffers
                    .Where(x =>
                        x.NeedRequestId == needId &&
                        x.Status != OfferStatus.Withdrawn)
                    .ToListAsync();

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
            }

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
                needStatus = need.Status.ToString().ToLowerInvariant()
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

            var hasAcceptedJob = need.DistributionEnabled &&
                await dbContext.NeedJobs.AnyAsync(x =>
                    x.NeedRequestId == needId);

            need.Status = hasOtherPendingOffer || hasAcceptedJob
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
public sealed record AddNeedDetailsRequest(string? Details);
public sealed record UpdateOfferPreferenceRequest(bool AcceptingNewOffers);
