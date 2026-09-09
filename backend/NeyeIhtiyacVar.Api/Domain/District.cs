namespace NeyeIhtiyacVar.Api.Domain;

public sealed class District
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CityId { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public City City { get; set; } = null!;
}
