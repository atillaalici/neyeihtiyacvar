using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Auth;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AuthEndpoints
{
    private static readonly TimeSpan VerificationLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(60);
    private const int MaxVerificationAttempts = 5;

    public static IEndpointRouteBuilder MapAuthEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", async (
            RegisterRequest request,
            AppDbContext dbContext,
            IPasswordHasher<AppUser> passwordHasher,
            IConfiguration configuration,
            IWebHostEnvironment environment) =>
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
            var phone = NormalizePhone(request.PhoneNumber);

            var emailExists = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(x => x.NormalizedEmail == normalizedEmail);

            if (emailExists)
            {
                return Results.Conflict(new
                {
                    message = "Bu e-posta adresiyle daha önce hesap oluşturulmuş."
                });
            }

            var phoneExists = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(x => x.NormalizedPhoneNumber == phone);

            if (phoneExists)
            {
                return Results.Conflict(new
                {
                    message = "Bu telefon numarasıyla daha önce hesap oluşturulmuş."
                });
            }

            var now = DateTime.UtcNow;

            var user = new AppUser
            {
                Email = email,
                NormalizedEmail = normalizedEmail,
                PhoneNumber = FormatPhoneForDisplay(phone),
                NormalizedPhoneNumber = phone,
                DisplayName = request.DisplayName.Trim(),
                Role = UserRole.User,
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            user.PasswordHash = passwordHasher.HashPassword(
                user,
                request.Password);

            dbContext.Users.Add(user);

            var emailCode = CreateCode();
            var phoneCode = CreateCode();

            dbContext.AccountVerificationCodes.AddRange(
                NewVerificationCode(
                    user,
                    VerificationPurpose.AccountVerification,
                    VerificationChannel.Email,
                    emailCode,
                    now,
                    configuration),
                NewVerificationCode(
                    user,
                    VerificationPurpose.AccountVerification,
                    VerificationChannel.Phone,
                    phoneCode,
                    now,
                    configuration));

            await dbContext.SaveChangesAsync();

            return Results.Created(
                $"/api/auth/users/{user.Id}",
                new
                {
                    verificationRequired = true,
                    userId = user.Id,
                    user.Email,
                    user.PhoneNumber,
                    emailVerified = false,
                    phoneVerified = false,
                    message = "Hesabın oluşturuldu. E-posta ve telefon doğrulamasını tamamla.",
                    developmentCodes = environment.IsDevelopment()
                        ? new
                        {
                            email = emailCode,
                            phone = phoneCode
                        }
                        : null
                });
        });

        group.MapPost("/verification/verify", async (
            VerifyCodeRequest request,
            AppDbContext dbContext,
            IConfiguration configuration,
            JwtTokenService tokenService) =>
        {
            if (!TryParseChannel(request.Channel, out var channel))
            {
                return Results.BadRequest(new
                {
                    message = "Doğrulama kanalı geçerli değil."
                });
            }

            if (string.IsNullOrWhiteSpace(request.Code) ||
                request.Code.Trim().Length != 6 ||
                !request.Code.Trim().All(char.IsDigit))
            {
                return Results.BadRequest(new
                {
                    message = "6 haneli doğrulama kodunu yaz."
                });
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == request.UserId &&
                    x.IsActive);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Hesap bulunamadı."
                });
            }

            if (IsChannelVerified(user, channel))
            {
                if (IsFullyVerified(user))
                {
                    var existingToken = tokenService.CreateToken(user);
                    return Results.Ok(ToAuthResponse(user, existingToken));
                }

                return Results.Ok(new
                {
                    verified = true,
                    emailVerified = user.EmailVerifiedAtUtc != null,
                    phoneVerified = user.PhoneVerifiedAtUtc != null
                });
            }

            var now = DateTime.UtcNow;

            var verification = await dbContext.AccountVerificationCodes
                .Where(x =>
                    x.UserId == user.Id &&
                    x.Purpose == VerificationPurpose.AccountVerification &&
                    x.Channel == channel &&
                    x.UsedAtUtc == null)
                .OrderByDescending(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync();

            if (verification is null || verification.ExpiresAtUtc <= now)
            {
                return Results.BadRequest(new
                {
                    message = "Doğrulama kodunun süresi dolmuş. Yeni kod iste."
                });
            }

            if (verification.AttemptCount >= MaxVerificationAttempts)
            {
                return Results.StatusCode(StatusCodes.Status429TooManyRequests);
            }

            verification.AttemptCount++;

            var incomingHash = HashCode(
                request.Code.Trim(),
                configuration);

            if (!CryptographicOperations.FixedTimeEquals(
                    Convert.FromHexString(verification.CodeHash),
                    Convert.FromHexString(incomingHash)))
            {
                await dbContext.SaveChangesAsync();

                return Results.BadRequest(new
                {
                    message = "Doğrulama kodu hatalı."
                });
            }

            verification.UsedAtUtc = now;

            if (channel == VerificationChannel.Email)
            {
                user.EmailVerifiedAtUtc = now;
            }
            else
            {
                user.PhoneVerifiedAtUtc = now;
            }

            user.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            if (IsFullyVerified(user))
            {
                var token = tokenService.CreateToken(user);

                return Results.Ok(ToAuthResponse(user, token));
            }

            return Results.Ok(new
            {
                verified = true,
                emailVerified = user.EmailVerifiedAtUtc != null,
                phoneVerified = user.PhoneVerifiedAtUtc != null
            });
        });

        group.MapPost("/verification/resend", async (
            ResendVerificationRequest request,
            AppDbContext dbContext,
            IConfiguration configuration,
            IWebHostEnvironment environment) =>
        {
            if (!TryParseChannel(request.Channel, out var channel))
            {
                return Results.BadRequest(new
                {
                    message = "Doğrulama kanalı geçerli değil."
                });
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == request.UserId &&
                    x.IsActive);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Hesap bulunamadı."
                });
            }

            if (IsChannelVerified(user, channel))
            {
                return Results.Ok(new
                {
                    message = "Bu bilgi zaten doğrulanmış."
                });
            }

            var now = DateTime.UtcNow;

            var last = await dbContext.AccountVerificationCodes
                .AsNoTracking()
                .Where(x =>
                    x.UserId == user.Id &&
                    x.Purpose == VerificationPurpose.AccountVerification &&
                    x.Channel == channel)
                .OrderByDescending(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync();

            if (last is not null &&
                last.CreatedAtUtc.Add(ResendCooldown) > now)
            {
                var retryAfterSeconds = (int)Math.Ceiling(
                    (last.CreatedAtUtc.Add(ResendCooldown) - now).TotalSeconds);

                return Results.Json(
                    new
                    {
                        message = "Yeni kod istemeden önce biraz bekle.",
                        retryAfterSeconds
                    },
                    statusCode: StatusCodes.Status429TooManyRequests);
            }

            var code = CreateCode();

            dbContext.AccountVerificationCodes.Add(
                NewVerificationCode(
                    user,
                    VerificationPurpose.AccountVerification,
                    channel,
                    code,
                    now,
                    configuration));

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = channel == VerificationChannel.Email
                    ? "Yeni e-posta doğrulama kodu oluşturuldu."
                    : "Yeni telefon doğrulama kodu oluşturuldu.",
                developmentCode = environment.IsDevelopment()
                    ? code
                    : null
            });
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

            if (!IsFullyVerified(user))
            {
                return Results.Json(
                    new
                    {
                        code = "verification_required",
                        message = "Giriş yapmadan önce e-posta ve telefon doğrulamasını tamamla.",
                        userId = user.Id,
                        user.Email,
                        user.PhoneNumber,
                        emailVerified = user.EmailVerifiedAtUtc != null,
                        phoneVerified = user.PhoneVerifiedAtUtc != null
                    },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var token = tokenService.CreateToken(user);
            return Results.Ok(ToAuthResponse(user, token));
        });

        group.MapPost("/forgot-password", async (
            ForgotPasswordRequest request,
            AppDbContext dbContext,
            IConfiguration configuration,
            IWebHostEnvironment environment) =>
        {
            const string genericMessage =
                "E-posta adresi kayıtlıysa şifre yenileme kodu oluşturuldu.";

            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return Results.Ok(new
                {
                    message = genericMessage
                });
            }

            var normalizedEmail =
                request.Email.Trim().ToLowerInvariant().ToUpperInvariant();

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.NormalizedEmail == normalizedEmail &&
                    x.IsActive);

            if (user is null)
            {
                return Results.Ok(new
                {
                    message = genericMessage
                });
            }

            var now = DateTime.UtcNow;

            var last = await dbContext.AccountVerificationCodes
                .AsNoTracking()
                .Where(x =>
                    x.UserId == user.Id &&
                    x.Purpose == VerificationPurpose.PasswordReset &&
                    x.Channel == VerificationChannel.Email)
                .OrderByDescending(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync();

            if (last is not null &&
                last.CreatedAtUtc.Add(ResendCooldown) > now)
            {
                return Results.Ok(new
                {
                    message = genericMessage
                });
            }

            var code = CreateCode();

            dbContext.AccountVerificationCodes.Add(
                NewVerificationCode(
                    user,
                    VerificationPurpose.PasswordReset,
                    VerificationChannel.Email,
                    code,
                    now,
                    configuration));

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = genericMessage,
                developmentCode = environment.IsDevelopment()
                    ? code
                    : null
            });
        });

        group.MapPost("/reset-password", async (
            ResetPasswordRequest request,
            AppDbContext dbContext,
            IConfiguration configuration,
            IPasswordHasher<AppUser> passwordHasher) =>
        {
            var passwordError = ValidatePassword(request.NewPassword);

            if (passwordError is not null)
            {
                return Results.BadRequest(new
                {
                    message = passwordError
                });
            }

            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Code))
            {
                return Results.BadRequest(new
                {
                    message = "E-posta ve doğrulama kodu zorunludur."
                });
            }

            var normalizedEmail =
                request.Email.Trim().ToLowerInvariant().ToUpperInvariant();

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.NormalizedEmail == normalizedEmail &&
                    x.IsActive);

            if (user is null)
            {
                return Results.BadRequest(new
                {
                    message = "Şifre yenileme kodu geçerli değil."
                });
            }

            var now = DateTime.UtcNow;

            var verification = await dbContext.AccountVerificationCodes
                .Where(x =>
                    x.UserId == user.Id &&
                    x.Purpose == VerificationPurpose.PasswordReset &&
                    x.Channel == VerificationChannel.Email &&
                    x.UsedAtUtc == null)
                .OrderByDescending(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync();

            if (verification is null ||
                verification.ExpiresAtUtc <= now ||
                verification.AttemptCount >= MaxVerificationAttempts)
            {
                return Results.BadRequest(new
                {
                    message = "Şifre yenileme kodu geçerli değil veya süresi dolmuş."
                });
            }

            verification.AttemptCount++;

            var incomingHash = HashCode(
                request.Code.Trim(),
                configuration);

            if (!CryptographicOperations.FixedTimeEquals(
                    Convert.FromHexString(verification.CodeHash),
                    Convert.FromHexString(incomingHash)))
            {
                await dbContext.SaveChangesAsync();

                return Results.BadRequest(new
                {
                    message = "Şifre yenileme kodu hatalı."
                });
            }

            verification.UsedAtUtc = now;
            user.PasswordHash = passwordHasher.HashPassword(
                user,
                request.NewPassword);
            user.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Şifren başarıyla yenilendi."
            });
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
                .FirstOrDefaultAsync(x =>
                    x.Id == userId &&
                    x.IsActive);

            if (user is null)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(ToUserResponse(user));
        })
        .RequireAuthorization();

        return app;
    }

    private static AccountVerificationCode NewVerificationCode(
        AppUser user,
        VerificationPurpose purpose,
        VerificationChannel channel,
        string code,
        DateTime now,
        IConfiguration configuration)
        => new()
        {
            User = user,
            Purpose = purpose,
            Channel = channel,
            CodeHash = HashCode(code, configuration),
            ExpiresAtUtc = now.Add(VerificationLifetime),
            AttemptCount = 0,
            CreatedAtUtc = now
        };

    private static string CreateCode()
        => RandomNumberGenerator
            .GetInt32(100000, 1000000)
            .ToString();

    private static string HashCode(
        string code,
        IConfiguration configuration)
    {
        var key = configuration["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException(
                "Jwt:Key doğrulama kodlarını hashlemek için gereklidir.");
        }

        using var hmac =
            new HMACSHA256(Encoding.UTF8.GetBytes(key));

        return Convert.ToHexString(
            hmac.ComputeHash(Encoding.UTF8.GetBytes(code)));
    }

    private static bool TryParseChannel(
        string value,
        out VerificationChannel channel)
    {
        switch (value.Trim().ToLowerInvariant())
        {
            case "email":
                channel = VerificationChannel.Email;
                return true;
            case "phone":
                channel = VerificationChannel.Phone;
                return true;
            default:
                channel = default;
                return false;
        }
    }

    private static bool IsChannelVerified(
        AppUser user,
        VerificationChannel channel)
        => channel == VerificationChannel.Email
            ? user.EmailVerifiedAtUtc != null
            : user.PhoneVerifiedAtUtc != null;

    private static bool IsFullyVerified(AppUser user)
        => user.EmailVerifiedAtUtc != null &&
           user.PhoneVerifiedAtUtc != null;

    private static string NormalizePhone(string value)
    {
        var digits = new string(
            value.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("90") && digits.Length == 12)
        {
            digits = digits[2..];
        }

        if (digits.StartsWith("0") && digits.Length == 11)
        {
            digits = digits[1..];
        }

        return digits;
    }

    private static string FormatPhoneForDisplay(string normalized)
        => normalized.Length == 10
            ? $"0{normalized}"
            : normalized;

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
            errors["displayName"] =
                ["Ad soyad en fazla 150 karakter olabilir."];
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            errors["email"] = ["E-posta zorunludur."];
        }
        else if (!IsValidEmail(request.Email))
        {
            errors["email"] = ["Geçerli bir e-posta adresi yazın."];
        }

        var phone = NormalizePhone(request.PhoneNumber ?? string.Empty);

        if (phone.Length != 10 ||
            !phone.StartsWith("5"))
        {
            errors["phoneNumber"] =
                ["Cep telefonu 05xx xxx xx xx formatında olmalıdır."];
        }

        var passwordError = ValidatePassword(request.Password);

        if (passwordError is not null)
        {
            errors["password"] = [passwordError];
        }

        return errors;
    }

    private static string? ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return "Şifre zorunludur.";
        }

        if (password.Length < 8)
        {
            return "Şifre en az 8 karakter olmalıdır.";
        }

        if (password.Length > 128)
        {
            return "Şifre en fazla 128 karakter olabilir.";
        }

        if (!password.Any(char.IsUpper) ||
            !password.Any(char.IsLower) ||
            !password.Any(char.IsDigit))
        {
            return "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.";
        }

        return null;
    }

    private static bool IsValidEmail(string value)
    {
        try
        {
            var email = new MailAddress(value.Trim());
            return email.Address.Equals(
                value.Trim(),
                StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static object ToAuthResponse(
        AppUser user,
        TokenResult token)
        => new
        {
            accessToken = token.AccessToken,
            token.ExpiresAtUtc,
            user = ToUserResponse(user)
        };

    private static object ToUserResponse(AppUser user)
        => new
        {
            user.Id,
            user.Email,
            user.PhoneNumber,
            user.DisplayName,
            role = user.Role.ToString().ToLowerInvariant(),
            emailVerified = user.EmailVerifiedAtUtc != null,
            phoneVerified = user.PhoneVerifiedAtUtc != null
        };
}

public sealed record RegisterRequest(
    string DisplayName,
    string PhoneNumber,
    string Email,
    string Password);

public sealed record LoginRequest(
    string Email,
    string Password);

public sealed record VerifyCodeRequest(
    Guid UserId,
    string Channel,
    string Code);

public sealed record ResendVerificationRequest(
    Guid UserId,
    string Channel);

public sealed record ForgotPasswordRequest(
    string Email);

public sealed record ResetPasswordRequest(
    string Email,
    string Code,
    string NewPassword);