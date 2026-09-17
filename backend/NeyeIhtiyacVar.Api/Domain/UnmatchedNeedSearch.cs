namespace NeyeIhtiyacVar.Api.Domain;
public sealed class UnmatchedNeedSearch
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Query { get; set; } = string.Empty;
    public string NormalizedQuery { get; set; } = string.Empty;
    public int SearchCount { get; set; } = 1;
    public DateTime FirstSearchedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastSearchedAtUtc { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "pending";
    public Guid? ResolvedCategoryLibraryPhraseId { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
}