using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class NeedJobEndpoints
{
    public static IEndpointRouteBuilder MapNeedJobEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app
            .MapGroup("/api/need-jobs")
            .RequireAuthorization();

        group.MapGet("/", async (
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var rawUserId = principal.FindFirstValue(
                ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(rawUserId, out var userId))
            {
                return Results.Unauthorized();
            }

            var jobs = await dbContext.NeedJobs
                .AsNoTracking()
                .Where(x =>
                    x.NeedRequest.OwnerUserId == userId ||
                    x.Provider.OwnerUserId == userId)
                .OrderByDescending(x => x.AcceptedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.NeedRequestId,
                    needTitle = x.NeedRequest.Title,
                    x.ProviderOfferId,
                    x.ProviderId,
                    businessName = x.Provider.BusinessName,
                    x.Status,
                    x.AcceptedAtUtc,
                    x.ProviderCompletedAtUtc,
                    x.CustomerConfirmedAtUtc,
                    x.DisputedAtUtc,
                    x.AutoFinalizedAtUtc,
                    x.DisputeReason,
                    isCustomer = x.NeedRequest.OwnerUserId == userId,
                    isProvider = x.Provider.OwnerUserId == userId
                })
                .ToListAsync();

            return Results.Ok(jobs);
        });

        group.MapPost("/{jobId:guid}/provider-complete", async (
            Guid jobId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var rawUserId = principal.FindFirstValue(
                ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(rawUserId, out var userId))
            {
                return Results.Unauthorized();
            }

            var job = await dbContext.NeedJobs
                .Include(x => x.Provider)
                .FirstOrDefaultAsync(x => x.Id == jobId);

            if (job is null ||
                job.Provider.OwnerUserId != userId)
            {
                return Results.NotFound(new
                {
                    message = "İş kaydı bulunamadı."
                });
            }

            if (job.Status != "Accepted")
            {
                return Results.Conflict(new
                {
                    message = "Bu işin durumu tamamlama bildirimi için uygun değil."
                });
            }

            var now = DateTime.UtcNow;

            job.Status = "ProviderCompleted";
            job.ProviderCompletedAtUtc = now;
            job.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                jobId = job.Id,
                status = job.Status,
                providerCompletedAtUtc = job.ProviderCompletedAtUtc,
                message = "İşin tamamlandığı bildirildi. Müşteri onayı bekleniyor."
            });
        });

        group.MapPost("/{jobId:guid}/customer-confirm", async (
            Guid jobId,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var rawUserId = principal.FindFirstValue(
                ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(rawUserId, out var userId))
            {
                return Results.Unauthorized();
            }

            var job = await dbContext.NeedJobs
                .Include(x => x.NeedRequest)
                .FirstOrDefaultAsync(x => x.Id == jobId);

            if (job is null ||
                job.NeedRequest.OwnerUserId != userId)
            {
                return Results.NotFound(new
                {
                    message = "İş kaydı bulunamadı."
                });
            }

            if (job.Status != "ProviderCompleted")
            {
                return Results.Conflict(new
                {
                    message = "Bu iş müşteri onayı için uygun durumda değil."
                });
            }

            var now = DateTime.UtcNow;

            job.Status = "CustomerConfirmed";
            job.CustomerConfirmedAtUtc = now;
            job.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                jobId = job.Id,
                status = job.Status,
                customerConfirmedAtUtc = job.CustomerConfirmedAtUtc,
                message = "İşin tamamlandığı onaylandı."
            });
        });

        group.MapPost("/{jobId:guid}/dispute", async (
            Guid jobId,
            DisputeNeedJobRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext) =>
        {
            var rawUserId = principal.FindFirstValue(
                ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(rawUserId, out var userId))
            {
                return Results.Unauthorized();
            }

            var job = await dbContext.NeedJobs
                .Include(x => x.NeedRequest)
                .FirstOrDefaultAsync(x => x.Id == jobId);

            if (job is null ||
                job.NeedRequest.OwnerUserId != userId)
            {
                return Results.NotFound(new
                {
                    message = "İş kaydı bulunamadı."
                });
            }

            if (job.Status != "ProviderCompleted")
            {
                return Results.Conflict(new
                {
                    message = "Bu iş itiraz için uygun durumda değil."
                });
            }

            var reason = request.Reason?.Trim();

            if (string.IsNullOrWhiteSpace(reason) ||
                reason.Length > 2000)
            {
                return Results.BadRequest(new
                {
                    message = "İtiraz gerekçesi 1-2000 karakter arasında olmalıdır."
                });
            }

            var now = DateTime.UtcNow;

            job.Status = "Disputed";
            job.DisputeReason = reason;
            job.DisputedAtUtc = now;
            job.UpdatedAtUtc = now;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                jobId = job.Id,
                status = job.Status,
                disputedAtUtc = job.DisputedAtUtc,
                message = "İtirazınız kaydedildi."
            });
        });

        return app;
    }
}

public sealed record DisputeNeedJobRequest(string? Reason);
