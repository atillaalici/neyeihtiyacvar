using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class BillingInformationEndpoints
{
    public static IEndpointRouteBuilder MapBillingInformationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/billing-information").RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var item = await db.BillingInformations.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            return Results.Ok(item);
        });

        group.MapPut("/", async (SaveBillingInformationRequest request, ClaimsPrincipal principal, AppDbContext db) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var type = request.BillingType.Trim().ToLowerInvariant();
            if (type is not ("individual" or "corporate"))
                return Results.BadRequest(new { message = "Geçerli bir fatura tipi seçin." });

            var number = new string(request.TaxOrIdentityNumber.Where(char.IsDigit).ToArray());
            var taxOffice = string.IsNullOrWhiteSpace(request.TaxOffice) ? null : request.TaxOffice.Trim();

            if (string.IsNullOrWhiteSpace(request.NameOrTitle) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Phone) ||
                string.IsNullOrWhiteSpace(request.Address) ||
                string.IsNullOrWhiteSpace(request.City) ||
                string.IsNullOrWhiteSpace(request.District))
                return Results.BadRequest(new { message = "Fatura bilgilerini eksiksiz doldurun." });

            if (type == "individual" && number.Length != 11)
                return Results.BadRequest(new { message = "T.C. kimlik numarası 11 haneli olmalıdır." });

            if (type == "corporate" && number.Length != 10)
                return Results.BadRequest(new { message = "Vergi numarası 10 haneli olmalıdır." });

            if (type == "corporate" && string.IsNullOrWhiteSpace(taxOffice))
                return Results.BadRequest(new { message = "Kurumsal fatura için vergi dairesini girin." });

            var now = DateTime.UtcNow;
            var item = await db.BillingInformations.FirstOrDefaultAsync(x => x.UserId == userId);

            if (item is null)
            {
                item = new BillingInformation { UserId = userId, CreatedAtUtc = now };
                db.BillingInformations.Add(item);
            }

            item.BillingType = type;
            item.NameOrTitle = request.NameOrTitle.Trim();
            item.TaxOffice = taxOffice;
            item.TaxOrIdentityNumber = number;
            item.Email = request.Email.Trim();
            item.Phone = request.Phone.Trim();
            item.Address = request.Address.Trim();
            item.City = request.City.Trim();
            item.District = request.District.Trim();
            item.UpdatedAtUtc = now;

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Fatura bilgileri kaydedildi.", id = item.Id });
        });

        return app;
    }
}

public sealed record SaveBillingInformationRequest(
    string BillingType,
    string NameOrTitle,
    string? TaxOffice,
    string TaxOrIdentityNumber,
    string Email,
    string Phone,
    string Address,
    string City,
    string District);

