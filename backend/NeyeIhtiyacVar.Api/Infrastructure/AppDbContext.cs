using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options)
{
    public DbSet<NeedRequest> NeedRequests => Set<NeedRequest>();

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<CategoryService> CategoryServices => Set<CategoryService>();
    public DbSet<CategoryLibraryWork> CategoryLibraryWorks => Set<CategoryLibraryWork>();
    public DbSet<CategoryLibraryPhrase> CategoryLibraryPhrases => Set<CategoryLibraryPhrase>();
    public DbSet<UnmatchedNeedSearch> UnmatchedNeedSearches => Set<UnmatchedNeedSearch>();

    public DbSet<City> Cities => Set<City>();

    public DbSet<District> Districts => Set<District>();

    public DbSet<Provider> Providers => Set<Provider>();

    public DbSet<ProviderMembership> ProviderMemberships => Set<ProviderMembership>();

    public DbSet<AnalyticsEvent> AnalyticsEvents => Set<AnalyticsEvent>();

    public DbSet<MembershipPlan> MembershipPlans => Set<MembershipPlan>();

    public DbSet<PromotionCode> PromotionCodes => Set<PromotionCode>();

    public DbSet<PromotionOrganization> PromotionOrganizations => Set<PromotionOrganization>();

    public DbSet<PromotionCampaign> PromotionCampaigns => Set<PromotionCampaign>();

    public DbSet<PromotionUsage> PromotionUsages => Set<PromotionUsage>();

    public DbSet<ProviderApplication> ProviderApplications => Set<ProviderApplication>();

    public DbSet<BillingInformation> BillingInformations => Set<BillingInformation>();

    public DbSet<AppUser> Users => Set<AppUser>();

    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    public DbSet<ProviderOffer> ProviderOffers => Set<ProviderOffer>();

    public DbSet<ProviderReview> ProviderReviews => Set<ProviderReview>();

    public DbSet<Notification> Notifications => Set<Notification>();

    public DbSet<AccountVerificationCode> AccountVerificationCodes => Set<AccountVerificationCode>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // NIV-V71-CATEGORY-LIBRARY
        modelBuilder.Entity<CategoryLibraryWork>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.NormalizedName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.IsActive).HasDefaultValue(true);
            entity.HasIndex(x => new { x.CategoryServiceId, x.NormalizedName }).IsUnique();
            entity.HasOne(x => x.CategoryService).WithMany().HasForeignKey(x => x.CategoryServiceId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<CategoryLibraryPhrase>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Phrase).HasMaxLength(500).IsRequired();
            entity.Property(x => x.NormalizedPhrase).HasMaxLength(500).IsRequired();
            entity.Property(x => x.IsActive).HasDefaultValue(true);
            entity.HasIndex(x => x.NormalizedPhrase);
            entity.HasIndex(x => new { x.CategoryLibraryWorkId, x.NormalizedPhrase }).IsUnique();
            entity.HasOne(x => x.Work).WithMany(x => x.Phrases).HasForeignKey(x => x.CategoryLibraryWorkId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<UnmatchedNeedSearch>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Query).HasMaxLength(500).IsRequired();
            entity.Property(x => x.NormalizedQuery).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).HasDefaultValue("pending");
            entity.HasIndex(x => x.NormalizedQuery).IsUnique();
            entity.HasIndex(x => new { x.Status, x.LastSearchedAtUtc });
        });
        // NIV-V71-CATEGORY-LIBRARY-END
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
            entity.Property(x => x.LastModerationViolationReason)
                .HasMaxLength(1000);

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

            entity.Property(x => x.NotifyByEmail)
                .HasDefaultValue(true);

            entity.Property(x => x.NotifyByPush)
                .HasDefaultValue(true);

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

        modelBuilder.Entity<BillingInformation>(entity =>
        {
            entity.HasIndex(x => x.UserId).IsUnique();
            entity.Property(x => x.BillingType).HasMaxLength(20).IsRequired();
            entity.Property(x => x.NameOrTitle).HasMaxLength(250).IsRequired();
            entity.Property(x => x.TaxOffice).HasMaxLength(150);
            entity.Property(x => x.TaxOrIdentityNumber).HasMaxLength(11).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(254).IsRequired();
            entity.Property(x => x.Phone).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Address).HasMaxLength(500).IsRequired();
            entity.Property(x => x.City).HasMaxLength(100).IsRequired();
            entity.Property(x => x.District).HasMaxLength(100).IsRequired();
            entity.HasOne(x => x.User)
                .WithOne()
                .HasForeignKey<BillingInformation>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.Action);
            entity.HasIndex(x => x.EntityType);
            entity.HasIndex(x => x.AdminUserId);

            entity.Property(x => x.AdminEmail)
                .HasMaxLength(254)
                .IsRequired();

            entity.Property(x => x.Action)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.EntityType)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.EntityId)
                .HasMaxLength(100);

            entity.Property(x => x.EntityName)
                .HasMaxLength(300);

            entity.Property(x => x.Details)
                .HasMaxLength(2000);
        });
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasIndex(x => x.NormalizedEmail).IsUnique();

            entity.HasIndex(x => x.NormalizedPhoneNumber)
                .IsUnique();

            entity.Property(x => x.Email)
                .HasMaxLength(254)
                .IsRequired();

            entity.Property(x => x.NormalizedEmail)
                .HasMaxLength(254)
                .IsRequired();

            entity.Property(x => x.PhoneNumber)
                .HasMaxLength(30);

            entity.Property(x => x.NormalizedPhoneNumber)
                .HasMaxLength(20);

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



        modelBuilder.Entity<PromotionOrganization>(entity =>
        {
            entity.HasIndex(x => x.Name);

            entity.Property(x => x.Name)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(x => x.Type)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.ContactName)
                .HasMaxLength(150);

            entity.Property(x => x.ContactPhone)
                .HasMaxLength(30);

            entity.Property(x => x.ContactEmail)
                .HasMaxLength(254);

            entity.Property(x => x.Notes)
                .HasMaxLength(2000);
        });

        modelBuilder.Entity<PromotionCampaign>(entity =>
        {
            entity.HasIndex(x => x.OrganizationId);
            entity.HasIndex(x => new { x.IsActive, x.ExpiresAtUtc });

            entity.Property(x => x.Name)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(x => x.CodePrefix)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(1000);

            entity.Property(x => x.DiscountType)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(x => x.DiscountValue)
                .HasPrecision(12, 2);

            entity.Property(x => x.PlanCode)
                .HasMaxLength(50);

            entity.HasOne<PromotionOrganization>()
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PromotionCode>(entity =>
        {
            entity.HasIndex(x => x.Code).IsUnique();
            entity.HasIndex(x => x.CampaignId);
            entity.HasIndex(x => x.UsedByUserId);
            entity.HasIndex(x => new { x.IsActive, x.ExpiresAtUtc });
            entity.HasIndex(x => new { x.CampaignId, x.UsedCount });

            entity.Property(x => x.Code)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(500);

            entity.Property(x => x.DiscountType)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(x => x.DiscountValue)
                .HasPrecision(12, 2);

            entity.Property(x => x.PlanCode)
                .HasMaxLength(50);

            entity.HasOne<PromotionCampaign>()
                .WithMany()
                .HasForeignKey(x => x.CampaignId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<AppUser>()
                .WithMany()
                .HasForeignKey(x => x.UsedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PromotionUsage>(entity =>
        {
            entity.HasIndex(x => x.PromotionCodeId).IsUnique();
            entity.HasIndex(x => x.CampaignId);
            entity.HasIndex(x => x.OrganizationId);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.UsedAtUtc);
            entity.HasIndex(x => x.PaymentStatus);

            entity.Property(x => x.UserDisplayName)
                .HasMaxLength(150);

            entity.Property(x => x.UserEmail)
                .HasMaxLength(254);

            entity.Property(x => x.PlanCode)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.OriginalPrice)
                .HasPrecision(12, 2);

            entity.Property(x => x.DiscountAmount)
                .HasPrecision(12, 2);

            entity.Property(x => x.FinalPrice)
                .HasPrecision(12, 2);

            entity.Property(x => x.PaymentStatus)
                .HasMaxLength(30)
                .IsRequired();

            entity.HasOne<PromotionCode>()
                .WithMany()
                .HasForeignKey(x => x.PromotionCodeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<PromotionCampaign>()
                .WithMany()
                .HasForeignKey(x => x.CampaignId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne<PromotionOrganization>()
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne<AppUser>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });
        modelBuilder.Entity<MembershipPlan>(entity =>
        {
            entity.HasIndex(x => x.Code).IsUnique();
            entity.HasIndex(x => new { x.IsActive, x.SortOrder });

            entity.Property(x => x.Code)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.Name)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.AnnualPrice)
                .HasPrecision(12, 2);

            entity.Property(x => x.ServiceLimit)
                .IsRequired();
        });

        modelBuilder.Entity<ProviderMembership>(entity =>
        {
            entity.HasIndex(x => x.IsActive);

            entity.HasIndex(x => x.ProviderId)
                .IsUnique()
                .HasFilter("\"IsActive\" = TRUE");

            entity.HasIndex(x => x.UserId)
                .IsUnique()
                .HasFilter("\"IsActive\" = TRUE");

            entity.HasIndex(x => new
            {
                x.ProviderId,
                x.UserId
            }).IsUnique();

            entity.Property(x => x.AnnualPriceSnapshot)
                .HasPrecision(12, 2);

            entity.HasOne(x => x.Provider)
                .WithMany()
                .HasForeignKey(x => x.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Plan)
                .WithMany(x => x.Memberships)
                .HasForeignKey(x => x.PlanId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<AccountVerificationCode>(entity =>
        {
            entity.HasIndex(x => new
            {
                x.UserId,
                x.Purpose,
                x.Channel,
                x.CreatedAtUtc
            });

            entity.Property(x => x.Purpose)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(x => x.Channel)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(x => x.CodeHash)
                .HasMaxLength(128)
                .IsRequired();

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<NeedRequest>(entity =>
        {
            entity.HasIndex(x => x.OwnerUserId);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.TrackingExpiresAtUtc);
            entity.HasIndex(x => x.TargetProviderId);

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true);
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

            entity.HasOne(x => x.TargetProvider)
                .WithMany()
                .HasForeignKey(x => x.TargetProviderId)
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