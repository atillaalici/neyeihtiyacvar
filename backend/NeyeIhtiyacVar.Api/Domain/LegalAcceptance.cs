namespace NeyeIhtiyacVar.Api.Domain;

public sealed class LegalAcceptance
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public string DocumentCode { get; set; } = string.Empty;

    public string DocumentVersion { get; set; } = string.Empty;

    public string ActionType { get; set; } = string.Empty;

    public string PlanCode { get; set; } = string.Empty;

    public string PlanName { get; set; } = string.Empty;

    public decimal OriginalPrice { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal FinalPrice { get; set; }

    public string? PromotionCode { get; set; }

    public DateTime AcceptedAtUtc { get; set; } = DateTime.UtcNow;
}
