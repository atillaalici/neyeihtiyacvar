using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class EmergencyServicesTests
{
    private static AppDbContext Context() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseNpgsql("Host=127.0.0.1;Database=design_only;Username=unused;Password=unused").Options);

    [Fact]
    public void ListExcludesInactiveUnpublishedWithdrawnUnconfirmedAndFormerOwnerDeclarations()
    {
        var owner = Guid.NewGuid();
        var providers = Enumerable.Range(0, 7).Select(_ => new Provider
        {
            OwnerUserId = owner, IsActive = true, PublicationStatus = PublicationStatus.Published
        }).ToArray();
        providers[1].IsActive = false;
        providers[2].PublicationStatus = PublicationStatus.Draft;
        providers[6].ModerationTerminated = true;
        var declarations = providers.Where((_, i) => i != 4).Select(p => new ProviderEmergencyDeclaration
        {
            ProviderId = p.Id, DeclaredByUserId = owner, ConfirmedAtUtc = DateTime.UtcNow
        }).ToArray();
        declarations.Single(d => d.ProviderId == providers[3].Id).WithdrawnAtUtc = DateTime.UtcNow;
        declarations.Single(d => d.ProviderId == providers[5].Id).DeclaredByUserId = Guid.NewGuid();
        var visible = NeyeIhtiyacVar.Api.Endpoints.EmergencyServiceEndpoints.EligibleProviders(
            providers.AsQueryable(), declarations.AsQueryable()).ToArray();
        Assert.Equal(providers[0].Id, Assert.Single(visible).Id);
    }

    [Fact]
    public void MigrationOnlyAddsIndependentDeclarationTableAndIndex()
    {
        using var db = Context();
        var assembly = db.GetService<IMigrationsAssembly>();
        var type = assembly.Migrations.Single(x => x.Key.EndsWith("_AddProviderEmergencyDeclarations")).Value;
        var migration = assembly.CreateMigration(type, db.Database.ProviderName!);
        Assert.Collection(migration.UpOperations,
            op => Assert.Equal("ProviderEmergencyDeclarations", Assert.IsType<CreateTableOperation>(op).Name),
            op => Assert.Equal("ProviderEmergencyDeclarations", Assert.IsType<CreateIndexOperation>(op).Table));
        var table = Assert.IsType<CreateTableOperation>(migration.UpOperations[0]);
        Assert.All(table.ForeignKeys, fk => Assert.Equal(ReferentialAction.Restrict, fk.OnDelete));
        Assert.Equal("ProviderId", Assert.Single(table.PrimaryKey!.Columns));
    }

    [Fact]
    public void DeclarationHasUniqueProviderKeyAndDoesNotReplaceLegacyFlag()
    {
        using var db = Context();
        var entity = db.Model.FindEntityType(typeof(ProviderEmergencyDeclaration))!;
        Assert.Equal("ProviderId", Assert.Single(entity.FindPrimaryKey()!.Properties).Name);
        Assert.NotNull(db.Model.FindEntityType(typeof(Provider))!.FindProperty("EmergencyService"));
    }

    [Fact]
    public void VerifiedNeighborsAreSymmetricAndUnknownLocationsHaveNoGuessedNeighbors()
    {
        Assert.Empty(EmergencyProvinceNeighbors.Get(null));
        Assert.Empty(EmergencyProvinceNeighbors.Get("unknown"));
        Assert.Contains("kocaeli", EmergencyProvinceNeighbors.Get("istanbul"));
        Assert.DoesNotContain("ankara", EmergencyProvinceNeighbors.Get("istanbul"));
        using var db = Context();
        // No database connection: all known source slugs are checked recursively.
        var visited = new HashSet<string>();
        var queue = new Queue<string>();
        queue.Enqueue("istanbul");
        while (queue.TryDequeue(out var city))
        {
            if (!visited.Add(city)) continue;
            foreach (var neighbor in EmergencyProvinceNeighbors.Get(city))
            {
                Assert.NotEqual(city, neighbor);
                Assert.Contains(city, EmergencyProvinceNeighbors.Get(neighbor));
                queue.Enqueue(neighbor);
            }
        }
        Assert.Equal(81, visited.Count);
    }
}
