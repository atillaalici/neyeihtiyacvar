namespace NeyeIhtiyacVar.Api.Domain;

public sealed class NeedJob
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NeedRequestId { get; set; }
    public NeedRequest NeedRequest { get; set; } = null!;

    public Guid ProviderOfferId { get; set; }
    public ProviderOffer ProviderOffer { get; set; } = null!;

    public Guid ProviderId { get; set; }
    public Provider Provider { get; set; } = null!;

    public string Status { get; set; } = "Accepted";

    public DateTime AcceptedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ProviderCompletedAtUtc { get; set; }
    public DateTime? CustomerConfirmedAtUtc { get; set; }
    public DateTime? DisputedAtUtc { get; set; }
    public DateTime? AutoFinalizedAtUtc { get; set; }

    public string? DisputeReason { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
