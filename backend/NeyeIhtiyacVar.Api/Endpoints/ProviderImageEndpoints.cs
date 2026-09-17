using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class ProviderImageEndpoints
{
    private const long MaxFileSize = 5 * 1024 * 1024;
    private const int MaxImages = 5;

    private static readonly Dictionary<string, string> AllowedTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp"
        };

    public static IEndpointRouteBuilder MapProviderImageEndpoints(this IEndpointRouteBuilder app)
    {
        var panel = app.MapGroup("/api/provider-panel/image").RequireAuthorization();

        panel.MapGet("/", async (HttpContext ctx, AppDbContext db, IWebHostEnvironment env) =>
        {
            var provider = await GetProvider(ctx.User, db);
            if (provider is null) return Results.NotFound();

            EnsureLegacyImageInGallery(env, provider.Id);
            var coverIndex = GetCoverIndex(env, provider.Id);

            return Results.Ok(GetImageSlots(env, provider.Id).Select(x => new
            {
                index = x.Index,
                imageUrl = $"/api/providers/{provider.Id}/images/{x.Index}",
                isCover = x.Index == coverIndex
            }));
        });

        panel.MapPost("/", async (HttpContext ctx, HttpRequest request, AppDbContext db, IWebHostEnvironment env) =>
        {
            var provider = await GetProvider(ctx.User, db);
            if (provider is null) return Results.NotFound(new { message = "İşletme bulunamadı." });
            if (!request.HasFormContentType) return Results.BadRequest(new { message = "Görsel multipart/form-data olarak gönderilmelidir." });

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");
            if (file is null || file.Length == 0) return Results.BadRequest(new { message = "Bir görsel seçmelisiniz." });
            if (file.Length > MaxFileSize) return Results.BadRequest(new { message = "Görsel en fazla 5 MB olabilir." });
            if (!AllowedTypes.TryGetValue(file.ContentType, out var ext)) return Results.BadRequest(new { message = "Yalnızca JPG, PNG veya WebP görsel yükleyebilirsiniz." });

            EnsureLegacyImageInGallery(env, provider.Id);
            var slots = GetImageSlots(env, provider.Id);
            if (slots.Count >= MaxImages) return Results.BadRequest(new { message = "Bir işletme en fazla 5 fotoğraf yükleyebilir." });

            var slot = Enumerable.Range(1, MaxImages).First(i => !SlotExists(env, provider.Id, i));
            var folder = GetImageFolder(env);
            Directory.CreateDirectory(folder);
            var target = Path.Combine(folder, $"{provider.Id:N}-{slot}{ext}");
            var hadNoCover = GetCoverIndex(env, provider.Id) == 0;

            await using (var stream = File.Create(target))
                await file.CopyToAsync(stream);

            if (hadNoCover) SetCoverIndex(env, provider.Id, slot);

            return Results.Ok(new
            {
                providerId = provider.Id,
                index = slot,
                imageUrl = $"/api/providers/{provider.Id}/images/{slot}",
                count = GetImageSlots(env, provider.Id).Count,
                max = MaxImages,
                message = "İşletme fotoğrafı kaydedildi."
            });
        });

        panel.MapDelete("/{index:int}", async (int index, HttpContext ctx, AppDbContext db, IWebHostEnvironment env) =>
        {
            if (index < 1 || index > MaxImages) return Results.BadRequest(new { message = "Geçersiz fotoğraf." });
            var provider = await GetProvider(ctx.User, db);
            if (provider is null) return Results.NotFound();

            var oldCover = GetCoverIndex(env, provider.Id);
            var deleted = DeleteSlot(env, provider.Id, index);

            if (deleted && oldCover == index)
            {
                var next = GetImageSlots(env, provider.Id).Select(x => x.Index).FirstOrDefault();
                if (next > 0) SetCoverIndex(env, provider.Id, next);
                else DeleteCoverFile(env, provider.Id);
            }

            return Results.Ok(new
            {
                deleted,
                message = deleted ? "İşletme fotoğrafı silindi." : "Silinecek fotoğraf bulunamadı."
            });
        });

        app.MapGet("/api/providers/{providerId:guid}/image", (Guid providerId, IWebHostEnvironment env) =>
        {
            EnsureLegacyImageInGallery(env, providerId);
            var coverIndex = GetCoverIndex(env, providerId);
            var cover = coverIndex > 0 ? FindSlot(env, providerId, coverIndex) : null;
            if (cover is not null) return FileResult(cover);

            var first = GetImageSlots(env, providerId).FirstOrDefault();
            if (first.Path is not null) return FileResult(first.Path);

            var legacy = FindLegacy(env, providerId);
            return legacy is null ? Results.NotFound() : FileResult(legacy);
        });

        app.MapGet("/api/providers/{providerId:guid}/images", (Guid providerId, IWebHostEnvironment env) =>
        {
            EnsureLegacyImageInGallery(env, providerId);
            var coverIndex = GetCoverIndex(env, providerId);
            return Results.Ok(GetImageSlots(env, providerId).Select(x => new
            {
                index = x.Index,
                imageUrl = $"/api/providers/{providerId}/images/{x.Index}",
                isCover = x.Index == coverIndex
            }));
        });

        app.MapGet("/api/providers/{providerId:guid}/images/{index:int}", (Guid providerId, int index, IWebHostEnvironment env) =>
        {
            var path = FindSlot(env, providerId, index);
            return path is null ? Results.NotFound() : FileResult(path);
        });

        panel.MapPut("/cover/{index:int}", async (int index, HttpContext ctx, AppDbContext db, IWebHostEnvironment env) =>
        {
            if (index < 1 || index > MaxImages)
                return Results.BadRequest(new { message = "Geçersiz fotoğraf." });

            var provider = await GetProvider(ctx.User, db);
            if (provider is null) return Results.NotFound(new { message = "İşletme bulunamadı." });
            if (!SlotExists(env, provider.Id, index))
                return Results.NotFound(new { message = "Fotoğraf bulunamadı." });

            SetCoverIndex(env, provider.Id, index);
            return Results.Ok(new { coverIndex = index, message = "Kapak fotoğrafı değiştirildi." });
        });

        app.MapGet("/api/providers/{providerId:guid}/cover-image", (Guid providerId, IWebHostEnvironment env) =>
        {
            EnsureLegacyImageInGallery(env, providerId);
            var index = GetCoverIndex(env, providerId);
            if (index == 0)
            {
                var legacy = FindLegacy(env, providerId);
                return legacy is null ? Results.NotFound() : FileResult(legacy);
            }

            var path = FindSlot(env, providerId, index);
            return path is null ? Results.NotFound() : FileResult(path);
        });

        return app;
    }

    private static async Task<NeyeIhtiyacVar.Api.Domain.Provider?> GetProvider(ClaimsPrincipal principal, AppDbContext db)
    {
        var id = GetUserId(principal);
        return id is null ? null : await db.Providers.FirstOrDefaultAsync(x => x.OwnerUserId == id.Value);
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private static string GetImageFolder(IWebHostEnvironment env) =>
        Path.Combine(env.ContentRootPath, "App_Data", "provider-images");

    private static List<(int Index, string Path)> GetImageSlots(IWebHostEnvironment env, Guid id)
    {
        var list = new List<(int Index, string Path)>();
        for (var i = 1; i <= MaxImages; i++)
        {
            var path = FindSlot(env, id, i);
            if (path is not null) list.Add((i, path));
        }
        return list;
    }

    private static bool SlotExists(IWebHostEnvironment env, Guid id, int index) =>
        FindSlot(env, id, index) is not null;

    private static string? FindSlot(IWebHostEnvironment env, Guid id, int index)
    {
        var folder = GetImageFolder(env);
        foreach (var ext in AllowedTypes.Values.Distinct())
        {
            var path = Path.Combine(folder, $"{id:N}-{index}{ext}");
            if (File.Exists(path)) return path;
        }
        return null;
    }

    private static string? FindLegacy(IWebHostEnvironment env, Guid id)
    {
        var folder = GetImageFolder(env);
        foreach (var ext in AllowedTypes.Values.Distinct())
        {
            var path = Path.Combine(folder, $"{id:N}{ext}");
            if (File.Exists(path)) return path;
        }
        return null;
    }

    private static bool DeleteSlot(IWebHostEnvironment env, Guid id, int index)
    {
        var path = FindSlot(env, id, index);
        if (path is null) return false;
        File.Delete(path);
        return true;
    }

    private static IResult FileResult(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        var type = ext switch { ".png" => "image/png", ".webp" => "image/webp", _ => "image/jpeg" };
        return Results.File(path, type, enableRangeProcessing: true);
    }

    private static string GetCoverFile(IWebHostEnvironment env, Guid id) =>
        Path.Combine(GetImageFolder(env), $"{id:N}-cover.txt");

    private static int GetCoverIndex(IWebHostEnvironment env, Guid id)
    {
        var file = GetCoverFile(env, id);
        if (File.Exists(file) && int.TryParse(File.ReadAllText(file), out var index) &&
            index >= 1 && index <= MaxImages && SlotExists(env, id, index))
            return index;

        return GetImageSlots(env, id).Select(x => x.Index).FirstOrDefault();
    }

    private static void SetCoverIndex(IWebHostEnvironment env, Guid id, int index)
    {
        Directory.CreateDirectory(GetImageFolder(env));
        File.WriteAllText(GetCoverFile(env, id), index.ToString());
    }

    private static void DeleteCoverFile(IWebHostEnvironment env, Guid id)
    {
        var file = GetCoverFile(env, id);
        if (File.Exists(file)) File.Delete(file);
    }

    private static void EnsureLegacyImageInGallery(IWebHostEnvironment env, Guid providerId)
    {
        if (GetImageSlots(env, providerId).Any()) return;

        var legacy = FindLegacy(env, providerId);
        if (legacy is null || !File.Exists(legacy)) return;

        var extension = Path.GetExtension(legacy);
        var folder = GetImageFolder(env);
        Directory.CreateDirectory(folder);
        var target = Path.Combine(folder, $"{providerId:N}-1{extension}");
        if (!File.Exists(target)) File.Copy(legacy, target, false);

        SetCoverIndex(env, providerId, 1);
    }
}
