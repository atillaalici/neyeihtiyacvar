namespace NeyeIhtiyacVar.Api.Domain;

public sealed class PromotionCode
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    // percentage | fixed
    public string DiscountType { get; set; } = "percentage";

    public decimal DiscountValue { get; set; }

    // null = tum paketler
    public string? PlanCode { get; set; }

    // Yeni sistemde her kod tek kullanimliktir.
    public int? MaxUses { get; set; } = 1;

    // Yeni sistemde sadece 0 veya 1 olabilir.
    public int UsedCount { get; set; }

    public Guid? CampaignId { get; set; }

    public DateTime? UsedAtUtc { get; set; }

    public Guid? UsedByUserId { get; set; }

    public DateTime? StartsAtUtc { get; set; }

    public DateTime? ExpiresAtUtc { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}