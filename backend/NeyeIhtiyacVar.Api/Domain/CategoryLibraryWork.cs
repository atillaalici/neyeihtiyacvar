namespace NeyeIhtiyacVar.Api.Domain;
public sealed class CategoryLibraryWork
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CategoryServiceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public CategoryService CategoryService { get; set; } = null!;
    public List<CategoryLibraryPhrase> Phrases { get; set; } = [];
}