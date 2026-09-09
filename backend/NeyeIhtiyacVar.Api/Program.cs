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

builder.Services.AddHttpClient();

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
app.MapRecommendationEndpoints();
app.MapProviderApplicationEndpoints();
app.MapAuthEndpoints();
app.MapProviderPanelEndpoints();
app.MapOfferEndpoints();
app.MapReviewEndpoints();
app.MapNotificationEndpoints();
app.MapAdminAuditLogEndpoints();
app.MapAdminDirectoryEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapAdminProviderWorkflowEndpoints();
    app.MapDevelopmentProviderOwnerEndpoints();
    app.MapAdminNeedEndpoints();
    app.MapAdminDashboardEndpoints();
    app.MapAdminUserEndpoints();
    app.MapDevelopmentAdminEndpoints();
}
else
{
    app.MapAdminProviderWorkflowEndpoints();
    app.MapAdminNeedEndpoints();
    app.MapAdminDashboardEndpoints();
    app.MapAdminUserEndpoints();
}

app.Run();