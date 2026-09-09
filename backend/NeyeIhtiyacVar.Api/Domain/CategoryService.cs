namespace NeyeIhtiyacVar.Api.Domain;

public sealed class CategoryService
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CategoryId { get; set; }

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public Category Category { get; set; } = null!;
}
