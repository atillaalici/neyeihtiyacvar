using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Endpoints;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class PromotionLockSqlTests
{
    [Fact]
    public void User_lock_query_should_preserve_for_update()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=sql_generation_only;Username=test;Password=test")
            .Options;

        using var db = new AppDbContext(options);
        var userId = Guid.NewGuid();

        var sql = db.Users
            .FromSqlInterpolated($@"SELECT * FROM ""Users"" WHERE ""Id"" = {userId} AND ""IsActive"" = TRUE FOR UPDATE")
            .ToQueryString();

        Assert.Contains("FOR UPDATE", sql);
        Assert.DoesNotContain("FROM (", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Production_promotion_query_should_preserve_row_lock()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=sql_generation_only;Username=test;Password=test")
            .Options;

        using var db = new AppDbContext(options);

        var sql = First500PromotionQuery
            .Available(db, "TEST2026", DateTime.UtcNow)
            .ToQueryString();

        Assert.Contains("FOR UPDATE OF p SKIP LOCKED", sql);
        Assert.Contains("""p."MaxUses" = 1""", sql);
        Assert.Contains("""c."PlanCode" = 'kobi'""", sql);
        Assert.DoesNotContain("FROM (", sql, StringComparison.OrdinalIgnoreCase);
    }
}
