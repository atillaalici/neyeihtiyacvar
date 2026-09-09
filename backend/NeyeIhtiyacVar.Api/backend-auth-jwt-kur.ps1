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

Write-Host "JWT paketi ekleniyor..." -ForegroundColor Cyan
dotnet add "$root\NeyeIhtiyacVar.Api.csproj" package Microsoft.AspNetCore.Authentication.JwtBearer --version 10.0.11
if ($LASTEXITCODE -ne 0) {
    throw "Microsoft.AspNetCore.Authentication.JwtBearer paketi eklenemedi."
}

$userRole = @'
namespace NeyeIhtiyacVar.Api.Domain;

public enum UserRole
{
    User = 0,
    Provider = 1,
    Admin = 2
}
'@

$appUser = @'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Email { get; set; } = string.Empty;

    public string NormalizedEmail { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.User;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
'@

$jwtOptions = @'
namespace NeyeIhtiyacVar.Api.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "NeyeIhtiyacVar.Api";

    public string Audience { get; set; } = "NeyeIhtiyacVar.Frontend";

    public string Key { get; set; } = string.Empty;

    public int ExpirationMinutes { get; set; } = 480;
}
'@

$jwtTokenService = @'
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NeyeIhtiyacVar.Api.Domain;

namespace NeyeIhtiyacVar.Api.Infrastructure.Auth;

public sealed class JwtTokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions _options = options.Value;

    public TokenResult CreateToken(AppUser user)
    {
        var now = DateTime.UtcNow;
        var expiresAtUtc = now.AddMinutes(_options.ExpirationMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var signingKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_options.Key));

        var credentials = new SigningCredentials(
            signingKey,
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new TokenResult(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAtUtc);
    }
}

public sealed record TokenResult(
    string AccessToken,
    DateTime ExpiresAtUtc);
'@

$authEndpoints = @'
using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Auth;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", async (
            RegisterRequest request,
            AppDbContext dbContext,
            IPasswordHasher<AppUser> passwordHasher,
            JwtTokenService tokenService) =>
        {
            var validationErrors = ValidateRegister(request);

            if (validationErrors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Kayıt bilgileri geçerli değil.",
                    errors = validationErrors
                });
            }

            var email = request.Email.Trim().ToLowerInvariant();
            var normalizedEmail = email.ToUpperInvariant();

            var exists = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(x => x.NormalizedEmail == normalizedEmail);

            if (exists)
            {
                return Results.Conflict(new
                {
                    message = "Bu e-posta adresiyle daha önce hesap oluşturulmuş."
                });
            }

            var user = new AppUser
            {
                Email = email,
                NormalizedEmail = normalizedEmail,
                DisplayName = request.DisplayName.Trim(),
                Role = UserRole.User,
                IsActive = true
            };

            user.PasswordHash = passwordHasher.HashPassword(
                user,
                request.Password);

            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync();

            var token = tokenService.CreateToken(user);

            return Results.Created(
                $"/api/auth/users/{user.Id}",
                ToAuthResponse(user, token));
        });

        group.MapPost("/login", async (
            LoginRequest request,
            AppDbContext dbContext,
            IPasswordHasher<AppUser> passwordHasher,
            JwtTokenService tokenService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest(new
                {
                    message = "E-posta ve şifre zorunludur."
                });
            }

            var normalizedEmail =
                request.Email.Trim().ToLowerInvariant().ToUpperInvariant();

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.NormalizedEmail == normalizedEmail);

            if (user is null || !user.IsActive)
            {
                return Results.Unauthorized();
            }

            var result = passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.Password);

            if (result == PasswordVerificationResult.Failed)
            {
                return Results.Unauthorized();
            }

            if (result == PasswordVerificationResult.SuccessRehashNeeded)
            {
                user.PasswordHash = passwordHasher.HashPassword(
                    user,
                    request.Password);

                user.UpdatedAtUtc = DateTime.UtcNow;

                await dbContext.SaveChangesAsync();
            }

            var token = tokenService.CreateToken(user);

            return Results.Ok(ToAuthResponse(user, token));
        });

        group.MapGet("/me", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var idValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(idValue, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == userId && x.IsActive);

            if (user is null)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                role = user.Role.ToString().ToLowerInvariant()
            });
        })
        .RequireAuthorization();

        return app;
    }

    private static Dictionary<string, string[]> ValidateRegister(
        RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            errors["displayName"] = ["Ad soyad zorunludur."];
        }
        else if (request.DisplayName.Trim().Length > 150)
        {
            errors["displayName"] = ["Ad soyad en fazla 150 karakter olabilir."];
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            errors["email"] = ["E-posta zorunludur."];
        }
        else
        {
            var email = request.Email.Trim();

            if (email.Length > 254 ||
                !Regex.IsMatch(
                    email,
                    "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
                    RegexOptions.CultureInvariant))
            {
                errors["email"] = ["Geçerli bir e-posta adresi yazın."];
            }
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            errors["password"] = ["Şifre zorunludur."];
        }
        else
        {
            var password = request.Password;

            if (password.Length < 8)
            {
                errors["password"] = ["Şifre en az 8 karakter olmalıdır."];
            }
            else if (password.Length > 128)
            {
                errors["password"] = ["Şifre en fazla 128 karakter olabilir."];
            }
            else if (!password.Any(char.IsUpper) ||
                     !password.Any(char.IsLower) ||
                     !password.Any(char.IsDigit))
            {
                errors["password"] =
                ["Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir."];
            }
        }

        return errors;
    }

    private static object ToAuthResponse(
        AppUser user,
        TokenResult token)
        => new
        {
            accessToken = token.AccessToken,
            token.ExpiresAtUtc,
            user = new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                role = user.Role.ToString().ToLowerInvariant()
            }
        };
}

