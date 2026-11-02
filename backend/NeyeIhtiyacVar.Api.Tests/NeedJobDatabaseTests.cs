using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class NeedJobDatabaseTests
{
    [Fact]
    public async Task Accepted_offer_can_create_job_without_persisting_test_data()
    {
        var configuration = new ConfigurationBuilder()
            .AddUserSecrets<AppDbContext>()
            .Build();

        var connectionString =
            configuration.GetConnectionString("DefaultConnection");

        Assert.False(string.IsNullOrWhiteSpace(connectionString));

        var builder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);

        Assert.Equal("127.0.0.1", builder.Host);
        Assert.Equal(5433, builder.Port);
        Assert.Equal("neyeihtiyacvar", builder.Database);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var db = new AppDbContext(options);

        await using var transaction =
            await db.Database.BeginTransactionAsync();

        try
        {
            var offer = await db.ProviderOffers
                .AsNoTracking()
                .Where(x => x.Status == OfferStatus.Accepted)
                .Where(x => x.NeedRequest.OwnerUserId != null)
                .Where(x => x.Provider.OwnerUserId != null)
                .Where(x =>
                    x.NeedRequest.OwnerUserId !=
                    x.Provider.OwnerUserId)
                .Where(x => !db.NeedJobs.Any(j =>
                    j.ProviderOfferId == x.Id))
                .FirstOrDefaultAsync();

            Assert.NotNull(offer);

            var job = new NeedJob
            {
                NeedRequestId = offer.NeedRequestId,
                ProviderOfferId = offer.Id,
                ProviderId = offer.ProviderId,
                Status = "Accepted"
            };

            db.NeedJobs.Add(job);
            await db.SaveChangesAsync();

            var saved = await db.NeedJobs
                .AsNoTracking()
                .SingleAsync(x => x.Id == job.Id);

            Assert.Equal(offer.NeedRequestId, saved.NeedRequestId);
            Assert.Equal(offer.ProviderId, saved.ProviderId);
            Assert.Equal("Accepted", saved.Status);
        }
        finally
        {
            await transaction.RollbackAsync();
        }
    }
}
