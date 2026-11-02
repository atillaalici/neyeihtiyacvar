using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;
using NeyeIhtiyacVar.Api.Infrastructure.Auth;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class NeedJobHttpLifecycleTests
{
    [Theory]
    [InlineData("confirm", "CustomerConfirmed")]
    [InlineData("dispute", "Disputed")]
    public async Task Provider_completion_then_customer_decision_works(
        string decision,
        string expectedStatus)
    {
        var connection = Environment.GetEnvironmentVariable(
            "NEYE_HTTP_TEST_CONNECTION");

        Assert.False(string.IsNullOrWhiteSpace(connection));
        HttpTestDatabaseGuard.Validate(connection!);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connection)
            .Options;

        var customer = new AppUser
        {
            Email = $"customer-{Guid.NewGuid():N}@example.invalid",
            NormalizedEmail = $"CUSTOMER-{Guid.NewGuid():N}@EXAMPLE.INVALID",
            PasswordHash = "http-test-only",
            DisplayName = "HTTP Test Müşteri"
        };

        customer.NormalizedEmail = customer.Email.ToUpperInvariant();

        var providerUser = new AppUser
        {
            Email = $"provider-{Guid.NewGuid():N}@example.invalid",
            NormalizedEmail = "",
            PasswordHash = "http-test-only",
            DisplayName = "HTTP Test İşletme"
        };

        providerUser.NormalizedEmail =
            providerUser.Email.ToUpperInvariant();

        var provider = new Provider
        {
            OwnerUserId = providerUser.Id,
            Slug = $"http-test-{Guid.NewGuid():N}",
            BusinessName = "HTTP Test İşletmesi",
            ShortDescription = "Otomatik test işletmesi",
            CategorySlug = "elektrik",
            ServiceSlug = "elektrik-tamiri",
            CitySlug = "osmaniye",
            DistrictSlug = "merkez",
            PublicationStatus = PublicationStatus.Published,
            PublishedAtUtc = DateTime.UtcNow
        };

        var need = new NeedRequest
        {
            OwnerUserId = customer.Id,
            Title = "HTTP test işi",
            Description = "Otomatik test kaydı",
            Category = "Elektrik",
            City = "Osmaniye",
            District = "Merkez",
            Status = NeedStatus.OfferReceived
        };

        var offer = new ProviderOffer
        {
            NeedRequestId = need.Id,
            ProviderId = provider.Id,
            Message = "Test teklifi",
            Status = OfferStatus.Accepted
        };

        var job = new NeedJob
        {
            NeedRequestId = need.Id,
            ProviderOfferId = offer.Id,
            ProviderId = provider.Id,
            Status = "Accepted"
        };

        try
        {
            await using (var db = new AppDbContext(options))
            {
                db.Users.AddRange(customer, providerUser);
                db.Providers.Add(provider);
                db.NeedRequests.Add(need);
                db.ProviderOffers.Add(offer);
                db.NeedJobs.Add(job);

                await db.SaveChangesAsync();

                var savedUsers = await db.Users
                    .AsNoTracking()
                    .Where(x => x.Id == customer.Id || x.Id == providerUser.Id)
                    .Select(x => new { x.Id, x.IsActive, x.DeletedAtUtc })
                    .ToListAsync();

                Assert.Equal(2, savedUsers.Count);
                Assert.All(savedUsers, x =>
                {
                    Assert.True(x.IsActive);
                    Assert.Null(x.DeletedAtUtc);
                });
            }

            var jwtOptions = Options.Create(new JwtOptions
            {
                Key = "NeedJobHttpTests_Only_Local_Test_Key_2026",
                Issuer = "NeyeIhtiyacVar.Api",
                Audience = "NeyeIhtiyacVar.Frontend"
            });

            var tokenService = new JwtTokenService(jwtOptions);

            using var factory = new NeedJobHttpTestFactory
            {
                TestConnectionString = connection!
            };

            using var client = factory.CreateClient();

            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer",
                    tokenService.CreateToken(providerUser).AccessToken);

            using var completion = await client.PostAsync(
                $"/api/need-jobs/{job.Id}/provider-complete",
                null);

            Assert.Equal(HttpStatusCode.OK, completion.StatusCode);

            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer",
                    tokenService.CreateToken(customer).AccessToken);

            using var decisionResponse = decision == "confirm"
                ? await client.PostAsync(
                    $"/api/need-jobs/{job.Id}/customer-confirm",
                    null)
                : await client.PostAsJsonAsync(
                    $"/api/need-jobs/{job.Id}/dispute",
                    new { Reason = "Test itiraz gerekçesi" });

            Assert.Equal(HttpStatusCode.OK, decisionResponse.StatusCode);

            await using var verifyDb = new AppDbContext(options);

            var savedJob = await verifyDb.NeedJobs
                .AsNoTracking()
                .SingleAsync(x => x.Id == job.Id);

            Assert.Equal(expectedStatus, savedJob.Status);

            if (decision == "confirm")
            {
                Assert.NotNull(savedJob.CustomerConfirmedAtUtc);
            }
            else
            {
                Assert.NotNull(savedJob.DisputedAtUtc);
                Assert.Equal(
                    "Test itiraz gerekçesi",
                    savedJob.DisputeReason);
            }
        }
        finally
        {
            await using var cleanup = new AppDbContext(options);

            cleanup.NeedJobs.RemoveRange(
                cleanup.NeedJobs.Where(x => x.Id == job.Id));

            cleanup.ProviderOffers.RemoveRange(
                cleanup.ProviderOffers.Where(x => x.Id == offer.Id));

            cleanup.NeedRequests.RemoveRange(
                cleanup.NeedRequests.Where(x => x.Id == need.Id));

            cleanup.Providers.RemoveRange(
                cleanup.Providers.Where(x => x.Id == provider.Id));

            cleanup.Users.RemoveRange(
                cleanup.Users.Where(x =>
                    x.Id == customer.Id || x.Id == providerUser.Id));

            await cleanup.SaveChangesAsync();
        }
    }
}
