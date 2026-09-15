namespace NeyeIhtiyacVar.Api.Domain;

public sealed class MembershipPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal AnnualPrice { get; set; }

    public int ServiceLimit { get; set; }

    public bool IsRecommended { get; set; }

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    // Paket yetkileri - sonraki asamada admin panelinden yonetilebilir hale getirilecek.
    public bool MapVisibility { get; set; } = true;

    public bool PhotoEnabled { get; set; } = true;

    public bool VideoEnabled { get; set; }

    public bool FeaturedBadgeEnabled { get; set; }

    public bool SearchPriorityEnabled { get; set; }

    public bool AdvancedStatisticsEnabled { get; set; }

    public bool CatalogCampaignEnabled { get; set; }

    public bool PrioritySupportEnabled { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<ProviderMembership> Memberships { get; set; } = [];
}