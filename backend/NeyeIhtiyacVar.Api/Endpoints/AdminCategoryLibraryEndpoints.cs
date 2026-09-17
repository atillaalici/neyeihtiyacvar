using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminCategoryLibraryEndpoints
{
    public static IEndpointRouteBuilder MapAdminCategoryLibraryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/category-library").RequireAuthorization("AdminOnly");

        group.MapGet("/", async (AppDbContext db) =>
        {
            var categories = await db.Categories.AsNoTracking().Where(x => x.IsActive)
                .Include(x => x.Services).OrderBy(x => x.SortOrder).ToListAsync();
            var works = await db.CategoryLibraryWorks.AsNoTracking().Where(x => x.IsActive)
                .Include(x => x.Phrases).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync();

            return Results.Ok(categories.Select(c => new {
                c.Id, c.Name, c.Slug,
                services = c.Services.Where(s => s.IsActive).OrderBy(s => s.SortOrder).Select(s => new {
                    s.Id, s.Name,
                    works = works.Where(w => w.CategoryServiceId == s.Id).Select(w => new {
                        w.Id, w.Name, w.SortOrder, w.IsActive,
                        phrases = w.Phrases.Where(p => p.IsActive).OrderBy(p => p.Phrase)
                            .Select(p => new { p.Id, p.Phrase, p.IsActive })
                    })
                })
            }));
        });

        group.MapPost("/works", async ([FromBody] CreateWorkRequest request, AppDbContext db) =>
        {
            var name=(request.Name??"").Trim();
            if(name.Length<2 || name.Length>200) return Results.BadRequest(new { message="İş / ihtiyaç adı 2-200 karakter olmalıdır." });
            if(!await db.CategoryServices.AnyAsync(x=>x.Id==request.CategoryServiceId && x.IsActive))
                return Results.BadRequest(new { message="Aktif hizmet bulunamadı." });
            var normalized=Normalize(name);
            if(await db.CategoryLibraryWorks.AnyAsync(x=>x.CategoryServiceId==request.CategoryServiceId && x.NormalizedName==normalized))
                return Results.Conflict(new { message="Bu iş / ihtiyaç zaten kayıtlı." });
            var item=new CategoryLibraryWork { CategoryServiceId=request.CategoryServiceId, Name=name, NormalizedName=normalized, SortOrder=request.SortOrder };
            db.CategoryLibraryWorks.Add(item); await db.SaveChangesAsync();
            return Results.Ok(new { item.Id, item.Name });
        });

        group.MapPut("/works/{id:guid}", async (Guid id,[FromBody] UpdateWorkRequest request,AppDbContext db) =>
        {
            var item=await db.CategoryLibraryWorks.FindAsync(id); if(item is null) return Results.NotFound();
            var name=(request.Name??"").Trim(); if(name.Length<2||name.Length>200) return Results.BadRequest(new {message="Geçersiz ad."});
            var n=Normalize(name);
            if(await db.CategoryLibraryWorks.AnyAsync(x=>x.Id!=id && x.CategoryServiceId==item.CategoryServiceId && x.NormalizedName==n))
                return Results.Conflict(new {message="Bu iş / ihtiyaç zaten kayıtlı."});
            item.Name=name;item.NormalizedName=n;item.SortOrder=request.SortOrder;item.IsActive=request.IsActive;item.UpdatedAtUtc=DateTime.UtcNow;
            await db.SaveChangesAsync(); return Results.Ok();
        });

        group.MapPost("/works/{workId:guid}/phrases", async (Guid workId,[FromBody] PhraseRequest request,AppDbContext db) =>
        {
            if(!await db.CategoryLibraryWorks.AnyAsync(x=>x.Id==workId && x.IsActive)) return Results.NotFound();
            var phrase=(request.Phrase??"").Trim(); if(phrase.Length<2||phrase.Length>500) return Results.BadRequest(new {message="Cümle 2-500 karakter olmalıdır."});
            var n=Normalize(phrase);
            if(await db.CategoryLibraryPhrases.AnyAsync(x=>x.CategoryLibraryWorkId==workId && x.NormalizedPhrase==n))
                return Results.Conflict(new {message="Bu kullanıcı cümlesi zaten kayıtlı."});
            var item=new CategoryLibraryPhrase{CategoryLibraryWorkId=workId,Phrase=phrase,NormalizedPhrase=n};
            db.CategoryLibraryPhrases.Add(item);await db.SaveChangesAsync();return Results.Ok(new{item.Id,item.Phrase});
        });

        group.MapDelete("/phrases/{id:guid}", async (Guid id,AppDbContext db) =>
        {
            var item=await db.CategoryLibraryPhrases.FindAsync(id);if(item is null)return Results.NotFound();
            item.IsActive=false;item.UpdatedAtUtc=DateTime.UtcNow;await db.SaveChangesAsync();return Results.Ok();
        });

        group.MapPost("/services", async (
            CreateCategoryServiceRequest request,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var name = request.Name?.Trim() ?? string.Empty;
            if (request.CategoryId == Guid.Empty || name.Length < 2)
                return Results.BadRequest("Kategori ve hizmet adı zorunludur.");

            var categoryExists = await dbContext.Categories
                .AnyAsync(x => x.Id == request.CategoryId && x.IsActive, cancellationToken);
            if (!categoryExists) return Results.NotFound("Kategori bulunamadı.");

            var duplicate = await dbContext.CategoryServices
                .AnyAsync(x => x.CategoryId == request.CategoryId && x.Name.ToLower() == name.ToLower(), cancellationToken);
            if (duplicate) return Results.Conflict("Bu hizmet zaten mevcut.");

            var entity = new CategoryService
            {
                Id = Guid.NewGuid(),
                CategoryId = request.CategoryId,
                Name = name,
                IsActive = true
            };
            dbContext.CategoryServices.Add(entity);
            await dbContext.SaveChangesAsync(cancellationToken);
            return Results.Ok(new { entity.Id, entity.Name });
        });

        group.MapDelete("/services/{id:guid}", async (
            Guid id,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var service = await dbContext.CategoryServices
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (service is null) return Results.NotFound("Hizmet bulunamadı.");

            service.IsActive = false;

            var works = await dbContext.CategoryLibraryWorks
                .Where(x => x.CategoryServiceId == id && x.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var work in works)
            {
                work.IsActive = false;
                work.UpdatedAtUtc = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            return Results.NoContent();
        });

        group.MapPost("/services/{serviceId:guid}/phrases", async (
            Guid serviceId,
            CreateServicePhraseRequest request,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var phrase = (request.Phrase ?? string.Empty).Trim();
            if (phrase.Length < 2) return Results.BadRequest("Kullanıcı cümlesi zorunludur.");

            var service = await dbContext.CategoryServices
                .FirstOrDefaultAsync(x => x.Id == serviceId && x.IsActive, cancellationToken);
            if (service is null) return Results.NotFound("Hizmet bulunamadı.");

            var normalized = phrase.ToLowerInvariant();
            var existingPhrases = await dbContext.CategoryLibraryPhrases
                .Where(x => x.IsActive)
                .Include(x => x.Work)
                .Where(x => x.Work.CategoryServiceId == serviceId)
                .ToListAsync(cancellationToken);

            if (existingPhrases.Any(x => x.NormalizedPhrase == normalized))
                return Results.Conflict("Bu kullanıcı cümlesi zaten mevcut.");

            var work = await dbContext.CategoryLibraryWorks
                .Where(x => x.CategoryServiceId == serviceId && x.IsActive)
                .OrderBy(x => x.SortOrder)
                .FirstOrDefaultAsync(cancellationToken);

            if (work is null)
            {
                work = new CategoryLibraryWork {
                    Id = Guid.NewGuid(),
                    CategoryServiceId = serviceId,
                    Name = service.Name,
                    NormalizedName = service.Name.ToLowerInvariant(),
                    SortOrder = 0,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                dbContext.CategoryLibraryWorks.Add(work);
            }

            var entity = new CategoryLibraryPhrase {
                Id = Guid.NewGuid(),
                CategoryLibraryWorkId = work.Id,
                Phrase = phrase,
                NormalizedPhrase = normalized,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            dbContext.CategoryLibraryPhrases.Add(entity);
            await dbContext.SaveChangesAsync(cancellationToken);
            return Results.Ok(new { entity.Id, entity.Phrase });
        });
        return app;
    }

    private static string Normalize(string value)
    {
        var form=value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb=new StringBuilder();
        foreach(var ch in form) if(CharUnicodeInfo.GetUnicodeCategory(ch)!=UnicodeCategory.NonSpacingMark) sb.Append(ch);
        return string.Join(" ",sb.ToString().Normalize(NormalizationForm.FormC).Split(' ',StringSplitOptions.RemoveEmptyEntries));
    }
}

public sealed record CreateCategoryServiceRequest(Guid CategoryId, string Name);

public sealed record CreateWorkRequest(Guid CategoryServiceId,string? Name,int SortOrder=0);
public sealed record UpdateWorkRequest(string? Name,int SortOrder,bool IsActive);
public sealed record PhraseRequest(string? Phrase);
public sealed record CreateServicePhraseRequest(string Phrase);
