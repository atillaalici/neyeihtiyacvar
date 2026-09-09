$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar"
$backendRoot = Join-Path $root "backend\NeyeIhtiyacVar.Api"
$frontendRoot = Join-Path $root "frontend"

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

# -------------------------------------------------------------------
# BACKEND: Program.cs production guvenligi
# -------------------------------------------------------------------

$programPath = Join-Path $backendRoot "Program.cs"

$programContent = @'
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

var configuredOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?? Array.Empty<string>();

var allowedOrigins = configuredOrigins
    .Where(x => !string.IsNullOrWhiteSpace(x))
    .Select(x => x.Trim().TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (builder.Environment.IsDevelopment() && allowedOrigins.Length == 0)
{
    allowedOrigins =
    [
        "http://localhost:3000",
        "http://localhost:3001"
    ];
}

if (!builder.Environment.IsDevelopment() && allowedOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "Production ortaminda Cors__AllowedOrigins__0 gibi environment variable ile izin verilen frontend adresi tanimlanmalidir.");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection tanimli degil. Production icin ConnectionStrings__DefaultConnection environment variable kullanin.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
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
        "Jwt:Key en az 32 karakter olmalidir. Development icin dotnet user-secrets, production icin Jwt__Key environment variable kullanin.");
}

if (string.IsNullOrWhiteSpace(jwtOptions.Issuer) ||
    string.IsNullOrWhiteSpace(jwtOptions.Audience))
{
    throw new InvalidOperationException(
        "Jwt Issuer ve Audience bos olamaz.");
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

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole(UserRole.Admin.ToString());
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");

app.UseAuthentication();

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/admin"))
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        if (!context.User.IsInRole(UserRole.Admin.ToString()))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
    }

    await next();
});

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
app.MapNotificationEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapAdminProviderWorkflowEndpoints();
    app.MapDevelopmentProviderOwnerEndpoints();
    app.MapAdminNeedEndpoints();
    app.MapAdminDashboardEndpoints();
    app.MapDevelopmentAdminEndpoints();
}
else
{
    app.MapAdminProviderWorkflowEndpoints();
    app.MapAdminNeedEndpoints();
    app.MapAdminDashboardEndpoints();
}

app.Run();
'@

Write-Utf8NoBom $programPath $programContent

# -------------------------------------------------------------------
# BACKEND: Production config ornegi - gizli bilgi yok
# -------------------------------------------------------------------

$productionExamplePath = Join-Path $backendRoot "appsettings.Production.example.json"

$productionExampleContent = @'
{
  "Cors": {
    "AllowedOrigins": [
      "https://neyeihtiyacvar.com",
      "https://www.neyeihtiyacvar.com"
    ]
  },
  "Jwt": {
    "Issuer": "NeyeIhtiyacVar.Api",
    "Audience": "NeyeIhtiyacVar.Frontend",
    "ExpirationMinutes": 480
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "neyeihtiyacvar.com;www.neyeihtiyacvar.com"
}
'@

Write-Utf8NoBom $productionExamplePath $productionExampleContent

# -------------------------------------------------------------------
# UBUNTU: Environment variable ornegi - sadece placeholder
# -------------------------------------------------------------------

$envExamplePath = Join-Path $root "deploy\ubuntu\neyeihtiyacvar-api.env.example"

$envExampleContent = @'
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5155

ConnectionStrings__DefaultConnection=Host=127.0.0.1;Port=5432;Database=neyeihtiyacvar;Username=neyeihtiyacvar_app;Password=CHANGE_ME

Jwt__Issuer=NeyeIhtiyacVar.Api
Jwt__Audience=NeyeIhtiyacVar.Frontend
Jwt__Key=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_AT_LEAST_32_CHARACTERS

Cors__AllowedOrigins__0=https://neyeihtiyacvar.com
Cors__AllowedOrigins__1=https://www.neyeihtiyacvar.com
'@

Write-Utf8NoBom $envExamplePath $envExampleContent

# -------------------------------------------------------------------
# FRONTEND: Production API URL ornegi
# -------------------------------------------------------------------

$frontendEnvExamplePath = Join-Path $frontendRoot ".env.production.example"

$frontendEnvExampleContent = @'
NEXT_PUBLIC_API_BASE_URL=https://api.neyeihtiyacvar.com
'@

Write-Utf8NoBom $frontendEnvExamplePath $frontendEnvExampleContent

# -------------------------------------------------------------------
# Gitignore: gercek production env dosyalarini koru, example'lari tut
# -------------------------------------------------------------------

$gitignorePath = Join-Path $root ".gitignore"
$gitignore = Get-Content -Raw -Encoding UTF8 $gitignorePath

$linesToAdd = @(
    "deploy/ubuntu/neyeihtiyacvar-api.env",
    "frontend/.env.production",
    "!frontend/.env.production.example",
    "!backend/NeyeIhtiyacVar.Api/appsettings.Production.example.json",
    "!deploy/ubuntu/neyeihtiyacvar-api.env.example"
)

foreach ($line in $linesToAdd) {
    if ($gitignore -notmatch "(?m)^" + [regex]::Escape($line) + "$") {
        $gitignore = $gitignore.TrimEnd() + "`r`n" + $line + "`r`n"
    }
}

Write-Utf8NoBom $gitignorePath $gitignore

Write-Host ""
Write-Host "Production guvenligi ve ortam ayrimi hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Yapilanlar:" -ForegroundColor Cyan
Write-Host "  Production admin endpointleri aktif ve Admin rolune korumali"
Write-Host "  Development admin bootstrap endpointi Production'da yok"
Write-Host "  Production CORS environment variable ile zorunlu"
Write-Host "  Connection string environment variable ile destekleniyor"
Write-Host "  JWT anahtari environment variable ile destekleniyor"
Write-Host "  Ubuntu production env ornegi olusturuldu"
Write-Host "  Frontend production API URL ornegi olusturuldu"
Write-Host "  Gercek production secret dosyalari .gitignore'a eklendi"
Write-Host ""
Write-Host "Kontrol:" -ForegroundColor Yellow
Write-Host "  backend -> dotnet build"
Write-Host "  frontend -> pnpm exec tsc --noEmit"
