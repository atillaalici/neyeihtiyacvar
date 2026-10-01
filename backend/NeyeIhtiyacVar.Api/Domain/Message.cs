using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace NeyeIhtiyacVar.Api.Domain;

[Index(nameof(ConversationId), nameof(CreatedAtUtc))]
[Index(nameof(SenderUserId), nameof(CreatedAtUtc))]
public sealed class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ConversationId { get; set; }

    public Conversation Conversation { get; set; } = null!;

    public Guid SenderUserId { get; set; }

    public AppUser SenderUser { get; set; } = null!;

    [MaxLength(4000)]
    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ReadAtUtc { get; set; }
}
