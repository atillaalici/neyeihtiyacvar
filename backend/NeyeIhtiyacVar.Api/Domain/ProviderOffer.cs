namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderOffer
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NeedRequestId { get; set; }

    public NeedRequest NeedRequest { get; set; } = null!;

    public Guid ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public string Message { get; set; } = string.Empty;

    public decimal? Price { get; set; }

    public OfferStatus Status { get; set; } = OfferStatus.Pending;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}