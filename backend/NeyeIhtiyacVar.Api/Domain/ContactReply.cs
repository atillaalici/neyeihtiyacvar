namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ContactReply
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ContactRequestId { get; set; }

    public ContactRequest ContactRequest { get; set; } = null!;

    public Guid? AdminUserId { get; set; }

    public AppUser? AdminUser { get; set; }

    public string Message { get; set; } = string.Empty;

    public string? EmailProviderMessageId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
