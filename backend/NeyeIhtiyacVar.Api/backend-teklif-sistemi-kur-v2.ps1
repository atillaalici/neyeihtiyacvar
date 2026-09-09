$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"

function Write-Utf8NoBom([string]$path, [string]$content) {
    $directory = [System.IO.Path]::GetDirectoryName($path)
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    }

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

    public Guid? OwnerUserId { get; set; }

    public AppUser? OwnerUser { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string District { get; set; } = string.Empty;

    public string? CategorySlug { get; set; }

    public string? ServiceSlug { get; set; }

    public string? CitySlug { get; set; }

    public string? DistrictSlug { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<ProviderOffer> Offers { get; set; } = [];
}
'@

$offerStatus = @'
namespace NeyeIhtiyacVar.Api.Domain;

public enum OfferStatus
{
    Pending = 0,
    Accepted = 1,
    Rejected = 2,
    Withdrawn = 3
}
'@

$providerOffer = @'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderOffer
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NeedRequestId { get; set; }

    public NeedRequest NeedRequest { get; set; } = null!;

    public Guid ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public string Message { get; set; } = string.Empty;

    public decimal? Price { get; set; }

    public OfferStatus Status { get; set; } = OfferStatus.Pending;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
'@

$appDbContext = @'
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

    public DbSet<AppUser> Users => Set<AppUser>();

    public DbSet<ProviderOffer> ProviderOffers => Set<ProviderOffer>();

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
            entity.HasIndex(x => x.OwnerUserId).IsUnique();
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

            entity.HasOne(x => x.OwnerUser)
                .WithOne()
                .HasForeignKey<Provider>(x => x.OwnerUserId)
                .OnDelete(DeleteBehavior.SetNull);
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

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasIndex(x => x.NormalizedEmail).IsUnique();

            entity.Property(x => x.Email)
                .HasMaxLength(254)
                .IsRequired();

            entity.Property(x => x.NormalizedEmail)
                .HasMaxLength(254)
                .IsRequired();

            entity.Property(x => x.PasswordHash)
                .HasMaxLength(1000)
                .IsRequired();

            entity.Property(x => x.DisplayName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.Role)
                .HasConversion<string>()
                .HasMaxLength(20);
        });

        modelBuilder.Entity<NeedRequest>(entity =>
        {
            entity.HasIndex(x => x.OwnerUserId);

            entity.Property(x => x.Title)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(x => x.Category)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.City)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.District)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.CategorySlug)
                .HasMaxLength(100);

            entity.Property(x => x.ServiceSlug)
                .HasMaxLength(150);

            entity.Property(x => x.CitySlug)
                .HasMaxLength(100);

            entity.Property(x => x.DistrictSlug)
                .HasMaxLength(100);

            entity.HasOne(x => x.OwnerUser)
                .WithMany()
                .HasForeignKey(x => x.OwnerUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProviderOffer>(entity =>
        {
            entity.HasIndex(x => new
            {
                x.NeedRequestId,
                x.ProviderId
            }).IsUnique();

            entity.HasIndex(x => x.Status);

            entity.Property(x => x.Message)
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(x => x.Price)
                .HasPrecision(12, 2);

            entity.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(x => x.NeedRequest)
                .WithMany(x => x.Offers)
                .HasForeignKey(x => x.NeedRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Provider)
                .WithMany()
                .HasForeignKey(x => x.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
'@

$needEndpoints = @'
using System.Globalization;
using System.Security.Claims;
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
            ClaimsPrincipal principal,
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

            Guid? ownerUserId = null;
            var userIdValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (Guid.TryParse(userIdValue, out var parsedUserId))
            {
                ownerUserId = parsedUserId;
            }

            var needRequest = new NeedRequest
            {
                OwnerUserId = ownerUserId,
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

$offerEndpoints = @'
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

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
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == needId);

            if (need is null)
            {
                return Results.NotFound(new
                {
                    message = "İhtiyaç talebi bulunamadı."
                });
            }

            var exactMatch =
                need.CategorySlug == provider.CategorySlug &&
                need.ServiceSlug == provider.ServiceSlug &&
                need.CitySlug == provider.CitySlug &&
                need.DistrictSlug == provider.DistrictSlug;

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
                    message = "Bu ihtiyaç talebine zaten teklif verdiniz."
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

            var offer = new ProviderOffer
            {
                NeedRequestId = need.Id,
                ProviderId = provider.Id,
                Message = message,
                Price = request.Price,
                Status = OfferStatus.Pending
            };

            dbContext.ProviderOffers.Add(offer);
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
                    x.CreatedAtUtc,
                    offerCount = x.Offers.Count
                })
                .ToListAsync();

            return Results.Ok(needs);
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

                offer.UpdatedAtUtc = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                offerId = selectedOffer.Id,
                status = "accepted"
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

            if (offer.Status == OfferStatus.Accepted)
            {
                return Results.BadRequest(new
                {
                    message = "Kabul edilmiş teklif reddedilemez."
                });
            }

            offer.Status = OfferStatus.Rejected;
            offer.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                offerId = offer.Id,
                status = "rejected"
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
'@

Write-Utf8NoBom "$root\Domain\NeedRequest.cs" $needRequest
Write-Utf8NoBom "$root\Domain\OfferStatus.cs" $offerStatus
Write-Utf8NoBom "$root\Domain\ProviderOffer.cs" $providerOffer
Write-Utf8NoBom "$root\Infrastructure\AppDbContext.cs" $appDbContext
Write-Utf8NoBom "$root\Endpoints\NeedRequestEndpoints.cs" $needEndpoints
Write-Utf8NoBom "$root\Endpoints\OfferEndpoints.cs" $offerEndpoints

$programPath = Join-Path $root "Program.cs"
$program = Get-Content -Raw -Encoding UTF8 $programPath

if ($program -notmatch 'MapOfferEndpoints\(\)') {
    $program = $program -replace `
        'app\.MapProviderPanelEndpoints\(\);', `
        "app.MapProviderPanelEndpoints();`r`napp.MapOfferEndpoints();"
}

Write-Utf8NoBom $programPath $program

Write-Host ""
Write-Host "Teklif sistemi v2 basariyla hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Eklenenler:" -ForegroundColor Cyan
Write-Host "  NeedRequests.OwnerUserId"
Write-Host "  ProviderOffers tablosu"
Write-Host "  Giris yapmis kullanicinin yeni ihtiyaci hesabina baglanir"
Write-Host "  Isletme teklif verebilir"
Write-Host "  Kullanici kendi taleplerini ve teklifleri gorebilir"
Write-Host "  Teklif kabul / ret altyapisi"
Write-Host ""
Write-Host "Simdi sadece: dotnet build" -ForegroundColor Yellow
