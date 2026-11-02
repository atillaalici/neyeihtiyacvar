using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure.Auth;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class NeedJobJwtTests
{
    [Fact]
    public async Task Validly_signed_token_for_nonexistent_user_is_rejected()
    {
        var connection = Environment.GetEnvironmentVariable(
            "NEYE_HTTP_TEST_CONNECTION");

        Assert.False(string.IsNullOrWhiteSpace(connection));
        HttpTestDatabaseGuard.Validate(connection);

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = $"jwt-test-{Guid.NewGuid():N}@example.invalid",
            DisplayName = "JWT Test Kullanıcısı",
            Role = UserRole.User,
            IsActive = true
        };

        var jwtOptions = Options.Create(new JwtOptions
        {
            Key = "NeedJobHttpTests_Only_Local_Test_Key_2026",
            Issuer = "NeyeIhtiyacVar.Api",
            Audience = "NeyeIhtiyacVar.Frontend"
        });

        var token = new JwtTokenService(jwtOptions)
            .CreateToken(user)
            .AccessToken;

        using var factory = new NeedJobHttpTestFactory
        {
            TestConnectionString = connection!
        };

        using var client = factory.CreateClient();

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.GetAsync("/api/need-jobs");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
