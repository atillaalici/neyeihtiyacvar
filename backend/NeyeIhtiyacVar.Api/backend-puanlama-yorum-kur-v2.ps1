$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"

function Write-Utf8NoBom([string]$path, [string]$content) {
    $dir = [System.IO.Path]::GetDirectoryName($path)
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    [System.IO.File]::WriteAllText(
        $path,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

$providerReview = @'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderReview
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NeedRequestId { get; set; }

    public NeedRequest NeedRequest { get; set; } = null!;

    public Guid ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public int Rating { get; set; }

    public string Comment { get; set; } = string.Empty;

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

    public DbSet<ProviderReview> ProviderReviews => Set<ProviderReview>();

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
            entity.HasIndex(x => x.Status);

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

            entity.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

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

        modelBuilder.Entity<ProviderReview>(entity =>
        {
            entity.HasIndex(x => x.NeedRequestId).IsUnique();
            entity.HasIndex(x => x.ProviderId);
            entity.HasIndex(x => x.UserId);

            entity.Property(x => x.Rating)
                .IsRequired();

            entity.Property(x => x.Comment)
                .HasMaxLength(2000)
                .IsRequired();

            entity.HasOne(x => x.NeedRequest)
                .WithMany()
                .HasForeignKey(x => x.NeedRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Provider)
                .WithMany()
                .HasForeignKey(x => x.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
'@

$reviewEndpoints = @'
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ReviewEndpoints
{
    public static IEndpointRouteBuilder MapReviewEndpoints(
        this IEndpointRouteBuilder app)
    {
        var myNeeds = app
            .MapGroup("/api/my-needs")
            .RequireAuthorization();

        myNeeds.MapGet("/{needId:guid}/review", async (
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

            var review = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x =>
                    x.NeedRequestId == needId &&
                    x.UserId == userId)
                .Select(x => new
                {
                    x.Id,
                    x.NeedRequestId,
                    x.ProviderId,
                    providerSlug = x.Provider.Slug,
                    businessName = x.Provider.BusinessName,
                    x.Rating,
                    x.Comment,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc
                })
                .FirstOrDefaultAsync();

            return review is null
                ? Results.NoContent()
                : Results.Ok(review);
        });

        myNeeds.MapPost("/{needId:guid}/review", async (
            Guid needId,
            CreateProviderReviewRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            if (!TryGetUserId(principal, out var userId))
            {
                return Results.Unauthorized();
            }

            var need = await dbContext.NeedRequests
                .AsNoTracking()
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

            if (need.Status != NeedStatus.Completed)
            {
                return Results.BadRequest(new
                {
                    message = "Yalnızca sonuçlanmış talepler değerlendirilebilir."
                });
            }

            var acceptedOffer = await dbContext.ProviderOffers
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.NeedRequestId == needId &&
                    x.Status == OfferStatus.Accepted);

            if (acceptedOffer is null)
            {
                return Results.BadRequest(new
                {
                    message = "Bu talep için kabul edilmiş teklif bulunamadı."
                });
            }

            var alreadyReviewed = await dbContext.ProviderReviews
                .AnyAsync(x => x.NeedRequestId == needId);

            if (alreadyReviewed)
            {
                return Results.Conflict(new
                {
                    message = "Bu talep için daha önce değerlendirme yaptınız."
                });
            }

            if (request.Rating is < 1 or > 5)
            {
                return Results.BadRequest(new
                {
                    message = "Puan 1 ile 5 arasında olmalıdır."
                });
            }

            var comment = request.Comment?.Trim() ?? string.Empty;

            if (comment.Length < 3 || comment.Length > 2000)
            {
                return Results.BadRequest(new
                {
                    message = "Yorum 3 ile 2000 karakter arasında olmalıdır."
                });
            }

            var now = DateTime.UtcNow;

            var review = new ProviderReview
            {
                NeedRequestId = need.Id,
                ProviderId = acceptedOffer.ProviderId,
                UserId = userId,
                Rating = request.Rating,
                Comment = comment,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            dbContext.ProviderReviews.Add(review);
            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/my-needs/{need.Id}/review",
                new
                {
                    review.Id,
                    review.NeedRequestId,
                    review.ProviderId,
                    review.Rating,
                    review.Comment,
                    review.CreatedAtUtc
                });
        });

        app.MapGet("/api/providers/{slug}/reviews", async (
            string slug,
            AppDbContext dbContext) =>
        {
            var provider = await dbContext.Providers
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Slug == slug &&
                    x.PublicationStatus == PublicationStatus.Published);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "İşletme bulunamadı."
                });
            }

            var summary = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    averageRating = g.Average(x => x.Rating),
                    reviewCount = g.Count()
                })
                .FirstOrDefaultAsync();

            var reviews = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.Rating,
                    x.Comment,
                    reviewerName = x.User.DisplayName,
                    x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(new
            {
                providerId = provider.Id,
                providerSlug = provider.Slug,
                averageRating = summary?.averageRating ?? 0,
                reviewCount = summary?.reviewCount ?? 0,
                reviews
            });
        });

        var providerPanel = app
            .MapGroup("/api/provider-panel")
            .RequireAuthorization();

        providerPanel.MapGet("/reviews", async (
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

            var summary = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    averageRating = g.Average(x => x.Rating),
                    reviewCount = g.Count()
                })
                .FirstOrDefaultAsync();

            var reviews = await dbContext.ProviderReviews
                .AsNoTracking()
                .Where(x => x.ProviderId == provider.Id)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.NeedRequestId,
                    needTitle = x.NeedRequest.Title,
                    x.Rating,
                    x.Comment,
                    reviewerName = x.User.DisplayName,
                    x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(new
            {
                providerId = provider.Id,
                averageRating = summary?.averageRating ?? 0,
                reviewCount = summary?.reviewCount ?? 0,
                reviews
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

public sealed record CreateProviderReviewRequest(
    int Rating,
    string? Comment);
'@

$program = @'
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Endpoints;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Auth;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "http://localhost:3001")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString =
        builder.Configuration.GetConnectionString("DefaultConnection");

    options.UseNpgsql(connectionString);
});

