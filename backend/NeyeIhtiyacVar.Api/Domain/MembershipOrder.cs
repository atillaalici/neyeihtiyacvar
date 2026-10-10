namespace NeyeIhtiyacVar.Api.Domain;

public sealed class MembershipOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public Guid? ProviderId { get; set; }
    public Provider? Provider { get; set; }

    public Guid PlanId { get; set; }
    public MembershipPlan Plan { get; set; } = null!;

    public string OrderType { get; set; } = "initial";
    public string Status { get; set; } = "pending";

    public decimal OriginalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }

    public string Currency { get; set; } = "TRY";

    public string? PromotionCode { get; set; }

    public string PaymentProvider { get; set; } = "iyzico";
    public string PaymentStatus { get; set; } = "not_started";
    public string? PaymentReference { get; set; }

    public string? RegistrationDraftJson { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime? PaidAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
