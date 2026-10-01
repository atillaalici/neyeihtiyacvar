using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace NeyeIhtiyacVar.Api.Domain;

[Index(nameof(UserId), nameof(LastMessageAtUtc))]
[Index(nameof(ProviderId), nameof(LastMessageAtUtc))]
[Index(nameof(UserId), nameof(ProviderId), IsUnique = true)]
public sealed class Conversation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public Guid ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? LastMessageAtUtc { get; set; }

    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
