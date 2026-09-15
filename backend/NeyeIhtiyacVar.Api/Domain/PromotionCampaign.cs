namespace NeyeIhtiyacVar.Api.Domain;

public sealed class PromotionCampaign
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid OrganizationId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string CodePrefix { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string DiscountType { get; set; } = "percentage";

    public decimal DiscountValue { get; set; }

    public string? PlanCode { get; set; }

    public int Quantity { get; set; }

    public DateTime? StartsAtUtc { get; set; }

    public DateTime? ExpiresAtUtc { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}