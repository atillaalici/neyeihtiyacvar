using NeyeIhtiyacVar.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using NeyeIhtiyacVar.Api.Infrastructure.Email;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class NeedJobHttpTestFactory : WebApplicationFactory<Program>
{
    public string TestConnectionString { get; set; } = string.Empty;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        HttpTestDatabaseGuard.Validate(TestConnectionString);

        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] =
                        TestConnectionString,
                    ["EmailOutbox:Enabled"] = "false",
                    ["Jwt:Key"] =
                        "NeedJobHttpTests_Only_Local_Test_Key_2026",
                    ["Jwt:Issuer"] = "NeyeIhtiyacVar.Api",
                    ["Jwt:Audience"] = "NeyeIhtiyacVar.Frontend"
                });
        });

        builder.ConfigureServices(services =>
        {
            // HTTP test sunucusunun veritabanını açıkça sabitle.
            services.AddDbContext<AppDbContext>(
                options => options.UseNpgsql(TestConnectionString));

            services.PostConfigure<JwtBearerOptions>(
                JwtBearerDefaults.AuthenticationScheme,
                options =>
                {
                    options.TokenValidationParameters.ValidIssuer =
                        "NeyeIhtiyacVar.Api";
                    options.TokenValidationParameters.ValidAudience =
                        "NeyeIhtiyacVar.Frontend";
                    options.TokenValidationParameters.IssuerSigningKey =
                        new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(
                                "NeedJobHttpTests_Only_Local_Test_Key_2026"));
                });

            services.RemoveAll<EmailOutboxWorker>();

            var workers = services
                .Where(x =>
                    x.ServiceType == typeof(IHostedService) &&
                    x.ImplementationType == typeof(EmailOutboxWorker))
                .ToList();

            foreach (var worker in workers)
            {
                services.Remove(worker);
            }
        });
    }
}
