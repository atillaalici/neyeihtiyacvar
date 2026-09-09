$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"

New-Item -ItemType Directory -Force "$root\Domain" | Out-Null
New-Item -ItemType Directory -Force "$root\Endpoints" | Out-Null

@'
namespace NeyeIhtiyacVar.Api.Domain;

public enum ProviderApplicationStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}
'@ | Set-Content -Encoding UTF8 "$root\Domain\ProviderApplicationStatus.cs"

@'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string BusinessName { get; set; } = string.Empty;

    public string ShortDescription { get; set; } = string.Empty;

    public string CategorySlug { get; set; } = string.Empty;

    public string ServiceSlug { get; set; } = string.Empty;

    public string CitySlug { get; set; } = string.Empty;

    public string DistrictSlug { get; set; } = string.Empty;

    public string ApplicantName { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string? Whatsapp { get; set; }

    public string? Note { get; set; }

    public ProviderApplicationStatus Status { get; set; } = ProviderApplicationStatus.Pending;

    public string? ReviewNote { get; set; }

    public DateTime? ReviewedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public int Version { get; set; }
}
'@ | Set-Content -Encoding UTF8 "$root\Domain\ProviderApplication.cs"

@'
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderApplicationEndpoints
{
    public static IEndpointRouteBuilder MapProviderApplicationEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/provider-applications");

        group.MapPost("/", async (
            CreateProviderApplication request,
            AppDbContext dbContext) =>
        {
            var errors = await ValidateAsync(request, dbContext);

            if (errors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Gönderilen başvuru bilgileri geçerli değil.",
                    errors
                });
            }

            var application = new ProviderApplication
            {
                BusinessName = request.BusinessName.Trim(),
                ShortDescription = request.ShortDescription.Trim(),
                CategorySlug = request.CategorySlug.Trim(),
                ServiceSlug = request.ServiceSlug.Trim(),
                CitySlug = request.CitySlug.Trim(),
                DistrictSlug = request.DistrictSlug.Trim(),
                ApplicantName = request.ApplicantName.Trim(),
                Phone = request.Phone.Trim(),
                Whatsapp = Optional(request.Whatsapp),
                Note = Optional(request.Note),
                Status = ProviderApplicationStatus.Pending
            };

            dbContext.ProviderApplications.Add(application);
            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/provider-applications/{application.Id}",
                new
                {
                    application.Id,
                    status = application.Status.ToString().ToLowerInvariant(),
                    application.CreatedAtUtc
                });
        });

        return app;
    }

    public static IEndpointRouteBuilder MapAdminProviderWorkflowEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin");

        group.MapGet("/provider-applications", async (
            string? status,
            AppDbContext dbContext) =>
        {
            var query = dbContext.ProviderApplications.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<ProviderApplicationStatus>(
                    status,
                    true,
                    out var parsedStatus))
            {
                query = query.Where(x => x.Status == parsedStatus);
            }

            var items = await query
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.BusinessName,
                    x.ShortDescription,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.ApplicantName,
                    x.Phone,
                    x.Whatsapp,
                    x.Note,
                    status = x.Status.ToString().ToLowerInvariant(),
                    x.ReviewNote,
                    x.ReviewedAtUtc,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    x.Version
                })
                .ToListAsync();

            return Results.Ok(items);
        });

        group.MapPost("/provider-applications/{id:guid}/approve", async (
            Guid id,
            ReviewProviderApplication request,
            AppDbContext dbContext) =>
        {
            var application = await dbContext.ProviderApplications
                .FirstOrDefaultAsync(x => x.Id == id);

            if (application is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme başvurusu bulunamadı."
                });
            }

            if (application.Status == ProviderApplicationStatus.Approved)
            {
                var existing = await dbContext.Providers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.SourceApplicationId == application.Id);

                return Results.Ok(new
                {
                    application.Id,
                    status = application.Status.ToString().ToLowerInvariant(),
                    providerId = existing?.Id,
                    providerSlug = existing?.Slug
                });
            }

            if (application.Status == ProviderApplicationStatus.Rejected)
            {
                return Results.BadRequest(new
                {
                    message = "Reddedilmiş başvuru doğrudan onaylanamaz."
                });
            }

            var providerExists = await dbContext.Providers
                .AnyAsync(x => x.SourceApplicationId == application.Id);

            Provider? provider = null;

            if (!providerExists)
            {
                var baseSlug = ToSlug(application.BusinessName);
                var slug = await CreateUniqueProviderSlugAsync(
                    baseSlug,
                    dbContext);

                provider = new Provider
                {
                    SourceApplicationId = application.Id,
                    Slug = slug,
                    BusinessName = application.BusinessName,
                    ShortDescription = application.ShortDescription,
                    CategorySlug = application.CategorySlug,
                    ServiceSlug = application.ServiceSlug,
                    AdditionalServices = [],
                    CitySlug = application.CitySlug,
                    DistrictSlug = application.DistrictSlug,
                    PublicPhone = application.Phone,
                    PublicWhatsapp = application.Whatsapp,
                    PublicationStatus = PublicationStatus.Draft,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow,
                    Version = 0
                };

                dbContext.Providers.Add(provider);
            }

            application.Status = ProviderApplicationStatus.Approved;
            application.ReviewNote = Optional(request.ReviewNote);
            application.ReviewedAtUtc = DateTime.UtcNow;
            application.UpdatedAtUtc = DateTime.UtcNow;
            application.Version++;

            await dbContext.SaveChangesAsync();

            provider ??= await dbContext.Providers
                .AsNoTracking()
                .FirstAsync(x => x.SourceApplicationId == application.Id);

            return Results.Ok(new
            {
                application.Id,
                status = application.Status.ToString().ToLowerInvariant(),
                providerId = provider.Id,
                providerSlug = provider.Slug,
                providerStatus = provider.PublicationStatus.ToString().ToLowerInvariant()
            });
        });

        group.MapPost("/provider-applications/{id:guid}/reject", async (
            Guid id,
            ReviewProviderApplication request,
            AppDbContext dbContext) =>
        {
            var application = await dbContext.ProviderApplications
                .FirstOrDefaultAsync(x => x.Id == id);

            if (application is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme başvurusu bulunamadı."
                });
            }

            if (application.Status == ProviderApplicationStatus.Approved)
            {
                return Results.BadRequest(new
                {
                    message = "Onaylanmış başvuru reddedilemez."
                });
            }

            application.Status = ProviderApplicationStatus.Rejected;
            application.ReviewNote = Optional(request.ReviewNote);
            application.ReviewedAtUtc = DateTime.UtcNow;
            application.UpdatedAtUtc = DateTime.UtcNow;
            application.Version++;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                application.Id,
                status = application.Status.ToString().ToLowerInvariant()
            });
        });

        group.MapGet("/providers", async (
            string? status,
            AppDbContext dbContext) =>
        {
            var query = dbContext.Providers.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<PublicationStatus>(
                    status,
                    true,
                    out var parsedStatus))
            {
                query = query.Where(x => x.PublicationStatus == parsedStatus);
            }

            var items = await query
                .OrderByDescending(x => x.UpdatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.SourceApplicationId,
                    x.Slug,
                    x.BusinessName,
                    x.ShortDescription,
                    x.Description,
                    x.CategorySlug,
                    x.ServiceSlug,
                    x.AdditionalServices,
                    x.CitySlug,
                    x.DistrictSlug,
                    x.PublicPhone,
                    x.PublicWhatsapp,
                    x.PublicAddress,
                    x.WorkingHours,
                    x.ExperienceYears,
                    x.EmergencyService,
                    x.OnsiteService,
                    publicationStatus = x.PublicationStatus.ToString().ToLowerInvariant(),
                    x.PublishedAtUtc,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc,
                    x.Version
                })
                .ToListAsync();

            return Results.Ok(items);
        });

        group.MapPut("/providers/{id:guid}", async (
            Guid id,
            UpdateProvider request,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme profili bulunamadı."
                });
            }

            if (provider.Version != request.ExpectedVersion)
            {
                return Results.Conflict(new
                {
                    message = "Profil başka bir işlemle değişti. Sayfayı yenileyip tekrar deneyin."
                });
            }

            if (provider.PublicationStatus == PublicationStatus.Published)
            {
                return Results.BadRequest(new
                {
                    message = "Yayındaki profil önce yayından kaldırılmalıdır."
                });
            }

            provider.BusinessName = request.BusinessName.Trim();
            provider.ShortDescription = request.ShortDescription.Trim();
            provider.Description = Optional(request.Description);
            provider.CategorySlug = request.CategorySlug.Trim();
            provider.ServiceSlug = request.ServiceSlug.Trim();
            provider.AdditionalServices = request.AdditionalServices
                .Select(x => x.Trim())
                .Where(x => x.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
            provider.CitySlug = request.CitySlug.Trim();
            provider.DistrictSlug = request.DistrictSlug.Trim();
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

            return Results.Ok(ToAdminProvider(provider));
        });

        group.MapPost("/providers/{id:guid}/publish", async (
            Guid id,
            VersionRequest request,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme profili bulunamadı."
                });
            }

            if (provider.Version != request.ExpectedVersion)
            {
                return Results.Conflict(new
                {
                    message = "Profil başka bir işlemle değişti."
                });
            }

            if (provider.PublicationStatus == PublicationStatus.Published)
            {
                return Results.Ok(ToAdminProvider(provider));
            }

            provider.PublicationStatus = PublicationStatus.Published;
            provider.PublishedAtUtc = DateTime.UtcNow;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            await dbContext.SaveChangesAsync();

            return Results.Ok(ToAdminProvider(provider));
        });

        group.MapPost("/providers/{id:guid}/unpublish", async (
            Guid id,
            VersionRequest request,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.Id == id);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme profili bulunamadı."
                });
            }

            if (provider.Version != request.ExpectedVersion)
            {
                return Results.Conflict(new
                {
                    message = "Profil başka bir işlemle değişti."
                });
            }

            provider.PublicationStatus = PublicationStatus.Unpublished;
            provider.UpdatedAtUtc = DateTime.UtcNow;
            provider.Version++;

            await dbContext.SaveChangesAsync();

            return Results.Ok(ToAdminProvider(provider));
        });

        return app;
    }

    private static async Task<Dictionary<string, string[]>> ValidateAsync(
        CreateProviderApplication request,
        AppDbContext dbContext)
    {
        var errors = new Dictionary<string, string[]>();

        Required(errors, "businessName", request.BusinessName, 200, "İşletme adı");
        Required(errors, "shortDescription", request.ShortDescription, 300, "Kısa açıklama");
        Required(errors, "categorySlug", request.CategorySlug, 100, "Kategori");
        Required(errors, "serviceSlug", request.ServiceSlug, 150, "Hizmet");
        Required(errors, "citySlug", request.CitySlug, 100, "İl");
        Required(errors, "districtSlug", request.DistrictSlug, 100, "İlçe");
        Required(errors, "applicantName", request.ApplicantName, 150, "Başvuran adı");
        Required(errors, "phone", request.Phone, 30, "Telefon");

        if (errors.Count > 0)
        {
            return errors;
        }

        var categoryExists = await dbContext.Categories
            .AsNoTracking()
            .AnyAsync(x => x.Slug == request.CategorySlug && x.IsActive);

        if (!categoryExists)
        {
            errors["categorySlug"] = ["Geçerli bir kategori seçin."];
        }

        var city = await dbContext.Cities
            .AsNoTracking()
            .Include(x => x.Districts)
            .FirstOrDefaultAsync(x => x.Slug == request.CitySlug && x.IsActive);

        if (city is null)
        {
            errors["citySlug"] = ["Geçerli bir il seçin."];
        }
        else if (!city.Districts.Any(x =>
                     x.Slug == request.DistrictSlug &&
                     x.IsActive))
        {
            errors["districtSlug"] = ["Seçilen ilçenin ile ait olduğunu kontrol edin."];
        }

        return errors;
    }

    private static void Required(
        Dictionary<string, string[]> errors,
        string key,
        string? value,
        int maxLength,
        string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{label} zorunludur."];
        }
        else if (value.Trim().Length > maxLength)
        {
            errors[key] = [$"{label} en fazla {maxLength} karakter olabilir."];
        }
    }

    private static string? Optional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static async Task<string> CreateUniqueProviderSlugAsync(
        string baseSlug,
        AppDbContext dbContext)
    {
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = "isletme";
        }

        var candidate = baseSlug;
        var suffix = 2;

        while (await dbContext.Providers.AnyAsync(x => x.Slug == candidate))
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        }

        return candidate;
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

    private static object ToAdminProvider(Provider provider)
        => new
        {
            provider.Id,
            provider.SourceApplicationId,
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
            publicationStatus = provider.PublicationStatus.ToString().ToLowerInvariant(),
            provider.PublishedAtUtc,
            provider.CreatedAtUtc,
            provider.UpdatedAtUtc,
            provider.Version
        };
}

