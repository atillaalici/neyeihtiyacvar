namespace NeyeIhtiyacVar.Api.Domain;

public sealed class AdminAuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? AdminUserId { get; set; }

    public string AdminEmail { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;

    public string EntityType { get; set; } = string.Empty;

    public string? EntityId { get; set; }

    public string? EntityName { get; set; }

    public string? Details { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}