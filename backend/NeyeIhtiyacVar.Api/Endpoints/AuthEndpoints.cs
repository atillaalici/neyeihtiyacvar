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