public sealed record CreateProviderApplication(
    string BusinessName,
    string ShortDescription,
    string CategorySlug,
    string ServiceSlug,
    string CitySlug,
    string DistrictSlug,
    string ApplicantName,
    string Phone,
    string? Whatsapp,
    string? Note);

public sealed record ReviewProviderApplication(
    string? ReviewNote);

public sealed record VersionRequest(
    int ExpectedVersion);

public sealed record UpdateProvider(
    int ExpectedVersion,
    string BusinessName,
    string ShortDescription,
    string? Description,
    string CategorySlug,
    string ServiceSlug,
    string[] AdditionalServices,
    string CitySlug,
    string DistrictSlug,
    string? PublicPhone,
    string? PublicWhatsapp,
    string? PublicAddress,
    string? WorkingHours,
    int? ExperienceYears,
    bool EmergencyService,
    bool OnsiteService);
'@ | Set-Content -Encoding UTF8 "$root\Endpoints\ProviderApplicationEndpoints.cs"

$appDbPath = "$root\Infrastructure\AppDbContext.cs"

$appDb = @'
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options)
{
    public DbSet<NeedRequest> NeedRequests => Set<NeedRequest>();

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<CategoryService> CategoryServices => Set<CategoryService>();

    public DbSet<City> Cities => Set<City>();

    public DbSet<District> Districts => Set<District>();

    public DbSet<Provider> Providers => Set<Provider>();

    public DbSet<ProviderApplication> ProviderApplications => Set<ProviderApplication>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();

            entity.Property(x => x.Slug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.Name)
                .HasMaxLength(150)
                .IsRequired();
        });

        modelBuilder.Entity<CategoryService>(entity =>
        {
            entity.Property(x => x.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.HasOne(x => x.Category)
                .WithMany(x => x.Services)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<City>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();

            entity.Property(x => x.Slug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.Name)
                .HasMaxLength(150)
                .IsRequired();
        });

        modelBuilder.Entity<District>(entity =>
        {
            entity.Property(x => x.Slug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.HasIndex(x => new
            {
                x.CityId,
                x.Slug
            }).IsUnique();

            entity.HasOne(x => x.City)
                .WithMany(x => x.Districts)
                .HasForeignKey(x => x.CityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Provider>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.HasIndex(x => x.SourceApplicationId).IsUnique();
            entity.HasIndex(x => x.PublicationStatus);

            entity.HasIndex(x => new
            {
                x.CitySlug,
                x.DistrictSlug
            });

            entity.HasIndex(x => new
            {
                x.CategorySlug,
                x.ServiceSlug
            });

            entity.Property(x => x.Slug)
                .HasMaxLength(180)
                .IsRequired();

            entity.Property(x => x.BusinessName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.ShortDescription)
                .HasMaxLength(300)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(4000);

            entity.Property(x => x.CategorySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.ServiceSlug)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.CitySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.DistrictSlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.PublicPhone)
                .HasMaxLength(30);

            entity.Property(x => x.PublicWhatsapp)
                .HasMaxLength(30);

            entity.Property(x => x.PublicAddress)
                .HasMaxLength(500);

            entity.Property(x => x.WorkingHours)
                .HasMaxLength(500);

            entity.Property(x => x.PublishedBy)
                .HasMaxLength(200);

            entity.Property(x => x.PublicationStatus)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(x => x.Version)
                .IsConcurrencyToken();
        });

        modelBuilder.Entity<ProviderApplication>(entity =>
        {
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.CreatedAtUtc);

            entity.Property(x => x.BusinessName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.ShortDescription)
                .HasMaxLength(300)
                .IsRequired();

            entity.Property(x => x.CategorySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.ServiceSlug)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.CitySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.DistrictSlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.ApplicantName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.Phone)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.Whatsapp)
                .HasMaxLength(30);

            entity.Property(x => x.Note)
                .HasMaxLength(2000);

            entity.Property(x => x.ReviewNote)
                .HasMaxLength(2000);

            entity.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(x => x.Version)
                .IsConcurrencyToken();
        });
    }
}
'@

