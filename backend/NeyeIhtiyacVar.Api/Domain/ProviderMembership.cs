namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderMembership
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public Guid? PlanId { get; set; }

    public MembershipPlan? Plan { get; set; }

    // Satin alma anindaki degerleri saklar.
    // Plan fiyati daha sonra degisse bile eski uyeligin hesabi bozulmaz.
    public decimal AnnualPriceSnapshot { get; set; }

    public int ServiceLimitSnapshot { get; set; }

    public DateTime StartsAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ExpiresAtUtc { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? EndedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}