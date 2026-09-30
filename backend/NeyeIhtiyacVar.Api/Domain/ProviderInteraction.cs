using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace NeyeIhtiyacVar.Api.Domain;

[Index(nameof(UserId), nameof(CreatedAtUtc))]
[Index(nameof(ProviderId), nameof(CreatedAtUtc))]
[Index(nameof(UserId), nameof(ProviderId), nameof(Status), nameof(CreatedAtUtc))]
public sealed class ProviderInteraction
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ProviderId { get; set; }

    public Provider Provider { get; set; } = null!;

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    [MaxLength(30)]
    public string Channel { get; set; } = string.Empty;

    [MaxLength(30)]
    public string Source { get; set; } = string.Empty;

    [MaxLength(30)]
    public string Status { get; set; } = "pending";

    [MaxLength(80)]
    public string? NoServiceReason { get; set; }

    public DateTime? FollowUpAtUtc { get; set; }

    public DateTime? ResolvedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
