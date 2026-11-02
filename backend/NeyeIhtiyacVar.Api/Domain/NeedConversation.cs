using Microsoft.EntityFrameworkCore;

namespace NeyeIhtiyacVar.Api.Domain;

[Index(nameof(ProviderOfferId), IsUnique = true)]
public sealed class NeedConversation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NeedRequestId { get; set; }
    public NeedRequest NeedRequest { get; set; } = null!;

    public Guid ProviderId { get; set; }
    public Provider Provider { get; set; } = null!;

    public Guid? ProviderOfferId { get; set; }
    public ProviderOffer? ProviderOffer { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastMessageAtUtc { get; set; }

    public ICollection<NeedMessage> Messages { get; set; } = [];
}
