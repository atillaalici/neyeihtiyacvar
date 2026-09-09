namespace NeyeIhtiyacVar.Api.Domain;

public sealed class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public List<CategoryService> Services { get; set; } = [];
}
