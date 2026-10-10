using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class MembershipOrderEndpoints
{
    public static IEndpointRouteBuilder MapMembershipOrderEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/membership-orders")
            .RequireAuthorization();

        group.MapPost("/", async (
            CreateMembershipOrderRequest request,
            ClaimsPrincipal principal,
            AppDbContext db) =>
        {
            if (!Guid.TryParse(
                principal.FindFirstValue(ClaimTypes.NameIdentifier),
                out var userId))
                return Results.Unauthorized();

            var user = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == userId && x.IsActive);

            if (user is null)
                return Results.Unauthorized();

            if (!string.IsNullOrWhiteSpace(request.PromotionCode))
                return Results.BadRequest(new
                {
                    message = "Genel promosyon kodları şu anda kullanılmamaktadır."
                });

            if (!request.LegalAccepted)
                return Results.BadRequest(new
                {
                    message = "Üyelik sözleşmesini kabul etmelisiniz."
                });

            if (!await db.Set<BillingInformation>().AsNoTracking()
                .AnyAsync(x => x.UserId == userId))
                return Results.BadRequest(new
                {
                    message = "Önce fatura bilgilerini kaydedin."
                });

            if (await db.Providers.AsNoTracking()
                .AnyAsync(x => x.OwnerUserId == userId))
                return Results.Conflict(new
                {
                    message = "Bu hesap zaten bir işletmeye bağlı."
                });

            if (await db.ProviderMemberships.AsNoTracking()
                .AnyAsync(x => x.UserId == userId && x.IsActive &&
                    (x.ExpiresAtUtc ?? x.StartsAtUtc.AddYears(1))
                    > DateTime.UtcNow))
                return Results.Conflict(new
                {
                    message = "Aktif üyelik süresince yeni paket satın alınamaz."
                });

            // Yalnızca ödeme başlatılmamış, süresi dolmuş
            // siparişleri kapat. Ödeme referanslı siparişleri koru.
            var expiryNow = DateTime.UtcNow;

            await db.MembershipOrders
                .Where(x =>
                    x.UserId == userId &&
                    x.Status == "pending" &&
                    x.PaymentStatus == "not_started" &&
                    x.PaymentReference == null &&
                    x.ExpiresAtUtc != null &&
                    x.ExpiresAtUtc <= expiryNow)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.Status, "expired")
                    .SetProperty(x => x.UpdatedAtUtc, expiryNow));

            if (await db.MembershipOrders.AsNoTracking()
                .AnyAsync(x => x.UserId == userId &&
                    x.Status == "pending"))
                return Results.Conflict(new
                {
                    message = "Ödeme bekleyen siparişiniz zaten var."
                });

            var planCode = request.PlanCode?.Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(planCode))
                return Results.BadRequest(new
                {
                    message = "Paket seçimi zorunludur."
                });

            var plan = await db.MembershipPlans.AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Code == planCode && x.IsActive);

            if (plan is null)
                return Results.BadRequest(new
                {
                    message = "Geçerli bir üyelik paketi seçin."
                });

            var draft = request.RegistrationDraft;

            if (draft is null ||
                string.IsNullOrWhiteSpace(draft.BusinessName) ||
                string.IsNullOrWhiteSpace(draft.ApplicantName) ||
                string.IsNullOrWhiteSpace(draft.PhoneNumber) ||
                string.IsNullOrWhiteSpace(draft.CitySlug) ||
                string.IsNullOrWhiteSpace(draft.DistrictSlug) ||
                string.IsNullOrWhiteSpace(draft.CategorySlug) ||
                string.IsNullOrWhiteSpace(draft.ServiceSlug))
                return Results.BadRequest(new
                {
                    message = "İşletme kayıt bilgileri eksik."
                });

            var fields = new (string? Value, int Max, string Name)[]
            {
                (draft.BusinessName, 200, "İşletme adı"),
                (draft.ApplicantName, 150, "Yetkili adı"),
                (draft.PhoneNumber, 30, "Telefon"),
                (draft.CitySlug, 100, "İl"),
                (draft.DistrictSlug, 100, "İlçe"),
                (draft.CategorySlug, 100, "Kategori"),
                (draft.ServiceSlug, 150, "Hizmet"),
                (draft.AdditionalCategorySlug, 100, "Ek kategori"),
                (draft.AdditionalServiceSlug, 150, "Ek hizmet")
            };

            foreach (var field in fields)
            {
                if (field.Value?.Trim().Length > field.Max)
                    return Results.BadRequest(new
                    {
                        message = $"{field.Name} en fazla {field.Max} karakter olabilir."
                    });
            }

            var category = await db.Categories.AsNoTracking()
                .Include(x => x.Services)
                .FirstOrDefaultAsync(x =>
                    x.Slug == draft.CategorySlug.Trim() &&
                    x.IsActive);

            if (category is null)
                return Results.BadRequest(new
                {
                    message = "Kategori geçerli değil."
                });

            var serviceSlugs = category.Services
                .Where(x => x.IsActive)
                .Select(x => RegistrationValidationHelper.ToSlug(x.Name))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (!serviceSlugs.Contains(draft.ServiceSlug.Trim()))
                return Results.BadRequest(new
                {
                    message = "Ana hizmet seçilen kategoriye ait olmalıdır."
                });

            var phoneDigits = new string(
                draft.PhoneNumber.Where(char.IsDigit).ToArray());

            if (phoneDigits.StartsWith("90") &&
                phoneDigits.Length == 12)
                phoneDigits = phoneDigits[2..];

            if (phoneDigits.StartsWith("0") &&
                phoneDigits.Length == 11)
                phoneDigits = phoneDigits[1..];

            if (phoneDigits.Length != 10 ||
                !phoneDigits.StartsWith("5"))
                return Results.BadRequest(new
                {
                    message = "Telefon +90 5XX XXX XX XX formatında olmalıdır."
                });

            if (!string.IsNullOrWhiteSpace(draft.AdditionalCategorySlug) &&
                string.IsNullOrWhiteSpace(draft.AdditionalServiceSlug))
                return Results.BadRequest(new
                {
                    message = "Ek kategori seçildiğinde ek hizmet de seçilmelidir."
                });

            if (!string.IsNullOrWhiteSpace(draft.AdditionalServiceSlug))
            {
                if (plan.ServiceLimit < 2)
                    return Results.BadRequest(new
                    {
                        message = "Seçilen paket ikinci hizmete izin vermiyor."
                    });

                var additionalCategorySlug =
                    string.IsNullOrWhiteSpace(draft.AdditionalCategorySlug)
                        ? draft.CategorySlug.Trim()
                        : draft.AdditionalCategorySlug.Trim();

                var additionalCategory = await db.Categories
                    .AsNoTracking()
                    .Include(x => x.Services)
                    .FirstOrDefaultAsync(x =>
                        x.Slug == additionalCategorySlug && x.IsActive);

                if (additionalCategory is null)
                    return Results.BadRequest(new
                    {
                        message = "Ek hizmet kategorisi geçerli değil."
                    });

                var additionalServiceSlugs = additionalCategory.Services
                    .Where(x => x.IsActive)
                    .Select(x => RegistrationValidationHelper.ToSlug(x.Name))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                if (!additionalServiceSlugs.Contains(
                    draft.AdditionalServiceSlug.Trim()))
                    return Results.BadRequest(new
                    {
                        message = "Ek hizmet seçilen kategoriye ait olmalıdır."
                    });

                if (string.Equals(
                        additionalCategorySlug,
                        draft.CategorySlug.Trim(),
                        StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(
                        draft.AdditionalServiceSlug.Trim(),
                        draft.ServiceSlug.Trim(),
                        StringComparison.OrdinalIgnoreCase))
                    return Results.BadRequest(new
                    {
                        message = "Ek hizmet ana hizmet ile aynı olamaz."
                    });
            }

            var city = await db.Cities.AsNoTracking()
                .Include(x => x.Districts)
                .FirstOrDefaultAsync(x =>
                    x.Slug == draft.CitySlug.Trim() && x.IsActive);

            if (city is null ||
                !city.Districts.Any(x =>
                    x.Slug == draft.DistrictSlug.Trim() && x.IsActive))
                return Results.BadRequest(new
                {
                    message = "İl veya ilçe geçerli değil."
                });

            decimal discount = 0m;
            decimal finalAmount = plan.AnnualPrice;
            string? promotionCode = null;

            if (!string.IsNullOrWhiteSpace(request.PromotionCode))
            {
                var result =
                    await PromotionPricingService.ValidateAndCalculateAsync(
                        request.PromotionCode, plan.Code, db);

                if (result.ErrorResult is not null)
                    return result.ErrorResult;

                discount = result.DiscountAmount;
                finalAmount = result.FinalPrice;
                promotionCode = result.Promo!.Code;
            }

            if (finalAmount <= 0m)
                return Results.BadRequest(new
                {
                    message = "0 TL promosyonlar ücretsiz kayıt akışından tamamlanmalıdır."
                });

            var now = DateTime.UtcNow;

            var order = new MembershipOrder
            {
                UserId = userId,
                PlanId = plan.Id,
                OrderType = "initial",
                Status = "pending",
                OriginalAmount = plan.AnnualPrice,
                DiscountAmount = discount,
                FinalAmount = finalAmount,
                Currency = "TRY",
                PromotionCode = promotionCode,
                PaymentProvider = "iyzico",
                RegistrationDraftJson = JsonSerializer.Serialize(draft),
                CreatedAtUtc = now,
                ExpiresAtUtc = now.AddMinutes(30),
                UpdatedAtUtc = now
            };

            db.MembershipOrders.Add(order);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
                when (ex.InnerException is Npgsql.PostgresException pg &&
                      pg.SqlState == Npgsql.PostgresErrorCodes.UniqueViolation &&
                      pg.ConstraintName ==
                          "IX_MembershipOrders_OnePendingPerUser")
            {
                return Results.Conflict(new
                {
                    message = "Ödeme bekleyen siparişiniz zaten var."
                });
            }

            return Results.Created(
                $"/api/membership-orders/{order.Id}",
                new
                {
                    orderId = order.Id,
                    status = order.Status,
                    planCode = plan.Code,
                    originalAmount = order.OriginalAmount,
                    discountAmount = order.DiscountAmount,
                    finalAmount = order.FinalAmount,
                    currency = order.Currency,
                    paymentRequired = true
                });
        });

        return app;
    }
}

public sealed record CreateMembershipOrderRequest(
    string PlanCode,
    string? PromotionCode,
    MembershipRegistrationDraft? RegistrationDraft,
    bool LegalAccepted);

public sealed record MembershipRegistrationDraft(
    string BusinessName,
    string ApplicantName,
    string PhoneNumber,
    string CitySlug,
    string DistrictSlug,
    string CategorySlug,
    string ServiceSlug,
    string? AdditionalCategorySlug,
    string? AdditionalServiceSlug,
    string? PublicAddress = null,
    double? Latitude = null,
    double? Longitude = null);
