using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderImageEndpoints
{
    private const long MaxFileSize = 5 * 1024 * 1024;

    private static readonly Dictionary<string, string> AllowedTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp"
        };

    public static IEndpointRouteBuilder MapProviderImageEndpoints(
        this IEndpointRouteBuilder app)
    {
        var panel = app
            .MapGroup("/api/provider-panel/image")
            .RequireAuthorization();

        panel.MapPost("/", async (
            HttpContext httpContext,
            HttpRequest request,
            AppDbContext dbContext,
            IWebHostEnvironment environment) =>
        {
            var userId = GetUserId(httpContext.User);

            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .SingleOrDefaultAsync(x => x.OwnerUserId == userId.Value);

            if (provider is null)
            {
                return Results.NotFound(new
                {
                    message = "Bu hesaba bagli isletme bulunamadi."
                });
            }

            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new
                {
                    message = "Gorsel multipart/form-data olarak gonderilmelidir."
                });
            }

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");

            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(new
                {
                    message = "Bir gorsel secmelisiniz."
                });
            }

            if (file.Length > MaxFileSize)
            {
                return Results.BadRequest(new
                {
                    message = "Gorsel en fazla 5 MB olabilir."
                });
            }

            if (!AllowedTypes.TryGetValue(file.ContentType, out var extension))
            {
                return Results.BadRequest(new
                {
                    message = "Yalnizca JPG, PNG veya WebP gorsel yukleyebilirsiniz."
                });
            }

            var folder = GetImageFolder(environment);
            Directory.CreateDirectory(folder);

            DeleteExistingFiles(folder, provider.Id);

            var targetPath = Path.Combine(
                folder,
                $"{provider.Id:N}{extension}");

            await using (var stream = File.Create(targetPath))
            {
                await file.CopyToAsync(stream);
            }

            return Results.Ok(new
            {
                providerId = provider.Id,
                imageUrl = $"/api/providers/{provider.Id}/image",
                message = "Isletme gorseli kaydedildi."
            });
        });

        panel.MapDelete("/", async (
            HttpContext httpContext,
            AppDbContext dbContext,
            IWebHostEnvironment environment) =>
        {
            var userId = GetUserId(httpContext.User);

            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var provider = await dbContext.Providers
                .AsNoTracking()
                .SingleOrDefaultAsync(x => x.OwnerUserId == userId.Value);

            if (provider is null)
            {
                return Results.NotFound();
            }

            var folder = GetImageFolder(environment);
            var deleted = DeleteExistingFiles(folder, provider.Id);

            return Results.Ok(new
            {
                deleted,
                message = deleted
                    ? "Isletme gorseli silindi."
                    : "Silinecek gorsel bulunamadi."
            });
        });

        app.MapGet("/api/providers/{providerId:guid}/image", (
            Guid providerId,
            IWebHostEnvironment environment) =>
        {
            var folder = GetImageFolder(environment);

            foreach (var extension in AllowedTypes.Values.Distinct())
            {
                var path = Path.Combine(
                    folder,
                    $"{providerId:N}{extension}");

                if (!File.Exists(path))
                {
                    continue;
                }

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

            return Results.NotFound();
        });

        return app;
    }

    private static Guid? GetUserId(ClaimsPrincipal user)
    {
        var value =
            user.FindFirstValue(ClaimTypes.NameIdentifier) ??
            user.FindFirstValue("sub");

        return Guid.TryParse(value, out var userId)
            ? userId
            : null;
    }

    private static string GetImageFolder(
        IWebHostEnvironment environment)
    {
        return Path.Combine(
            environment.ContentRootPath,
            "App_Data",
            "provider-images");
    }

    private static bool DeleteExistingFiles(
        string folder,
        Guid providerId)
    {
        if (!Directory.Exists(folder))
        {
            return false;
        }

        var deleted = false;

        foreach (var extension in AllowedTypes.Values.Distinct())
        {
            var path = Path.Combine(
                folder,
                $"{providerId:N}{extension}");

            if (!File.Exists(path))
            {
                continue;
            }

            File.Delete(path);
            deleted = true;
        }

        return deleted;
    }
}