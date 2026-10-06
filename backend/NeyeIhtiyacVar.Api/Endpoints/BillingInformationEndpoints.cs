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

            var now = DateTime.UtcNow;
            var item = await db.BillingInformations.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            return Results.Ok(item);
        });

        group.MapPut("/", async (SaveBillingInformationRequest request, ClaimsPrincipal principal, AppDbContext db) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var type = request.BillingType.Trim().ToLowerInvariant();
            if (type is not ("individual" or "sole_proprietorship" or "corporate"))
                return Results.BadRequest(new { message = "Geçerli bir fatura tipi seçin." });

            var taxOffice = string.IsNullOrWhiteSpace(request.TaxOffice)
                ? null
                : request.TaxOffice.Trim();

            var identityNumber = new string(
                (request.IdentityNumber ?? string.Empty)
                .Where(char.IsDigit)
                .ToArray());

            var taxNumber = new string(
                (request.TaxNumber ?? string.Empty)
                .Where(char.IsDigit)
                .ToArray());

            if (string.IsNullOrWhiteSpace(request.NameOrTitle) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Phone) ||
                string.IsNullOrWhiteSpace(request.Address) ||
                string.IsNullOrWhiteSpace(request.City) ||
                string.IsNullOrWhiteSpace(request.District))
                return Results.BadRequest(new
                {
                    message = "Fatura bilgilerindeki zorunlu alanları eksiksiz doldurun."
                });

            if (type == "individual")
            {
                if (identityNumber.Length != 11)
                    return Results.BadRequest(new
                    {
                        message = "T.C. Kimlik No 11 haneli olmalıdır."
                    });

                taxNumber = string.Empty;
                taxOffice = null;
            }

            if (type == "sole_proprietorship")
            {
                if (string.IsNullOrWhiteSpace(request.FullName))
                    return Results.BadRequest(new
                    {
                        message = "Şahıs işletmesi için adı soyadı zorunludur."
                    });

                if (identityNumber.Length == 0 && taxNumber.Length == 0)
                    return Results.BadRequest(new
                    {
                        message = "Şahıs işletmesi için T.C. Kimlik No veya Vergi Kimlik No bilgilerinden en az birini girin."
                    });

                if (identityNumber.Length > 0 && identityNumber.Length != 11)
                    return Results.BadRequest(new
                    {
                        message = "T.C. Kimlik No 11 haneli olmalıdır."
                    });

                if (taxNumber.Length > 0 && taxNumber.Length != 10)
                    return Results.BadRequest(new
                    {
                        message = "Vergi Kimlik No 10 haneli olmalıdır."
                    });

                if (string.IsNullOrWhiteSpace(taxOffice))
                    return Results.BadRequest(new
                    {
                        message = "Şahıs işletmesi için vergi dairesi zorunludur."
                    });
            }

            if (type == "corporate")
            {
                if (taxNumber.Length != 10)
                    return Results.BadRequest(new
                    {
                        message = "Vergi Kimlik No 10 haneli olmalıdır."
                    });

                if (string.IsNullOrWhiteSpace(taxOffice))
                    return Results.BadRequest(new
                    {
                        message = "Şirket için vergi dairesi zorunludur."
                    });

                identityNumber = string.Empty;
            }

            var now = DateTime.UtcNow;
            var item = await db.BillingInformations.FirstOrDefaultAsync(x => x.UserId == userId);

            if (item is null)
            {
                item = new BillingInformation { UserId = userId, CreatedAtUtc = now };
                db.BillingInformations.Add(item);
            }

            item.BillingType = type;
            item.NameOrTitle = request.NameOrTitle.Trim();
            item.FullName = type == "sole_proprietorship"
                ? request.FullName?.Trim()
                : null;
            item.TaxOffice = taxOffice;
            item.IdentityNumber = string.IsNullOrWhiteSpace(identityNumber) ? null : identityNumber;
            item.TaxNumber = string.IsNullOrWhiteSpace(taxNumber) ? null : taxNumber;
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
    string? FullName,
    string? TaxOffice,
    string? IdentityNumber,
    string? TaxNumber,
    string Email,
    string Phone,
    string Address,
    string City,
    string District);

