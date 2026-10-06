namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ContactRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? UserId { get; set; }

    public AppUser? User { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public string Subject { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string Status { get; set; } = "new";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ReadAtUtc { get; set; }

    public ICollection<ContactReply> Replies { get; set; } =
        new List<ContactReply>();
}
