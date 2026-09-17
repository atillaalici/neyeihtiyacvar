namespace NeyeIhtiyacVar.Api.Domain;
public sealed class CategoryLibraryPhrase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CategoryLibraryWorkId { get; set; }
    public string Phrase { get; set; } = string.Empty;
    public string NormalizedPhrase { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public CategoryLibraryWork Work { get; set; } = null!;
}