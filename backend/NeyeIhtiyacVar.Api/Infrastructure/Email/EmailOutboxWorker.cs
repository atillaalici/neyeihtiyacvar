using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;

namespace NeyeIhtiyacVar.Api.Infrastructure.Email;

public sealed class EmailOutboxWorker(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<EmailOutboxWorker> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);
    private const int MaxAttempts = 5;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!configuration.GetValue<bool>("EmailOutbox:Enabled"))
        {
            logger.LogInformation("EmailOutbox servisi kapali.");
            return;
        }

        if (string.IsNullOrWhiteSpace(configuration["Email:ResendApiKey"]) ||
            string.IsNullOrWhiteSpace(configuration["Email:FromAddress"]))
        {
            logger.LogWarning("Resend ayarlari eksik. EmailOutbox baslatilmadi.");
            return;
        }

        logger.LogInformation("EmailOutbox servisi baslatildi.");

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessOneAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "EmailOutbox isleme hatasi.");
                }

                await Task.Delay(PollInterval, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal servis kapanisi.
        }
    }

    private async Task ProcessOneAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        var now = DateTime.UtcNow;
        var staleBefore = now.AddMinutes(-5);

        // Son denemede yarim kalan kayitlari Failed durumuna al.
        await db.EmailOutbox
            .Where(x => x.Status == "Processing" &&
                        x.AttemptCount >= MaxAttempts &&
                        x.ProcessingStartedAtUtc < staleBefore)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, "Failed")
                .SetProperty(x => x.ProcessingStartedAtUtc, (DateTime?)null)
                .SetProperty(x => x.LastError,
                    "Son denemede islem yarida kaldi; gonderim durumu belirsiz."),
                cancellationToken);

        // Tek SQL ifadesi: satir kilidi ve sahiplenme atomiktir.
        EmailOutbox? email = null;

        var connection = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync(cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();

            command.CommandText = """
                UPDATE "EmailOutbox"
                SET "Status" = 'Processing',
                    "ProcessingStartedAtUtc" = @now,
                    "AttemptCount" = "AttemptCount" + 1
                WHERE "Id" = (
                    SELECT "Id"
                    FROM "EmailOutbox"
                    WHERE (
                        ("Status" = 'Pending' AND "NextAttemptAtUtc" <= @now)
                        OR
                        ("Status" = 'Processing'
                         AND "ProcessingStartedAtUtc" < @staleBefore)
                    )
                    AND "AttemptCount" < @maxAttempts
                    ORDER BY "CreatedAtUtc", "Id"
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING "Id";
                """;

            void AddParameter(string name, object value)
            {
                var parameter = command.CreateParameter();
                parameter.ParameterName = name;
                parameter.Value = value;
                command.Parameters.Add(parameter);
            }

            AddParameter("now", now);
            AddParameter("staleBefore", staleBefore);
            AddParameter("maxAttempts", MaxAttempts);

            var id = await command.ExecuteScalarAsync(cancellationToken);

            if (id is Guid claimedId)
            {
                email = await db.EmailOutbox
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == claimedId, cancellationToken);
            }
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }

        if (email is null)
            return;

        EmailSendResult result;

        try
        {
            string? customHtml = null;

            if (email.Subject.StartsWith("Yeni İş Fırsatı:", StringComparison.Ordinal))
            {
                var request = await db.Set<NeedRequest>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        x => x.Id == email.NeedRequestId,
                        cancellationToken);

                if (request is not null)
                {
                    var actionUrl =
                        "https://neyeihtiyacvar.com/panel";

                    customHtml = JobOpportunityEmailTemplate.Render(
                        email.RecipientName,
                        request.Title,
                        request.Description,
                        request.City,
                        request.District,
                        request.CreatedAtUtc,
                        actionUrl);
                }
            }

            result = await sender.SendOperationalMessageAsync(
                email.ToEmail,
                email.RecipientName,
                email.Subject,
                email.Heading,
                email.Message,
                cancellationToken,
                customHtml);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "EmailOutbox gonderim hatasi. OutboxId={OutboxId}", email.Id);

            result = new EmailSendResult(false, ErrorMessage: ex.Message);
        }

        var finishedAt = DateTime.UtcNow;

        if (result.Success)
        {
            await db.EmailOutbox
                .Where(x => x.Id == email.Id &&
                            x.Status == "Processing" &&
                            x.ProcessingStartedAtUtc == now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.Status, "Sent")
                    .SetProperty(x => x.SentAtUtc, finishedAt)
                    .SetProperty(x => x.ProcessingStartedAtUtc, (DateTime?)null)
                    .SetProperty(x => x.LastError, (string?)null),
                    cancellationToken);

            return;
        }

        var error = result.ErrorMessage ?? "Bilinmeyen hata";
        if (error.Length > 1000)
            error = error[..1000];

        var exhausted = email.AttemptCount >= MaxAttempts;
        var retryAt = finishedAt.AddMinutes(
            Math.Pow(2, Math.Min(email.AttemptCount, MaxAttempts)));

        await db.EmailOutbox
            .Where(x => x.Id == email.Id &&
                        x.Status == "Processing" &&
                        x.ProcessingStartedAtUtc == now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, exhausted ? "Failed" : "Pending")
                .SetProperty(x => x.NextAttemptAtUtc, retryAt)
                .SetProperty(x => x.ProcessingStartedAtUtc, (DateTime?)null)
                .SetProperty(x => x.LastError, error),
                cancellationToken);

        logger.LogWarning(
            "EmailOutbox gonderilemedi. OutboxId={OutboxId}, Deneme={Attempt}",
            email.Id, email.AttemptCount);
    }
}
