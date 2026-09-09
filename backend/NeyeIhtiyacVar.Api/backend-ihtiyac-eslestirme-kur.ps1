$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"

function Write-Utf8NoBom([string]$path, [string]$content) {
    [System.IO.File]::WriteAllText(
        $path,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

$needRequest = @'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class NeedRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    // Kullanıcıya gösterilecek okunabilir değerler.
    public string Category { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string District { get; set; } = string.Empty;

    // Eşleştirme ve filtreleme için normalize edilmiş kodlar.
    // Nullable tutuluyor; böylece daha önce oluşturulmuş eski talepler
    // migration sırasında bozulmadan korunur.
    public string? CategorySlug { get; set; }

    public string? ServiceSlug { get; set; }

    public string? CitySlug { get; set; }

    public string? DistrictSlug { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
'@

$endpoints = @'
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class NeedRequestEndpoints
{
    public static IEndpointRouteBuilder MapNeedRequestEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/needs");

        group.MapGet("/", async (AppDbContext dbContext) =>
        {
            var requests = await dbContext.NeedRequests
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToListAsync();

            return Results.Ok(requests);
        });

        group.MapGet("/{id:guid}", async (
            Guid id,
            AppDbContext dbContext) =>
        {
            var request = await dbContext.NeedRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (request is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            return Results.Ok(request);
        });

        group.MapGet("/{id:guid}/matches", async (
            Guid id,
            AppDbContext dbContext) =>
        {
            var request = await dbContext.NeedRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (request is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            if (string.IsNullOrWhiteSpace(request.CategorySlug) ||
                string.IsNullOrWhiteSpace(request.ServiceSlug) ||
                string.IsNullOrWhiteSpace(request.CitySlug) ||
                string.IsNullOrWhiteSpace(request.DistrictSlug))
            {
                return Results.Ok(new
                {
                    requestId = request.Id,
                    matchType = "exact",
                    count = 0,
                    providers = Array.Empty<object>(),
                    message = "Bu eski talepte eşleştirme kodları bulunmuyor."
                });
            }

            var providers = await dbContext.Providers
                .AsNoTracking()
                .Where(x =>
                    x.PublicationStatus == PublicationStatus.Published &&
                    x.CategorySlug == request.CategorySlug &&
                    x.ServiceSlug == request.ServiceSlug &&
                    x.CitySlug == request.CitySlug &&
                    x.DistrictSlug == request.DistrictSlug)
                .OrderBy(x => x.BusinessName)
                .Select(x => new
                {
                    x.Id,
                    x.Slug,
                    x.BusinessName,
                    x.ShortDescription,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.PublicPhone,
                    x.PublicWhatsapp
                })
                .ToListAsync();

            return Results.Ok(new
            {
                requestId = request.Id,
                matchType = "exact",
                count = providers.Count,
                providers
            });
        });

        group.MapPost("/", async (
            CreateNeedRequest request,
            AppDbContext dbContext) =>
        {
            var validationErrors = Validate(request);

            if (validationErrors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Gönderilen bilgiler geçerli değil.",
                    errors = validationErrors
                });
            }

            var category = await dbContext.Categories
                .AsNoTracking()
                .Include(x => x.Services)
                .FirstOrDefaultAsync(x =>
                    x.Slug == request.CategorySlug.Trim() &&
                    x.IsActive);

            if (category is null)
            {
                validationErrors["categorySlug"] =
                    ["Geçerli bir kategori seçin."];
            }

            CategoryService? service = null;

            if (category is not null)
            {
                service = category.Services
                    .Where(x => x.IsActive)
                    .FirstOrDefault(x =>
                        ToSlug(x.Name) == request.ServiceSlug.Trim());

                if (service is null)
                {
                    validationErrors["serviceSlug"] =
                        ["Seçilen kategoriye ait geçerli bir hizmet seçin."];
                }
            }

            var city = await dbContext.Cities
                .AsNoTracking()
                .Include(x => x.Districts)
                .FirstOrDefaultAsync(x =>
                    x.Slug == request.CitySlug.Trim() &&
                    x.IsActive);

            District? district = null;

            if (city is null)
            {
                validationErrors["citySlug"] =
                    ["Geçerli bir il seçin."];
            }
            else
            {
                district = city.Districts
                    .FirstOrDefault(x =>
                        x.Slug == request.DistrictSlug.Trim() &&
                        x.IsActive);

                if (district is null)
                {
                    validationErrors["districtSlug"] =
                        ["Seçilen ilçenin ile ait olduğunu kontrol edin."];
                }
            }

            if (validationErrors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Gönderilen bilgiler geçerli değil.",
                    errors = validationErrors
                });
            }

            var needRequest = new NeedRequest
            {
                Title = request.Title.Trim(),
                Description = request.Description.Trim(),
                Category = category!.Name,
                City = city!.Name,
                District = district!.Name,
                CategorySlug = category.Slug,
                ServiceSlug = request.ServiceSlug.Trim(),
                CitySlug = city.Slug,
                DistrictSlug = district.Slug
            };

            dbContext.NeedRequests.Add(needRequest);
            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/needs/{needRequest.Id}",
                needRequest);
        });

        return app;
    }

    private static Dictionary<string, string[]> Validate(
        CreateNeedRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            errors["title"] = ["Başlık zorunludur."];
        }
        else if (request.Title.Trim().Length > 150)
        {
            errors["title"] = ["Başlık en fazla 150 karakter olabilir."];
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            errors["description"] = ["Açıklama zorunludur."];
        }
        else if (request.Description.Trim().Length > 2000)
        {
            errors["description"] =
                ["Açıklama en fazla 2000 karakter olabilir."];
        }

        ValidateSlug(
            errors,
            "categorySlug",
            request.CategorySlug,
            "Kategori");

        ValidateSlug(
            errors,
            "serviceSlug",
            request.ServiceSlug,
            "Hizmet");

        ValidateSlug(
            errors,
            "citySlug",
            request.CitySlug,
            "İl");

        ValidateSlug(
            errors,
            "districtSlug",
            request.DistrictSlug,
            "İlçe");

        return errors;
    }

    private static void ValidateSlug(
        Dictionary<string, string[]> errors,
        string key,
        string? value,
        string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{label} zorunludur."];
            return;
        }

        var trimmed = value.Trim();

        if (trimmed.Length > 150)
        {
            errors[key] = [$"{label} kodu çok uzun."];
            return;
        }

        if (!Regex.IsMatch(
                trimmed,
                "^[a-z0-9]+(?:-[a-z0-9]+)*$"))
        {
            errors[key] =
                [$"{label} kodu geçerli slug formatında olmalıdır."];
        }
    }

    private static string ToSlug(string value)
    {
        value = value
            .Replace('ı', 'i')
            .Replace('İ', 'I')
            .Replace('ğ', 'g')
            .Replace('Ğ', 'G')
            .Replace('ü', 'u')
            .Replace('Ü', 'U')
            .Replace('ş', 's')
            .Replace('Ş', 'S')
            .Replace('ö', 'o')
            .Replace('Ö', 'O')
            .Replace('ç', 'c')
            .Replace('Ç', 'C');

        var normalized = value
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

        var ascii = builder
            .ToString()
            .Normalize(NormalizationForm.FormC)
            .ToLowerInvariant();

        ascii = Regex.Replace(ascii, "[^a-z0-9]+", "-");

        return ascii.Trim('-');
    }
}

public sealed record CreateNeedRequest(
    string Title,
    string Description,
    string CategorySlug,
    string ServiceSlug,
    string CitySlug,
    string DistrictSlug);
'@

Write-Utf8NoBom "$root\Domain\NeedRequest.cs" $needRequest
Write-Utf8NoBom "$root\Endpoints\NeedRequestEndpoints.cs" $endpoints

Write-Host ""
Write-Host "Ihtiyac taleplerine eslestirme alanlari ve exact match endpointi eklendi." -ForegroundColor Green
Write-Host ""
Write-Host "Yeni endpoint:" -ForegroundColor Cyan
Write-Host "  GET /api/needs/{id}/matches"
Write-Host ""
Write-Host "Eski talepler korunur; yeni slug alanlari nullable olarak eklenecek." -ForegroundColor Yellow
Write-Host ""
Write-Host "Simdi sadece: dotnet build" -ForegroundColor Cyan