public sealed record RegisterRequest(
    string DisplayName,
    string Email,
    string Password);

public sealed record LoginRequest(
    string Email,
    string Password);
'@

$provider = @'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class Provider
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? SourceApplicationId { get; set; }

    public Guid? OwnerUserId { get; set; }

    public AppUser? OwnerUser { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string BusinessName { get; set; } = string.Empty;

    public string ShortDescription { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string CategorySlug { get; set; } = string.Empty;

    public string ServiceSlug { get; set; } = string.Empty;

    public string[] AdditionalServices { get; set; } = [];

    public string CitySlug { get; set; } = string.Empty;

    public string DistrictSlug { get; set; } = string.Empty;

    public string? PublicPhone { get; set; }

    public string? PublicWhatsapp { get; set; }

    public string? PublicAddress { get; set; }

    public string? WorkingHours { get; set; }

    public int? ExperienceYears { get; set; }

    public bool EmergencyService { get; set; }

    public bool OnsiteService { get; set; }

    public PublicationStatus PublicationStatus { get; set; } = PublicationStatus.Draft;

    public DateTime? PublishedAtUtc { get; set; }

    public string? PublishedBy { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public int Version { get; set; }
}
'@

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

    public DbSet<AppUser> Users => Set<AppUser>();

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
    }
}
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

if (app.Environment.IsDevelopment())
{
    app.MapAdminProviderWorkflowEndpoints();
}

app.Run();
'@

Write-Utf8NoBom "$root\Domain\UserRole.cs" $userRole
Write-Utf8NoBom "$root\Domain\AppUser.cs" $appUser
Write-Utf8NoBom "$root\Domain\Provider.cs" $provider
Write-Utf8NoBom "$root\Infrastructure\Auth\JwtOptions.cs" $jwtOptions
Write-Utf8NoBom "$root\Infrastructure\Auth\JwtTokenService.cs" $jwtTokenService
Write-Utf8NoBom "$root\Endpoints\AuthEndpoints.cs" $authEndpoints
Write-Utf8NoBom "$root\Infrastructure\AppDbContext.cs" $appDb
Write-Utf8NoBom "$root\Program.cs" $program

Write-Host ""
Write-Host "Development JWT secret olusturuluyor..." -ForegroundColor Cyan

Push-Location $root
try {
    dotnet user-secrets init | Out-Null

    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $secret = [Convert]::ToBase64String($bytes)

    dotnet user-secrets set "Jwt:Key" $secret | Out-Null
    dotnet user-secrets set "Jwt:Issuer" "NeyeIhtiyacVar.Api" | Out-Null
    dotnet user-secrets set "Jwt:Audience" "NeyeIhtiyacVar.Frontend" | Out-Null
    dotnet user-secrets set "Jwt:ExpirationMinutes" "480" | Out-Null
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Kullanici hesabi + JWT giris altyapisi hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Yeni endpointler:" -ForegroundColor Cyan
Write-Host "  POST /api/auth/register"
Write-Host "  POST /api/auth/login"
Write-Host "  GET  /api/auth/me   (Bearer token gerekli)"
Write-Host ""
Write-Host "Provider modeline nullable OwnerUserId eklendi." -ForegroundColor Yellow
Write-Host "Eski isletme kayitlari bozulmaz; hesap baglama sonraki adimda yapilacak." -ForegroundColor Yellow
Write-Host ""
Write-Host "Production Ubuntu icin JWT anahtari environment variable olacak:" -ForegroundColor Yellow
Write-Host "  Jwt__Key"
Write-Host ""
Write-Host "Simdi sadece: dotnet build" -ForegroundColor Cyan
