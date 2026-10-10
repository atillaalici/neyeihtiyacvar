using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NeyeIhtiyacVar.Api.Endpoints;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class First500DatabaseTests
{
    [Fact]
    public async Task User_row_lock_should_work_against_local_postgresql()
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
            var userId = Guid.Empty;

            var users = await db.Users
                .FromSqlInterpolated($@"SELECT * FROM ""Users"" WHERE ""Id"" = {userId} AND ""IsActive"" = TRUE FOR UPDATE")
                .ToListAsync();

            Assert.Empty(users);
        }
        finally
        {
            await transaction.RollbackAsync();
        }
    }

    [Fact]
    public async Task Promotion_lock_should_work_against_local_postgresql()
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
            var promotions = await First500PromotionQuery
                .Available(db, "TEST2026", DateTime.UtcNow)
                .ToListAsync();

            var promotion = Assert.Single(promotions);

            Assert.Equal(0, promotion.UsedCount);
            Assert.Null(promotion.UsedAtUtc);
        }
        finally
        {
            await transaction.RollbackAsync();
        }
    }
}
