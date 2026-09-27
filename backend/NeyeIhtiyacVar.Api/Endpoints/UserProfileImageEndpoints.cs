using System.Security.Claims;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class UserProfileImageEndpoints
{
    private const long MaxFileSize = 2 * 1024 * 1024;

    private static readonly Dictionary<string, string> AllowedTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp"
        };

    public static IEndpointRouteBuilder MapUserProfileImageEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth/profile-image")
            .RequireAuthorization();

        group.MapPost("/", async (
            HttpContext ctx,
            HttpRequest request,
            IWebHostEnvironment env) =>
        {
            var userId = GetUserId(ctx.User);

            if (userId is null)
            {
                return Results.Unauthorized();
            }

            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new
                {
                    message = "Profil fotoğrafı multipart/form-data olarak gönderilmelidir."
                });
            }

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");

            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(new
                {
                    message = "Bir profil fotoğrafı seçmelisiniz."
                });
            }

            if (file.Length > MaxFileSize)
            {
                return Results.BadRequest(new
                {
                    message = "Profil fotoğrafı en fazla 2 MB olabilir."
                });
            }

            if (!AllowedTypes.TryGetValue(file.ContentType, out var extension))
            {
                return Results.BadRequest(new
                {
                    message = "Yalnızca JPG, PNG veya WebP fotoğraf yükleyebilirsiniz."
                });
            }

            var folder = GetImageFolder(env);
            Directory.CreateDirectory(folder);

            DeleteExistingImages(folder, userId.Value);

            var target = Path.Combine(
                folder,
                $"{userId.Value:N}{extension}");

            await using (var stream = File.Create(target))
            {
                await file.CopyToAsync(stream);
            }

            return Results.Ok(new
            {
                imageUrl = $"/api/users/{userId.Value}/profile-image",
                message = "Profil fotoğrafınız kaydedildi."
            });
        });

        group.MapDelete("/", (
            HttpContext ctx,
            IWebHostEnvironment env) =>
        {
            var userId = GetUserId(ctx.User);

            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var folder = GetImageFolder(env);
            var deleted = DeleteExistingImages(folder, userId.Value);

            return Results.Ok(new
            {
                deleted,
                message = deleted
                    ? "Profil fotoğrafınız silindi."
                    : "Silinecek profil fotoğrafı bulunamadı."
            });
        });

        app.MapGet("/api/users/{userId:guid}/profile-image", (
            Guid userId,
            IWebHostEnvironment env) =>
        {
            var path = FindImage(env, userId);

            if (path is null)
            {
                return Results.NotFound();
            }

            return FileResult(path);
        });

        return app;
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var raw =
            principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
            principal.FindFirstValue("sub");

        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private static string GetImageFolder(IWebHostEnvironment env)
    {
        var configuredPath =
            Environment.GetEnvironmentVariable("USER_PROFILE_IMAGE_PATH");

        return string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(
                env.ContentRootPath,
                "App_Data",
                "user-profile-images")
            : Path.GetFullPath(configuredPath);
    }

    private static string? FindImage(
        IWebHostEnvironment env,
        Guid userId)
    {
        var folder = GetImageFolder(env);

        foreach (var extension in AllowedTypes.Values.Distinct())
        {
            var path = Path.Combine(
                folder,
                $"{userId:N}{extension}");

            if (File.Exists(path))
            {
                return path;
            }
        }

        return null;
    }

    private static bool DeleteExistingImages(
        string folder,
        Guid userId)
    {
        var deleted = false;

        foreach (var extension in AllowedTypes.Values.Distinct())
        {
            var path = Path.Combine(
                folder,
                $"{userId:N}{extension}");

            if (!File.Exists(path))
            {
                continue;
            }

            File.Delete(path);
            deleted = true;
        }

        return deleted;
    }

    private static IResult FileResult(string path)
    {
        var extension = Path.GetExtension(path).ToLowerInvariant();

        var contentType = extension switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };

        return Results.File(
            path,
            contentType,
            enableRangeProcessing: true);
    }
}
