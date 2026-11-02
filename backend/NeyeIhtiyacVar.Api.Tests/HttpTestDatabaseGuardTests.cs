namespace NeyeIhtiyacVar.Api.Tests;

public sealed class HttpTestDatabaseGuardTests
{
    [Fact]
    public void Allows_isolated_http_test_database()
    {
        const string connection =
            "Host=127.0.0.1;Port=5433;Database=neyeihtiyacvar_http_test;Username=neyeihtiyacvar;Password=test";

        HttpTestDatabaseGuard.Validate(connection);
    }

    [Theory]
    [InlineData("neyeihtiyacvar")]
    [InlineData("neyeihtiyacvar_windows_test")]
    [InlineData("postgres")]
    public void Rejects_other_databases(string database)
    {
        var connection =
            $"Host=127.0.0.1;Port=5433;Database={database};Username=neyeihtiyacvar;Password=test";

        Assert.Throws<InvalidOperationException>(
            () => HttpTestDatabaseGuard.Validate(connection));
    }
}
