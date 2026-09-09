$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"

New-Item -ItemType Directory -Force "$root\Domain" | Out-Null
New-Item -ItemType Directory -Force "$root\Infrastructure" | Out-Null

@'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public List<CategoryService> Services { get; set; } = [];
}
'@ | Set-Content -Encoding UTF8 "$root\Domain\Category.cs"

@'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class CategoryService
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CategoryId { get; set; }

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public Category Category { get; set; } = null!;
}
'@ | Set-Content -Encoding UTF8 "$root\Domain\CategoryService.cs"

@'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class City
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public List<District> Districts { get; set; } = [];
}
'@ | Set-Content -Encoding UTF8 "$root\Domain\City.cs"

@'
namespace NeyeIhtiyacVar.Api.Domain;

public sealed class District
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CityId { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public City City { get; set; } = null!;
}
'@ | Set-Content -Encoding UTF8 "$root\Domain\District.cs"

@'
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options)
{
    public DbSet<NeedRequest> NeedRequests => Set<NeedRequest>();

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<CategoryService> CategoryServices => Set<CategoryService>();

    public DbSet<City> Cities => Set<City>();

    public DbSet<District> Districts => Set<District>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();

            entity.Property(x => x.Slug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.Name)
                .HasMaxLength(150)
                .IsRequired();
        });

        modelBuilder.Entity<CategoryService>(entity =>
        {
            entity.Property(x => x.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.HasOne(x => x.Category)
                .WithMany(x => x.Services)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<City>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();

            entity.Property(x => x.Slug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.Name)
                .HasMaxLength(150)
                .IsRequired();
        });

        modelBuilder.Entity<District>(entity =>
        {
            entity.Property(x => x.Slug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.HasIndex(x => new
            {
                x.CityId,
                x.Slug
            }).IsUnique();

            entity.HasOne(x => x.City)
                .WithMany(x => x.Districts)
                .HasForeignKey(x => x.CityId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
'@ | Set-Content -Encoding UTF8 "$root\Infrastructure\AppDbContext.cs"

Write-Host ""
Write-Host "Dosyalar basariyla olusturuldu ve AppDbContext guncellendi." -ForegroundColor Green
Write-Host "Simdi backend klasorunde: dotnet build" -ForegroundColor Cyan
