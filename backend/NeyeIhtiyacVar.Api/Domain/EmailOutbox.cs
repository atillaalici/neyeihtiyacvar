namespace NeyeIhtiyacVar.Api.Domain;

public sealed class EmailOutbox
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NeedRequestId { get; set; }

    public Guid RecipientUserId { get; set; }

    public string ToEmail { get; set; } = string.Empty;

    public string RecipientName { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    public string Heading { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    // Pending, Processing, Sent, Failed
    public string Status { get; set; } = "Pending";

    public int AttemptCount { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime NextAttemptAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ProcessingStartedAtUtc { get; set; }

    public DateTime? SentAtUtc { get; set; }

    public string? LastError { get; set; }
}
