using Npgsql;

namespace NeyeIhtiyacVar.Api.Tests;

public static class HttpTestDatabaseGuard
{
    public const string DatabaseName = "neyeihtiyacvar_http_test";

    public static void Validate(string connectionString)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString);

        if (builder.Host != "127.0.0.1" ||
            builder.Port != 5433 ||
            builder.Database != DatabaseName ||
            builder.Username != "neyeihtiyacvar")
        {
            throw new InvalidOperationException(
                "HTTP testleri yalnızca bağımsız test veritabanında çalışabilir.");
        }
    }
}
