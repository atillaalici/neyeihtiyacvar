using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace NeyeIhtiyacVar.Api.Domain;

[Index(nameof(EventType), nameof(CreatedAtUtc))]
[Index(nameof(ProviderId), nameof(EventType), nameof(CreatedAtUtc))]
public sealed class AnalyticsEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(40)]
    public string EventType { get; set; } = string.Empty;

    public Guid? ProviderId { get; set; }

    public Provider? Provider { get; set; }

    [MaxLength(300)]
    public string? SearchTerm { get; set; }

    [MaxLength(40)]
    public string? Source { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}