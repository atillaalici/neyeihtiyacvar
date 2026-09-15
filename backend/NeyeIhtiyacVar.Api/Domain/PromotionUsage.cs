namespace NeyeIhtiyacVar.Api.Domain;

public sealed class PromotionUsage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PromotionCodeId { get; set; }

    public Guid? CampaignId { get; set; }

    public Guid? OrganizationId { get; set; }

    public Guid? UserId { get; set; }

    public string? UserDisplayName { get; set; }

    public string? UserEmail { get; set; }

    public string PlanCode { get; set; } = string.Empty;

    public decimal OriginalPrice { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal FinalPrice { get; set; }

    public string PaymentStatus { get; set; } = "claimed";

    public DateTime UsedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}