builder.Services.Configure<JwtOptions>(
    builder.Configuration.GetSection(JwtOptions.SectionName));

var jwtOptions =
    builder.Configuration.GetSection(JwtOptions.SectionName)
        .Get<JwtOptions>()
    ?? new JwtOptions();

if (string.IsNullOrWhiteSpace(jwtOptions.Key) ||
    jwtOptions.Key.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key en az 32 karakter olmalıdır. Development için dotnet user-secrets, production için Jwt__Key environment variable kullanın.");
}

builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services.AddScoped<JwtTokenService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await SeedData.InitializeAsync(dbContext);
}

app.MapGet("/", () => Results.Ok(new
{
    project = "Neye İhtiyaç Var",
    status = "running",
    environment = app.Environment.EnvironmentName
}));

app.MapHealthEndpoints();
app.MapNeedRequestEndpoints();
app.MapCatalogEndpoints();
app.MapLocationEndpoints();
app.MapProviderEndpoints();
app.MapProviderApplicationEndpoints();
app.MapAuthEndpoints();
app.MapProviderPanelEndpoints();
app.MapOfferEndpoints();
app.MapReviewEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapAdminProviderWorkflowEndpoints();
    app.MapDevelopmentProviderOwnerEndpoints();
}

app.Run();
'@

Write-Utf8NoBom "$root\Domain\ProviderReview.cs" $providerReview
Write-Utf8NoBom "$root\Infrastructure\AppDbContext.cs" $appDbContext
Write-Utf8NoBom "$root\Endpoints\ReviewEndpoints.cs" $reviewEndpoints
Write-Utf8NoBom "$root\Program.cs" $program

Write-Host ""
Write-Host "Puanlama ve yorum altyapisi v2 ile tamamlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Duzeltilen dosyalar:" -ForegroundColor Cyan
Write-Host "  Domain\ProviderReview.cs"
Write-Host "  Infrastructure\AppDbContext.cs"
Write-Host "  Endpoints\ReviewEndpoints.cs"
Write-Host "  Program.cs"
Write-Host ""
Write-Host "Simdi sadece: dotnet build" -ForegroundColor Yellow
