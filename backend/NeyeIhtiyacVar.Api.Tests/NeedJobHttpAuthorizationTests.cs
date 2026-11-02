using System.Net;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class NeedJobHttpAuthorizationTests
{
    [Fact]
    public async Task Anonymous_user_cannot_list_need_jobs()
    {
        var connection = Environment.GetEnvironmentVariable(
            "NEYE_HTTP_TEST_CONNECTION");

        Assert.False(string.IsNullOrWhiteSpace(connection));

        HttpTestDatabaseGuard.Validate(connection);

        using var factory = new NeedJobHttpTestFactory
        {
            TestConnectionString = connection
        };

        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/need-jobs");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
