namespace NeyeIhtiyacVar.Api.Domain;

public sealed class PromotionOrganization
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public string Type { get; set; } = "kurum";

    public string? ContactName { get; set; }

    public string? ContactPhone { get; set; }

    public string? ContactEmail { get; set; }

    public string? Notes { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}