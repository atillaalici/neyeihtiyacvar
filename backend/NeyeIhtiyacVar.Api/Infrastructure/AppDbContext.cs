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

    public DbSet<Provider> Providers => Set<Provider>();

    public DbSet<ProviderApplication> ProviderApplications => Set<ProviderApplication>();

    public DbSet<AppUser> Users => Set<AppUser>();

    public DbSet<ProviderOffer> ProviderOffers => Set<ProviderOffer>();

    public DbSet<ProviderReview> ProviderReviews => Set<ProviderReview>();

    public DbSet<Notification> Notifications => Set<Notification>();

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

        modelBuilder.Entity<Provider>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.HasIndex(x => x.SourceApplicationId).IsUnique();
            entity.HasIndex(x => x.OwnerUserId).IsUnique();
            entity.HasIndex(x => x.PublicationStatus);

            entity.HasIndex(x => new
            {
                x.CitySlug,
                x.DistrictSlug
            });

            entity.HasIndex(x => new
            {
                x.CategorySlug,
                x.ServiceSlug
            });

            entity.Property(x => x.Slug)
                .HasMaxLength(180)
                .IsRequired();

            entity.Property(x => x.BusinessName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.ShortDescription)
                .HasMaxLength(300)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(4000);

            entity.Property(x => x.CategorySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.ServiceSlug)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.CitySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.DistrictSlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.PublicPhone)
                .HasMaxLength(30);

            entity.Property(x => x.PublicWhatsapp)
                .HasMaxLength(30);

            entity.Property(x => x.PublicAddress)
                .HasMaxLength(500);

            entity.Property(x => x.WorkingHours)
                .HasMaxLength(500);

            entity.Property(x => x.PublishedBy)
                .HasMaxLength(200);

            entity.Property(x => x.PublicationStatus)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(x => x.Version)
                .IsConcurrencyToken();

            entity.HasOne(x => x.OwnerUser)
                .WithOne()
                .HasForeignKey<Provider>(x => x.OwnerUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProviderApplication>(entity =>
        {
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.CreatedAtUtc);

            entity.Property(x => x.BusinessName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.ShortDescription)
                .HasMaxLength(300)
                .IsRequired();

            entity.Property(x => x.CategorySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.ServiceSlug)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.CitySlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.DistrictSlug)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.ApplicantName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.Phone)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.Whatsapp)
                .HasMaxLength(30);

            entity.Property(x => x.Note)
                .HasMaxLength(2000);

            entity.Property(x => x.ReviewNote)
                .HasMaxLength(2000);

            entity.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(x => x.Version)
                .IsConcurrencyToken();
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasIndex(x => x.NormalizedEmail).IsUnique();

            entity.Property(x => x.Email)
                .HasMaxLength(254)
                .IsRequired();

            entity.Property(x => x.NormalizedEmail)
                .HasMaxLength(254)
                .IsRequired();

            entity.Property(x => x.PasswordHash)
                .HasMaxLength(1000)
                .IsRequired();

            entity.Property(x => x.DisplayName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.Role)
                .HasConversion<string>()
                .HasMaxLength(20);
        });

        modelBuilder.Entity<NeedRequest>(entity =>
        {
            entity.HasIndex(x => x.OwnerUserId);
            entity.HasIndex(x => x.Status);

            entity.Property(x => x.Title)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(x => x.Category)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.City)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.District)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.CategorySlug)
                .HasMaxLength(100);

            entity.Property(x => x.ServiceSlug)
                .HasMaxLength(150);

            entity.Property(x => x.CitySlug)
                .HasMaxLength(100);

            entity.Property(x => x.DistrictSlug)
                .HasMaxLength(100);

            entity.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(x => x.OwnerUser)
                .WithMany()
                .HasForeignKey(x => x.OwnerUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProviderOffer>(entity =>
        {
            entity.HasIndex(x => new
            {
                x.NeedRequestId,
                x.ProviderId
            }).IsUnique();

            entity.HasIndex(x => x.Status);

            entity.Property(x => x.Message)
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(x => x.Price)
                .HasPrecision(12, 2);

            entity.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(x => x.NeedRequest)
                .WithMany(x => x.Offers)
                .HasForeignKey(x => x.NeedRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Provider)
                .WithMany()
                .HasForeignKey(x => x.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProviderReview>(entity =>
        {
            entity.HasIndex(x => x.NeedRequestId).IsUnique();
            entity.HasIndex(x => x.ProviderId);
            entity.HasIndex(x => x.UserId);

            entity.Property(x => x.Rating)
                .IsRequired();

            entity.Property(x => x.Comment)
                .HasMaxLength(2000)
                .IsRequired();

            entity.HasOne(x => x.NeedRequest)
                .WithMany()
                .HasForeignKey(x => x.NeedRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Provider)
                .WithMany()
                .HasForeignKey(x => x.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasIndex(x => new
            {
                x.UserId,
                x.IsRead,
                x.CreatedAtUtc
            });

            entity.Property(x => x.EventType)
                .HasMaxLength(80)
                .IsRequired();

            entity.Property(x => x.Title)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.Message)
                .HasMaxLength(1000)
                .IsRequired();

            entity.Property(x => x.Link)
                .HasMaxLength(500);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}