Set-Content -Encoding UTF8 $appDbPath $appDb

$programPath = "$root\Program.cs"
$program = Get-Content -Raw -Encoding UTF8 $programPath

if ($program -notmatch 'MapProviderApplicationEndpoints\(\)') {
    $program = $program -replace `
        'app\.MapProviderEndpoints\(\);', `
        "app.MapProviderEndpoints();`r`napp.MapProviderApplicationEndpoints();"
}

if ($program -notmatch 'MapAdminProviderWorkflowEndpoints\(\)') {
    $program = $program -replace `
        'app\.MapProviderApplicationEndpoints\(\);', `
        "app.MapProviderApplicationEndpoints();`r`n`r`nif (app.Environment.IsDevelopment())`r`n{`r`n    app.MapAdminProviderWorkflowEndpoints();`r`n}"
}

Set-Content -Encoding UTF8 $programPath $program

Write-Host ""
Write-Host "Basvuru -> admin onay -> profil -> yayin akisinin backend altyapisi hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "ONEMLI: /api/admin endpointleri su an yalnizca Development ortaminda acilir." -ForegroundColor Yellow
Write-Host "Production auth sonraki asamada eklenecek." -ForegroundColor Yellow
Write-Host ""
Write-Host "Simdi sadece: dotnet build" -ForegroundColor Cyan
