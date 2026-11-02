using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace NeyeIhtiyacVar.Api.Domain;

[Index(nameof(NeedConversationId), nameof(CreatedAtUtc))]
public sealed class NeedMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid NeedConversationId { get; set; }
    public NeedConversation NeedConversation { get; set; } = null!;

    public Guid SenderUserId { get; set; }
    public AppUser SenderUser { get; set; } = null!;

    [MaxLength(4000)]
    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAtUtc { get; set; }
    public DateTime? DeletedForSenderAtUtc { get; set; }
    public DateTime? DeletedForRecipientAtUtc { get; set; }
    public DateTime? DeletedForEveryoneAtUtc { get; set; }
}
