using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ContactEndpoints
{
    public static IEndpointRouteBuilder MapContactEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/contact");

        group.MapPost("/", async (
            CreateContactRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            Guid? userId = null;

            var idValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
                principal.FindFirstValue("sub");

            if (Guid.TryParse(idValue, out var authenticatedUserId))
            {
                var userExists = await dbContext.Users
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.Id == authenticatedUserId &&
                        x.IsActive &&
                        x.DeletedAtUtc == null);

                if (userExists)
                {
                    userId = authenticatedUserId;
                }
            }

            var fullName = request.FullName?.Trim() ?? string.Empty;
            var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
            var phoneNumber = request.PhoneNumber?.Trim();
            var subject = request.Subject?.Trim() ?? string.Empty;
            var message = request.Message?.Trim() ?? string.Empty;

            var errors = new Dictionary<string, string[]>();

            if (fullName.Length < 2 || fullName.Length > 150)
            {
                errors["fullName"] =
                    ["Ad soyad 2-150 karakter arasında olmalıdır."];
            }

            if (email.Length < 5 ||
                email.Length > 254 ||
                !email.Contains('@'))
            {
                errors["email"] =
                    ["Geçerli bir e-posta adresi giriniz."];
            }

            if (!string.IsNullOrWhiteSpace(phoneNumber) &&
                phoneNumber.Length > 30)
            {
                errors["phoneNumber"] =
                    ["Telefon numarası en fazla 30 karakter olabilir."];
            }

            var allowedSubjects = new[]
            {
                "Genel Bilgi",
                "Üyelik ve Paketler",
                "Ödeme / Fatura",
                "İşletme Hesabı",
                "Teknik Destek",
                "İptal / İade",
                "Diğer"
            };

            if (!allowedSubjects.Contains(subject))
            {
                errors["subject"] =
                    ["Lütfen geçerli bir konu seçiniz."];
            }

            if (message.Length < 10 || message.Length > 4000)
            {
                errors["message"] =
                    ["Mesaj 10-4000 karakter arasında olmalıdır."];
            }

            if (errors.Count > 0)
            {
                return Results.ValidationProblem(errors);
            }

            var item = new ContactRequest
            {
                UserId = userId,
                FullName = fullName,
                Email = email,
                PhoneNumber = string.IsNullOrWhiteSpace(phoneNumber)
                    ? null
                    : phoneNumber,
                Subject = subject,
                Message = message,
                Status = "new",
                CreatedAtUtc = DateTime.UtcNow
            };

            dbContext.ContactRequests.Add(item);
            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                item.Id,
                message =
                    "Mesajınız başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz."
            });
        });

        return app;
    }

    public sealed record CreateContactRequest(
        string? FullName,
        string? Email,
        string? PhoneNumber,
        string? Subject,
        string? Message);
}
