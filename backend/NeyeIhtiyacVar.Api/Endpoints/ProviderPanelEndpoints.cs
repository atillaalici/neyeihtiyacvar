using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderPanelEndpoints
{
    public static IEndpointRouteBuilder MapProviderPanelEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/provider-panel")
            .RequireAuthorization();

        group.MapGet("/me", async (
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

            var matchedNeedCount = await dbContext.NeedRequests
                .AsNoTracking()
                .CountAsync(x =>
                    x.CategorySlug == provider.CategorySlug &&
                    (x.ServiceSlug == provider.ServiceSlug ||
                     provider.AdditionalServices.Contains(x.ServiceSlug!)) &&
                    x.CitySlug == provider.CitySlug &&
                    x.DistrictSlug == provider.DistrictSlug);

            return Results.Ok(ToPanelProfile(provider, matchedNeedCount));
        });

        group.MapPut("/me", async (
            UpdateOwnProviderRequest request,
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

            if (request.ExpectedVersion != provider.Version)
            {
                return Results.Conflict(new
                {
                    message = "İşletme profili başka bir işlemde değişti. Sayfayı yenileyip tekrar deneyin.",
                    currentVersion = provider.Version
                });
            }

            var errors = ValidateOwnUpdate(request);

            var normalizedAdditionalServices = request.AdditionalServices
                .Select(x => x?.Trim().ToLowerInvariant() ?? string.Empty)
                .Where(x => x.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (normalizedAdditionalServices.Length > 1)
            {
                errors["additionalServices"] =
                    ["En fazla 1 ek hizmet seçebilirsiniz."];
            }

            if (normalizedAdditionalServices.Any(x =>
                string.Equals(
                    x,
                    provider.ServiceSlug,
                    StringComparison.OrdinalIgnoreCase)))
            {
                errors["additionalServices"] =
                    ["Ana hizmet ek hizmetler arasında tekrar seçilemez."];
            }

            var validServiceSlugs = (await dbContext.CategoryServices
                    .AsNoTracking()
                    .Where(x =>
                        x.Category.Slug == provider.CategorySlug &&
                        x.IsActive)
                    .Select(x => x.Name)
                    .ToListAsync())
                .Select(ToSlug)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (normalizedAdditionalServices.Any(x =>
                !validServiceSlugs.Contains(x)))
            {
                errors["additionalServices"] =
                    ["Ek hizmetler işletmenin ana kategorisindeki hizmetlerden seçilmelidir."];
            }

            if (errors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Gönderilen bilgiler geçerli değil.",
                    errors
                });
            }

            provider.Description = Optional(request.Description);
            provider.AdditionalServices = normalizedAdditionalServices;
            provider.PublicPhone = Optional(request.PublicPhone);
            provider.PublicWhatsapp = Optional(request.PublicWhatsapp);
            provider.PublicAddress = Optional(request.PublicAddress);
            provider.WorkingHours = Optional(request.WorkingHours);
            provider.ExperienceYears = request.ExperienceYears;
            provider.EmergencyService = request.EmergencyService;
            provider.OnsiteService = request.OnsiteService;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            await dbContext.SaveChangesAsync();

            var matchedNeedCount = await dbContext.NeedRequests
                .AsNoTracking()
                .CountAsync(x =>
                    x.CategorySlug == provider.CategorySlug &&
                    (x.ServiceSlug == provider.ServiceSlug ||
                     provider.AdditionalServices.Contains(x.ServiceSlug!)) &&
                    x.CitySlug == provider.CitySlug &&
                    x.DistrictSlug == provider.DistrictSlug);

            return Results.Ok(ToPanelProfile(provider, matchedNeedCount));
        });

        group.MapGet("/needs", async (
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

            var needs = await dbContext.NeedRequests
                .AsNoTracking()
                .Where(x =>
                    x.CategorySlug == provider.CategorySlug &&
                    (x.ServiceSlug == provider.ServiceSlug ||
                     provider.AdditionalServices.Contains(x.ServiceSlug!)) &&
                    x.CitySlug == provider.CitySlug &&
                    x.DistrictSlug == provider.DistrictSlug)
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
                    x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(needs);
        });

        return app;
    }

    public static IEndpointRouteBuilder MapDevelopmentProviderOwnerEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin");

        group.MapPost("/providers/{id:guid}/link-owner", async (
            Guid id,
            LinkProviderOwnerRequest request,
            AppDbContext dbContext) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return Results.BadRequest(new
                {
                    message = "E-posta zorunludur."
                });
            }

            var normalizedEmail =
                request.Email.Trim().ToLowerInvariant().ToUpperInvariant();

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.NormalizedEmail == normalizedEmail);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Kullanıcı bulunamadı."
                });
            }

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme profili bulunamadı."
                });
            }

            var anotherProvider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.OwnerUserId == user.Id &&
                    x.Id != provider.Id);

            if (anotherProvider is not null)
            {
                return Results.Conflict(new
                {
                    message = "Bu kullanıcı başka bir işletmeye bağlı."
                });
            }

            provider.OwnerUserId = user.Id;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            user.Role = UserRole.Provider;
            user.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                providerId = provider.Id,
                providerSlug = provider.Slug,
                ownerUserId = user.Id,
                user.Email,
                user.DisplayName,
                role = user.Role.ToString().ToLowerInvariant(),
                providerVersion = provider.Version
            });
        });

        return app;
    }

    private static object ToPanelProfile(
        Provider provider,
        int matchedNeedCount)
        => new
        {
            provider.Id,
            provider.Slug,
            provider.BusinessName,
            provider.ShortDescription,
            provider.Description,
            provider.CategorySlug,
            provider.ServiceSlug,
            provider.AdditionalServices,
            provider.CitySlug,
            provider.DistrictSlug,
            provider.PublicPhone,
            provider.PublicWhatsapp,
            provider.PublicAddress,
            provider.WorkingHours,
            provider.ExperienceYears,
            provider.EmergencyService,
            provider.OnsiteService,
            publicationStatus =
                provider.PublicationStatus.ToString().ToLowerInvariant(),
            provider.PublishedAtUtc,
            provider.Version,
            matchedNeedCount
        };

    private static Dictionary<string, string[]> ValidateOwnUpdate(
        UpdateOwnProviderRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.Description?.Trim().Length > 4000)
        {
            errors["description"] =
                ["Detaylı açıklama en fazla 4000 karakter olabilir."];
        }

        if (request.PublicPhone?.Trim().Length > 30)
        {
            errors["publicPhone"] =
                ["Telefon en fazla 30 karakter olabilir."];
        }

        if (request.PublicWhatsapp?.Trim().Length > 30)
        {
            errors["publicWhatsapp"] =
                ["WhatsApp numarası en fazla 30 karakter olabilir."];
        }

        if (request.PublicAddress?.Trim().Length > 500)
        {
            errors["publicAddress"] =
                ["Adres en fazla 500 karakter olabilir."];
        }

        if (request.WorkingHours?.Trim().Length > 500)
        {
            errors["workingHours"] =
                ["Çalışma saatleri en fazla 500 karakter olabilir."];
        }

        if (request.ExperienceYears is < 0 or > 100)
        {
            errors["experienceYears"] =
                ["Deneyim yılı 0 ile 100 arasında olmalıdır."];
        }

        if (request.AdditionalServices.Count > 1)
        {
            errors["additionalServices"] =
                ["En fazla 1 ek hizmet seçebilirsiniz."];
        }

        if (request.AdditionalServices.Any(x =>
            x is not null && x.Trim().Length > 150))
        {
            errors["additionalServices"] =
                ["Ek hizmetlerin her biri en fazla 150 karakter olabilir."];
        }

        return errors;
    }

    private static string? Optional(string? value)
        => string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();

    private static bool TryGetUserId(
        ClaimsPrincipal principal,
        out Guid userId)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out userId);
    }

    private static string ToSlug(string value)
    {
        var normalized = value
            .ToLower(new CultureInfo("tr-TR"))
            .Replace('ı', 'i')
            .Replace('ğ', 'g')
            .Replace('ü', 'u')
            .Replace('ş', 's')
            .Replace('ö', 'o')
            .Replace('ç', 'c')
            .Normalize(NormalizationForm.FormD);

        var builder = new StringBuilder();

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) !=
                UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        return Regex.Replace(
                builder
                    .ToString()
                    .Normalize(NormalizationForm.FormC),
                "[^a-z0-9]+",
                "-")
            .Trim('-');
    }
}

public sealed record LinkProviderOwnerRequest(
    string Email);

public sealed record UpdateOwnProviderRequest(
    int ExpectedVersion,
    string? Description,
    List<string> AdditionalServices,
    string? PublicPhone,
    string? PublicWhatsapp,
    string? PublicAddress,
    string? WorkingHours,
    int? ExperienceYears,
    bool EmergencyService,
    bool OnsiteService);
