namespace NeyeIhtiyacVar.Api.Tests;

public sealed class NeedJobHttpFactorySafetyTests
{
    [Fact]
    public void Rejects_development_database_before_server_starts()
    {
        using var factory = new NeedJobHttpTestFactory
        {
            TestConnectionString =
                "Host=127.0.0.1;Port=5433;Database=neyeihtiyacvar;Username=neyeihtiyacvar;Password=test"
        };

        var error = Assert.Throws<InvalidOperationException>(
            () => factory.CreateClient());

        Assert.Contains(
            "bağımsız test veritabanında",
            error.ToString());
    }
}
