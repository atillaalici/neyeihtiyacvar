using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminNeedEndpoints
{
    public static IEndpointRouteBuilder MapAdminNeedEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/needs");

        group.MapGet("/", async (string? status, bool? isActive, AppDbContext dbContext) =>
        {
            var query = dbContext.NeedRequests.AsNoTracking().AsQueryable();
            query = query.Where(x => x.IsActive == (isActive ?? true));

            if (!string.IsNullOrWhiteSpace(status) && TryParseStatus(status, out var parsedStatus))
                query = query.Where(x => x.Status == parsedStatus);

            var needs = await query
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id, x.Title, x.Description, x.Category, x.City, x.District,
                    x.CategorySlug, x.ServiceSlug, x.CitySlug, x.DistrictSlug,
                    status = x.Status.ToString().ToLowerInvariant(),
                    x.IsActive, x.OwnerUserId,
                    ownerDisplayName = x.OwnerUser != null ? x.OwnerUser.DisplayName : null,
                    ownerEmail = x.OwnerUser != null ? x.OwnerUser.Email : null,
                    offerCount = x.Offers.Count,
                    acceptedOfferCount = x.Offers.Count(o => o.Status == OfferStatus.Accepted),
                    pendingOfferCount = x.Offers.Count(o => o.Status == OfferStatus.Pending),
                    reviewCount = dbContext.ProviderReviews.Count(r => r.NeedRequestId == x.Id),
                    x.CreatedAtUtc, x.UpdatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(needs);
        });

        group.MapGet("/{id:guid}", async (Guid id, AppDbContext dbContext) =>
        {
            var need = await dbContext.NeedRequests
                .AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new
                {
                    x.Id, x.Title, x.Description, x.Category, x.City, x.District,
                    x.CategorySlug, x.ServiceSlug, x.CitySlug, x.DistrictSlug,
                    status = x.Status.ToString().ToLowerInvariant(),
                    x.IsActive, x.OwnerUserId,
                    ownerDisplayName = x.OwnerUser != null ? x.OwnerUser.DisplayName : null,
                    ownerEmail = x.OwnerUser != null ? x.OwnerUser.Email : null,
                    x.CreatedAtUtc, x.UpdatedAtUtc
                })
                .FirstOrDefaultAsync();

            if (need is null)
                return Results.NotFound(new { message = "İhtiyaç talebi bulunamadı." });

            var offers = await dbContext.ProviderOffers.AsNoTracking()
                .Where(x => x.NeedRequestId == id)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id, x.ProviderId,
                    providerSlug = x.Provider.Slug,
                    providerName = x.Provider.BusinessName,
                    providerPhone = x.Provider.PublicPhone,
                    providerWhatsapp = x.Provider.PublicWhatsapp,
                    x.Message, x.Price,
                    status = x.Status.ToString().ToLowerInvariant(),
                    x.CreatedAtUtc, x.UpdatedAtUtc
                }).ToListAsync();

            var review = await dbContext.ProviderReviews.AsNoTracking()
                .Where(x => x.NeedRequestId == id)
                .Select(x => new
                {
                    x.Id, x.ProviderId,
                    providerName = x.Provider.BusinessName,
                    reviewerName = x.User.DisplayName,
                    x.Rating, x.Comment, x.CreatedAtUtc, x.UpdatedAtUtc
                }).FirstOrDefaultAsync();

            return Results.Ok(new
            {
                need.Id, need.Title, need.Description, need.Category, need.City, need.District,
                need.CategorySlug, need.ServiceSlug, need.CitySlug, need.DistrictSlug,
                need.status, need.IsActive, need.OwnerUserId, need.ownerDisplayName, need.ownerEmail,
                need.CreatedAtUtc, need.UpdatedAtUtc,
                offerCount = offers.Count,
                acceptedOfferCount = offers.Count(x => x.status == "accepted"),
                pendingOfferCount = offers.Count(x => x.status == "pending"),
                rejectedOfferCount = offers.Count(x => x.status == "rejected"),
                withdrawnOfferCount = offers.Count(x => x.status == "withdrawn"),
                offers, review
            });
        });

        group.MapPost("/{id:guid}/status", async (
            Guid id,
            UpdateAdminNeedActiveStatusRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var need = await dbContext.NeedRequests.FirstOrDefaultAsync(x => x.Id == id);
            if (need is null)
                return Results.NotFound(new { message = "İhtiyaç talebi bulunamadı." });

            if (need.IsActive == request.IsActive)
                return Results.Ok(new { need.Id, need.IsActive });

            need.IsActive = request.IsActive;
            need.UpdatedAtUtc = DateTime.UtcNow;

            Guid? adminUserId = null;
            var adminIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(adminIdValue, out var parsedAdminId))
                adminUserId = parsedAdminId;

            dbContext.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = adminUserId,
                AdminEmail = principal.FindFirstValue(ClaimTypes.Email) ?? principal.Identity?.Name ?? "unknown",
                Action = request.IsActive ? "need.activate" : "need.deactivate",
                EntityType = "need",
                EntityId = need.Id.ToString(),
                EntityName = need.Title,
                Details = request.IsActive
                    ? $"İhtiyaç talebi aktif edildi: {need.Title}"
                    : $"İhtiyaç talebi pasife alındı: {need.Title}",
                CreatedAtUtc = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                need.Id, need.IsActive,
                message = request.IsActive
                    ? "İhtiyaç talebi aktif edildi."
                    : "İhtiyaç talebi pasife alındı."
            });
        });

        group.MapDelete("/{id:guid}", async (
            Guid id,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var need = await dbContext.NeedRequests
                .FirstOrDefaultAsync(x => x.Id == id);

            if (need is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            var title = need.Title;

            Guid? adminUserId = null;
            var adminIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (Guid.TryParse(adminIdValue, out var parsedAdminId))
            {
                adminUserId = parsedAdminId;
            }

            dbContext.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = adminUserId,
                AdminEmail =
                    principal.FindFirstValue(ClaimTypes.Email) ??
                    principal.Identity?.Name ??
                    "unknown",
                Action = "need.delete",
                EntityType = "need",
                EntityId = need.Id.ToString(),
                EntityName = title,
                Details = $"İhtiyaç talebi kalıcı olarak silindi: {title}",
                CreatedAtUtc = DateTime.UtcNow
            });

            dbContext.NeedRequests.Remove(need);

            try
            {
                await dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Results.Conflict(new
                {
                    message =
                        "Bu talebe bağlı kayıtlar nedeniyle talep silinemedi."
                });
            }

            return Results.Ok(new
            {
                id,
                message = "İhtiyaç talebi kalıcı olarak silindi."
            });
        });
        return app;
    }

    private static bool TryParseStatus(string value, out NeedStatus status)
    {
        switch (value.Trim().ToLowerInvariant())
        {
            case "open": status = NeedStatus.Open; return true;
            case "offerreceived": status = NeedStatus.OfferReceived; return true;
            case "completed": status = NeedStatus.Completed; return true;
            case "cancelled": status = NeedStatus.Cancelled; return true;
            default: status = default; return false;
        }
    }
}

public sealed record UpdateAdminNeedActiveStatusRequest(bool IsActive);
