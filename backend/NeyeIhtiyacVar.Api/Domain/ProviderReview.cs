namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderReview
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Talep/teklif akışından gelen değerlendirmelerde kullanılır.
    public Guid? NeedRequestId { get; set; }

    public NeedRequest? NeedRequest { get; set; }

    // Telefon / WhatsApp / e-posta gibi doğrudan işletme
    // etkileşimlerinden gelen değerlendirmelerde kullanılır.
    public Guid? ProviderInteractionId { get; set; }

    public ProviderInteraction? ProviderInteraction { get; set; }

    public Guid ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public int Rating { get; set; }

    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
