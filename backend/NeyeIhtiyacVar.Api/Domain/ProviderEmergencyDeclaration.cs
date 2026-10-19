namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderEmergencyDeclaration
{
    public Guid ProviderId { get; set; }
    public Guid DeclaredByUserId { get; set; }
    public DateTime ConfirmedAtUtc { get; set; }
    public DateTime? WithdrawnAtUtc { get; set; }
}
