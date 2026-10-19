namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderCategoryLibraryWork
{
    public Guid ProviderId { get; set; }
    public Provider Provider { get; set; } = null!;

    public Guid CategoryLibraryWorkId { get; set; }
    public CategoryLibraryWork CategoryLibraryWork { get; set; } = null!;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
