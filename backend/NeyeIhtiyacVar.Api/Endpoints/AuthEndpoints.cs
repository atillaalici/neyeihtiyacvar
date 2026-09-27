using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Auth;
using NeyeIhtiyacVar.Api.Infrastructure.Email;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AuthEndpoints
{
    private static readonly TimeSpan VerificationLifetime = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(60);
    private const int MaxVerificationAttempts = 5;

    public static IEndpointRouteBuilder MapAuthEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapDelete("/account", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            IWebHostEnvironment environment) =>
        {
            var rawUserId =
                principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
                principal.FindFirstValue("sub");

            if (!Guid.TryParse(rawUserId, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x => x.Id == userId);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Kullanıcı hesabı bulunamadı."
                });
            }

            if (user.DeletedAtUtc is not null)
            {
                return Results.BadRequest(new
                {
                    message = "Bu hesap daha önce kalıcı olarak kapatılmış."
                });
            }

            var now = DateTime.UtcNow;
            var anonymousId = user.Id.ToString("N");

            // Kişisel kullanıcı bilgilerini anonimleştir.
            user.Email = $"deleted-{anonymousId}@deleted.invalid";
            user.NormalizedEmail = user.Email.ToUpperInvariant();
            user.PhoneNumber = null;
            user.NormalizedPhoneNumber = null;
            user.EmailVerifiedAtUtc = null;
            user.PhoneVerifiedAtUtc = null;
            user.DisplayName = "Silinmiş Kullanıcı";
            user.CitySlug = null;
            user.DistrictSlug = null;
            user.WhatsAppNumber = null;
            user.Neighborhood = null;
            user.Street = null;
            user.BuildingNo = null;
            user.ApartmentNo = null;
            user.OpenAddress = null;
            user.PasswordHash = $"DELETED-{Guid.NewGuid():N}";
            user.IsActive = false;
            user.DeletedAtUtc = now;
            user.UpdatedAtUtc = now;

            // İşletme hesabı varsa yayından kaldır.
            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is not null)
            {
                provider.PublicationStatus = PublicationStatus.Unpublished;
                provider.PublishedAtUtc = null;
                provider.PublishedBy = null;
            }

            // Artık kullanılamayacak doğrulama kodlarını temizle.
            var verificationCodes = await dbContext.AccountVerificationCodes
                .Where(x => x.UserId == userId)
                .ToListAsync();

            if (verificationCodes.Count > 0)
            {
                dbContext.AccountVerificationCodes.RemoveRange(verificationCodes);
            }

            await dbContext.SaveChangesAsync();

            // Profil fotoğrafını kalıcı depolamadan kaldır.
            var configuredPath =
                Environment.GetEnvironmentVariable("USER_PROFILE_IMAGE_PATH");

            var imageFolder = string.IsNullOrWhiteSpace(configuredPath)
                ? Path.Combine(
                    environment.ContentRootPath,
                    "App_Data",
                    "user-profile-images")
                : Path.GetFullPath(configuredPath);

            foreach (var extension in new[] { ".jpg", ".png", ".webp" })
            {
                var imagePath = Path.Combine(
                    imageFolder,
                    $"{userId:N}{extension}");

                if (File.Exists(imagePath))
                {
                    File.Delete(imagePath);
                }
            }

            return Results.Ok(new
            {
                message = "Hesabınız kalıcı olarak kapatıldı."
            });
        })
        .RequireAuthorization();

        group.MapPost("/freeze", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var rawUserId =
                principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
                principal.FindFirstValue("sub");

            if (!Guid.TryParse(rawUserId, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x => x.Id == userId);

            if (user is null || !user.IsActive)
            {
                return Results.NotFound(new
                {
                    message = "Aktif kullanıcı hesabı bulunamadı."
                });
            }

            user.IsActive = false;
            user.UpdatedAtUtc = DateTime.UtcNow;

            var provider = await dbContext.Providers
                .FirstOrDefaultAsync(x => x.OwnerUserId == userId);

            if (provider is not null)
            {
                provider.PublicationStatus = PublicationStatus.Unpublished;
                provider.PublishedAtUtc = null;
                provider.PublishedBy = null;
            }

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Hesabınız donduruldu."
            });
        })
        .RequireAuthorization();

        group.MapPost("/register", async (
            RegisterRequest request,
            AppDbContext dbContext,
            IPasswordHasher<AppUser> passwordHasher,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            JwtTokenService tokenService,
            IEmailSender emailSender) =>
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

            await dbContext.SaveChangesAsync();

            var verificationCode = CreateCode();

            dbContext.AccountVerificationCodes.Add(
                NewVerificationCode(
                    user,
                    VerificationPurpose.AccountVerification,
                    VerificationChannel.Email,
                    verificationCode,
                    now,
                    configuration));

            await dbContext.SaveChangesAsync();

            var emailDelivery =
                await emailSender.SendAccountVerificationCodeAsync(
                    user.Email,
                    user.DisplayName,
                    verificationCode);

            if (!emailDelivery.Success)
            {
                return Results.Json(
                    new
                    {
                        message = "Hesabın oluşturuldu ancak doğrulama e-postası gönderilemedi. Lütfen doğrulama ekranından yeni kod iste.",
                        verificationRequired = true,
                        userId = user.Id,
                        user.Email,
                        user.PhoneNumber,
                        emailVerified = false,
                        phoneVerified = false,
                        developmentCode = environment.IsDevelopment()
                            ? verificationCode
                            : null
                    },
                    statusCode: StatusCodes.Status502BadGateway);
            }

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
                    message = "Hesabın oluşturuldu. E-posta adresine gönderilen doğrulama kodunu girerek hesabını doğrula.",
                    developmentCode = environment.IsDevelopment()
                        ? verificationCode
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

            var purpose = string.Equals(
                request.Purpose?.Trim(),
                "contact-change",
                StringComparison.OrdinalIgnoreCase)
                ? VerificationPurpose.ContactInformationChange
                : VerificationPurpose.AccountVerification;

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
                    x.IsActive &&
                    x.DeletedAtUtc == null);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Hesap bulunamadı."
                });
            }

            var now = DateTime.UtcNow;

            var verification = await dbContext.AccountVerificationCodes
                .Where(x =>
                    x.UserId == user.Id &&
                    x.Purpose == purpose &&
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

            if (purpose == VerificationPurpose.ContactInformationChange)
            {
                if (string.IsNullOrWhiteSpace(verification.PendingPhoneNumber) &&
                    string.IsNullOrWhiteSpace(verification.PendingWhatsAppNumber))
                {
                    return Results.BadRequest(new
                    {
                        message = "Bekleyen iletişim bilgisi değişikliği bulunamadı."
                    });
                }

                if (!string.IsNullOrWhiteSpace(verification.PendingPhoneNumber))
                {
                    user.PhoneNumber = FormatPhoneForDisplay(
                        verification.PendingPhoneNumber);

                    user.NormalizedPhoneNumber =
                        verification.PendingPhoneNumber;

                    user.PhoneVerifiedAtUtc = null;
                }

                if (verification.PendingWhatsAppNumber is not null)
                {
                    user.WhatsAppNumber =
                        CleanOptional(verification.PendingWhatsAppNumber, 30);
                }

                user.UpdatedAtUtc = now;

                await dbContext.SaveChangesAsync();

                var token = tokenService.CreateToken(user);

                return Results.Ok(new
                {
                    message = "Telefon ve WhatsApp bilgileriniz başarıyla doğrulandı.",
                    contactInformationVerified = true,
                    auth = ToAuthResponse(user, token)
                });
            }

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

            var authToken = tokenService.CreateToken(user);
            return Results.Ok(ToAuthResponse(user, authToken));
        });

        group.MapPost("/verification/resend", async (
            ResendVerificationRequest request,
            AppDbContext dbContext,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            IEmailSender emailSender) =>
        {
            if (!TryParseChannel(request.Channel, out var channel))
            {
                return Results.BadRequest(new
                {
                    message = "Doğrulama kanalı geçerli değil."
                });
            }

            var purpose = string.Equals(
                request.Purpose?.Trim(),
                "contact-change",
                StringComparison.OrdinalIgnoreCase)
                ? VerificationPurpose.ContactInformationChange
                : VerificationPurpose.AccountVerification;

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == request.UserId &&
                    x.IsActive &&
                    x.DeletedAtUtc == null);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Hesap bulunamadı."
                });
            }

            if (purpose == VerificationPurpose.ContactInformationChange &&
                channel != VerificationChannel.Email)
            {
                return Results.BadRequest(new
                {
                    message = "İletişim bilgisi değişikliği yalnızca e-posta ile doğrulanabilir."
                });
            }

            if (purpose == VerificationPurpose.AccountVerification &&
                IsChannelVerified(user, channel))
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
                    x.Purpose == purpose &&
                    x.Channel == channel)
                .OrderByDescending(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync();

            if (last is not null &&
                last.ExpiresAtUtc > now &&
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

            if (purpose == VerificationPurpose.ContactInformationChange &&
                last is not null &&
                string.IsNullOrWhiteSpace(last.PendingPhoneNumber) &&
                last.PendingWhatsAppNumber is null)
            {
                return Results.BadRequest(new
                {
                    message = "Bekleyen iletişim bilgisi değişikliği bulunamadı. Bilgilerinizi yeniden kaydedin."
                });
            }

            var code = CreateCode();

            var verification = NewVerificationCode(
                user,
                purpose,
                channel,
                code,
                now,
                configuration);

            if (purpose == VerificationPurpose.ContactInformationChange &&
                last is not null)
            {
                verification.PendingPhoneNumber = last.PendingPhoneNumber;
                verification.PendingWhatsAppNumber = last.PendingWhatsAppNumber;
            }

            dbContext.AccountVerificationCodes.Add(verification);

            await dbContext.SaveChangesAsync();

            EmailSendResult? emailDelivery = null;

            if (channel == VerificationChannel.Email)
            {
                emailDelivery = await emailSender.SendAccountVerificationCodeAsync(
                    user.Email,
                    user.DisplayName,
                    code);

                if (!emailDelivery.Success)
                {
                    return Results.Json(
                        new
                        {
                            message = "Doğrulama kodu oluşturuldu ancak e-posta gönderilemedi. Lütfen biraz sonra yeniden dene.",
                            developmentCode = environment.IsDevelopment() ? code : null
                        },
                        statusCode: StatusCodes.Status502BadGateway);
                }
            }

            return Results.Ok(new
            {
                message = purpose == VerificationPurpose.ContactInformationChange
                    ? "Yeni iletişim bilgileri için doğrulama kodu e-postanıza gönderildi."
                    : channel == VerificationChannel.Email
                        ? "Yeni e-posta doğrulama kodu oluşturuldu."
                        : "Yeni telefon doğrulama kodu oluşturuldu.",
                developmentCode = environment.IsDevelopment()
                    ? code
                    : null
            });
        });

        group.MapPost("/reactivation/request", async (
            ReactivationRequest request,
            AppDbContext dbContext,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            IEmailSender emailSender) =>
        {
            if (request.UserId == Guid.Empty)
            {
                return Results.BadRequest(new
                {
                    message = "Kullanıcı bilgisi geçerli değil."
                });
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == request.UserId &&
                    !x.IsActive &&
                    x.DeletedAtUtc == null);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Dondurulmuş hesap bulunamadı."
                });
            }

            var now = DateTime.UtcNow;

            var last = await dbContext.AccountVerificationCodes
                .Where(x =>
                    x.UserId == user.Id &&
                    x.Purpose == VerificationPurpose.AccountReactivation &&
                    x.Channel == VerificationChannel.Email &&
                    x.UsedAtUtc == null)
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
                    VerificationPurpose.AccountReactivation,
                    VerificationChannel.Email,
                    code,
                    now,
                    configuration));

            await dbContext.SaveChangesAsync();

            var delivery = await emailSender.SendAccountVerificationCodeAsync(
                user.Email,
                user.DisplayName,
                code);

            if (!delivery.Success)
            {
                return Results.Json(
                    new
                    {
                        message = "Etkinleştirme kodu oluşturuldu ancak e-posta gönderilemedi. Lütfen biraz sonra yeniden dene.",
                        developmentCode = environment.IsDevelopment()
                            ? code
                            : null
                    },
                    statusCode: StatusCodes.Status502BadGateway);
            }

            return Results.Ok(new
            {
                message = "Hesabınızı yeniden etkinleştirmek için doğrulama kodu e-posta adresinize gönderildi.",
                userId = user.Id,
                email = user.Email,
                developmentCode = environment.IsDevelopment()
                    ? code
                    : null
            });
        });

        group.MapPost("/reactivation/verify", async (
            ReactivationVerifyRequest request,
            AppDbContext dbContext,
            IConfiguration configuration) =>
        {
            if (request.UserId == Guid.Empty)
            {
                return Results.BadRequest(new
                {
                    message = "Kullanıcı bilgisi geçerli değil."
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
                    !x.IsActive &&
                    x.DeletedAtUtc == null);

            if (user is null)
            {
                return Results.NotFound(new
                {
                    message = "Dondurulmuş hesap bulunamadı."
                });
            }

            var now = DateTime.UtcNow;

            var verification = await dbContext.AccountVerificationCodes
                .Where(x =>
                    x.UserId == user.Id &&
                    x.Purpose == VerificationPurpose.AccountReactivation &&
                    x.Channel == VerificationChannel.Email &&
                    x.UsedAtUtc == null)
                .OrderByDescending(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync();

            if (verification is null ||
                verification.ExpiresAtUtc <= now)
            {
                return Results.BadRequest(new
                {
                    message = "Etkinleştirme kodunun süresi dolmuş. Yeni kod iste."
                });
            }

            if (verification.AttemptCount >= MaxVerificationAttempts)
            {
                return Results.StatusCode(
                    StatusCodes.Status429TooManyRequests);
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
                    message = "Etkinleştirme kodu hatalı."
                });
            }

            verification.UsedAtUtc = now;
            user.IsActive = true;
            user.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Hesabınız yeniden etkinleştirildi."
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

            if (user is null || user.DeletedAtUtc is not null)
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

            if (!user.IsActive)
            {
                return Results.Json(
                    new
                    {
                        code = "account_frozen",
                        message = "Hesabınız dondurulmuş.",
                        userId = user.Id,
                        user.Email
                    },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            if (result == PasswordVerificationResult.SuccessRehashNeeded)
            {
                user.PasswordHash = passwordHasher.HashPassword(
                    user,
                    request.Password);

                user.UpdatedAtUtc = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
            }

            if (user.EmailVerifiedAtUtc is null)
            {
                return Results.Json(
                    new
                    {
                        code = "verification_required",
                        message = "Giriş yapabilmek için e-posta adresini doğrulamalısın.",
                        userId = user.Id,
                        user.Email,
                        user.PhoneNumber,
                        emailVerified = false,
                        phoneVerified = user.PhoneVerifiedAtUtc != null
                    },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var token = tokenService.CreateToken(user);
            return Results.Ok(ToAuthResponse(user, token));
        });

        group.MapPost("/change-password", async (
            ChangePasswordRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            IPasswordHasher<AppUser> passwordHasher) =>
        {
            var rawUserId =
                principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
                principal.FindFirstValue("sub");

            if (!Guid.TryParse(rawUserId, out var userId))
            {
                return Results.Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                return Results.BadRequest(new
                {
                    message = "Mevcut şifrenizi girin."
                });
            }

            var passwordError = ValidatePassword(request.NewPassword);

            if (passwordError is not null)
            {
                return Results.BadRequest(new
                {
                    message = passwordError
                });
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == userId &&
                    x.IsActive &&
                    x.DeletedAtUtc == null);

            if (user is null)
            {
                return Results.Unauthorized();
            }

            var verification = passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.CurrentPassword);

            if (verification == PasswordVerificationResult.Failed)
            {
                return Results.BadRequest(new
                {
                    message = "Mevcut şifreniz hatalı."
                });
            }

            var samePassword = passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.NewPassword);

            if (samePassword != PasswordVerificationResult.Failed)
            {
                return Results.BadRequest(new
                {
                    message = "Yeni şifreniz mevcut şifrenizden farklı olmalıdır."
                });
            }

            user.PasswordHash = passwordHasher.HashPassword(
                user,
                request.NewPassword);

            user.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Şifreniz başarıyla güncellendi."
            });
        })
        .RequireAuthorization();

        group.MapPost("/forgot-password", async (
            ForgotPasswordRequest request,
            AppDbContext dbContext,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            JwtTokenService tokenService,
            IEmailSender emailSender,
            ILoggerFactory loggerFactory) =>
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

            var emailDelivery = await emailSender.SendPasswordResetCodeAsync(
                user.Email,
                user.DisplayName,
                code);

            if (!emailDelivery.Success)
            {
                var logger = loggerFactory.CreateLogger("AuthEndpoints");
                logger.LogError(
                    "Şifre yenileme e-postası gönderilemedi. UserId: {UserId}. Error: {Error}",
                    user.Id,
                    emailDelivery.ErrorMessage);
            }

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

        group.MapPut("/me", async (
            UpdateProfileRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            IConfiguration configuration) =>
        {
            var idValue =
                principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
                principal.FindFirstValue("sub");

            if (!Guid.TryParse(idValue, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == userId &&
                    x.IsActive &&
                    x.DeletedAtUtc == null);

            if (user is null)
            {
                return Results.Unauthorized();
            }

            var errors = new Dictionary<string, string[]>();

            var displayName = request.DisplayName?.Trim() ?? string.Empty;

            if (displayName.Length < 2)
            {
                errors["displayName"] = ["Ad soyad en az 2 karakter olmalıdır."];
            }
            else if (displayName.Length > 150)
            {
                errors["displayName"] = ["Ad soyad en fazla 150 karakter olabilir."];
            }

            var rawPhone = request.PhoneNumber?.Trim() ?? string.Empty;
            var normalizedPhone = string.IsNullOrWhiteSpace(rawPhone)
                ? string.Empty
                : NormalizePhone(rawPhone);

            if (!string.IsNullOrWhiteSpace(normalizedPhone))
            {
                if (normalizedPhone.Length != 13 ||
                    !normalizedPhone.StartsWith("+905"))
                {
                    errors["phoneNumber"] =
                        ["Geçerli bir cep telefonu numarası girin."];
                }
                else
                {
                    var phoneExists = await dbContext.Users
                        .AsNoTracking()
                        .AnyAsync(x =>
                            x.Id != userId &&
                            x.NormalizedPhoneNumber == normalizedPhone);

                    if (phoneExists)
                    {
                        errors["phoneNumber"] =
                            ["Bu telefon numarası başka bir hesapta kullanılıyor."];
                    }
                }
            }

            var citySlug = request.CitySlug?.Trim() ?? string.Empty;
            var districtSlug = request.DistrictSlug?.Trim() ?? string.Empty;

            var hasCity = !string.IsNullOrWhiteSpace(citySlug);
            var hasDistrict = !string.IsNullOrWhiteSpace(districtSlug);

            if (hasCity != hasDistrict)
            {
                if (!hasCity)
                {
                    errors["citySlug"] = ["İl seçin."];
                }

                if (!hasDistrict)
                {
                    errors["districtSlug"] = ["İlçe seçin."];
                }
            }

            if (errors.Count == 0 && hasCity && hasDistrict)
            {
                var city = await dbContext.Cities
                    .AsNoTracking()
                    .Include(x => x.Districts)
                    .FirstOrDefaultAsync(x =>
                        x.IsActive &&
                        x.Slug == citySlug);

                if (city is null)
                {
                    errors["citySlug"] = ["Geçerli bir il seçin."];
                }
                else
                {
                    var districtIsValid = city.Districts.Any(x =>
                        x.IsActive &&
                        x.Slug == districtSlug);

                    if (!districtIsValid)
                    {
                        errors["districtSlug"] =
                            ["Seçilen ilçenin ile ait olduğunu kontrol edin."];
                    }
                }
            }

            if (errors.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = "Profil bilgileri geçerli değil.",
                    errors
                });
            }

            var normalizedWhatsApp = CleanOptional(
                request.WhatsAppNumber,
                30);

            var currentPhone =
                user.NormalizedPhoneNumber ?? string.Empty;

            var requestedWhatsApp =
                normalizedWhatsApp ?? string.Empty;

            var currentWhatsApp =
                user.WhatsAppNumber ?? string.Empty;

            var phoneChanged =
                !string.Equals(
                    currentPhone,
                    normalizedPhone,
                    StringComparison.Ordinal);

            var whatsAppChanged =
                !string.Equals(
                    currentWhatsApp,
                    requestedWhatsApp,
                    StringComparison.Ordinal);

            // Normal profil bilgileri her durumda kaydedilebilir.
            user.DisplayName = displayName;
            user.CitySlug =
                string.IsNullOrWhiteSpace(citySlug)
                    ? null
                    : citySlug;
            user.DistrictSlug =
                string.IsNullOrWhiteSpace(districtSlug)
                    ? null
                    : districtSlug;
            user.Neighborhood =
                CleanOptional(request.Neighborhood, 150);
            user.Street =
                CleanOptional(request.Street, 200);
            user.BuildingNo =
                CleanOptional(request.BuildingNo, 30);
            user.ApartmentNo =
                CleanOptional(request.ApartmentNo, 30);
            user.OpenAddress =
                CleanOptional(request.OpenAddress, 500);
            user.UpdatedAtUtc = DateTime.UtcNow;

            // Telefon veya WhatsApp değiştiyse yeni bilgiler hemen
            // Users tablosuna yazılmaz. Önce e-posta doğrulaması gerekir.
            // Kod burada gönderilmez; kullanıcı Hesabım ekranındaki
            // "E-posta ile Doğrula" butonuna bastığında resend endpoint'i
            // üzerinden gönderilir.
            if (phoneChanged || whatsAppChanged)
            {
                var now = DateTime.UtcNow;

                // Aynı kullanıcı için önceki bekleyen iletişim değişikliği
                // kayıtlarını kullanılamaz hale getir.
                var pendingVerifications =
                    await dbContext.AccountVerificationCodes
                        .Where(x =>
                            x.UserId == user.Id &&
                            x.Purpose == VerificationPurpose.ContactInformationChange &&
                            x.Channel == VerificationChannel.Email &&
                            x.UsedAtUtc == null)
                        .ToListAsync();

                foreach (var pending in pendingVerifications)
                {
                    pending.UsedAtUtc = now;
                }

                var verification = NewVerificationCode(
                    user,
                    VerificationPurpose.ContactInformationChange,
                    VerificationChannel.Email,
                    CreateCode(),
                    now,
                    configuration);

                verification.PendingPhoneNumber = normalizedPhone;
                verification.PendingWhatsAppNumber = normalizedWhatsApp;

                // Bu ilk kayıt yalnızca bekleyen iletişim bilgilerini taşır.
                // Henüz e-posta gönderilmediği için resend bekleme süresine
                // takılmaması amacıyla kodu hemen süresi dolmuş olarak işaretle.
                verification.ExpiresAtUtc = now;

                dbContext.AccountVerificationCodes.Add(verification);

                await dbContext.SaveChangesAsync();

                return Results.Ok(new
                {
                    message = "Telefon ve WhatsApp değişiklikleri kaydedildi ancak güvenlik nedeniyle henüz aktif edilmedi. E-posta doğrulaması gerekiyor.",
                    contactVerificationRequired = true,
                    phoneVerificationReset = phoneChanged,
                    user = ToUserResponse(user)
                });
            }

            // İletişim bilgileri değişmediyse mevcut değerleri doğrudan güncelle.
            user.PhoneNumber =
                string.IsNullOrWhiteSpace(normalizedPhone)
                    ? null
                    : FormatPhoneForDisplay(normalizedPhone);

            user.NormalizedPhoneNumber =
                string.IsNullOrWhiteSpace(normalizedPhone)
                    ? null
                    : normalizedPhone;

            user.WhatsAppNumber = normalizedWhatsApp;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Profilin güncellendi.",
                contactVerificationRequired = false,
                phoneVerificationReset = false,
                user = ToUserResponse(user)
            });
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

        return digits.Length == 10 && digits.StartsWith("5")
            ? $"+90{digits}"
            : digits;
    }

    private static string FormatPhoneForDisplay(string normalized)
    {
        var digits = new string(
            normalized.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("90") && digits.Length == 12)
        {
            digits = digits[2..];
        }

        return digits.Length == 10
            ? $"+90 {digits[..3]} {digits.Substring(3, 3)} {digits.Substring(6, 2)} {digits.Substring(8, 2)}"
            : normalized;
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

        if (phone.Length != 13 ||
            !phone.StartsWith("+905"))
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

    private static string? CleanOptional(string? value, int maxLength)
    {
        var cleaned = value?.Trim();

        if (string.IsNullOrWhiteSpace(cleaned))
        {
            return null;
        }

        return cleaned.Length <= maxLength
            ? cleaned
            : cleaned[..maxLength];
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
            user.CitySlug,
            user.DistrictSlug,
            user.WhatsAppNumber,
            user.Neighborhood,
            user.Street,
            user.BuildingNo,
            user.ApartmentNo,
            user.OpenAddress,
            user.CreatedAtUtc,
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

public sealed record UpdateProfileRequest(
    string DisplayName,
    string PhoneNumber,
    string CitySlug,
    string DistrictSlug,
    string? WhatsAppNumber,
    string? Neighborhood,
    string? Street,
    string? BuildingNo,
    string? ApartmentNo,
    string? OpenAddress);

public sealed record ReactivationRequest(
    Guid UserId);

public sealed record ReactivationVerifyRequest(
    Guid UserId,
    string Code);

public sealed record VerifyCodeRequest(
    Guid UserId,
    string Channel,
    string Code,
    string? Purpose = null);

public sealed record ResendVerificationRequest(
    Guid UserId,
    string Channel,
    string? Purpose = null);

public sealed record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword);

public sealed record ForgotPasswordRequest(
    string Email);

public sealed record ResetPasswordRequest(
    string Email,
    string Code,
    string NewPassword);