using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public sealed class NeedDistributionWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<NeedDistributionWorker> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval =
        TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        logger.LogInformation("Talep dagitim servisi baslatildi.");

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessAsync(stoppingToken);
                }
                catch (OperationCanceledException)
                    when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex, "Talep dagitim servisi hatasi.");
                }

                await Task.Delay(PollInterval, stoppingToken);
            }
        }
        catch (OperationCanceledException)
            when (stoppingToken.IsCancellationRequested)
        {
            // Normal servis kapanisi.
        }
    }

    private async Task ProcessAsync(
        CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;

        var needs = await db.NeedRequests
            .Where(x =>
                x.DistributionEnabled &&
                x.TargetProviderId == null &&
                x.IsActive &&
                x.AcceptingNewOffers &&
                (x.Status == NeedStatus.Open ||
                 x.Status == NeedStatus.OfferReceived) &&
                x.CreatedAtUtc <= now.AddHours(-3))
            .Include(x => x.Offers)
            .ToListAsync(cancellationToken);

        foreach (var need in needs)
        {
            var validOfferCount = need.Offers.Count(x =>
                x.Status == OfferStatus.Pending ||
                x.Status == OfferStatus.Accepted);

            var elapsed = now - need.CreatedAtUtc;

            if (NeedDistributionPolicy.ShouldAutoClose(
                    elapsed, validOfferCount))
            {
                need.Status = NeedStatus.Cancelled;
                need.IsActive = false;
                need.AcceptingNewOffers = false;
                need.AutoClosedAtUtc = now;
                need.UpdatedAtUtc = now;

                logger.LogInformation(
                    "Talep otomatik kapatildi: {NeedId}",
                    need.Id);

                continue;
            }

            var nextStage = NeedDistributionPolicy.GetNextStage(
                need.DistributionStage,
                elapsed,
                validOfferCount);

            if (nextStage == need.DistributionStage)
                continue;

            need.DistributionStage = nextStage;
            need.DistributionUpdatedAtUtc = now;
            need.UpdatedAtUtc = now;

            logger.LogInformation(
                "Talep dagitim asamasi guncellendi: {NeedId}, {Stage}",
                need.Id,
                nextStage);
        }

        if (db.ChangeTracker.HasChanges())
            await db.SaveChangesAsync(cancellationToken);
    }
}
