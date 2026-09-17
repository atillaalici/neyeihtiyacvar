namespace NeyeIhtiyacVar.Api.Domain;

public sealed class ProviderApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string BusinessName { get; set; } = string.Empty;

    public string ShortDescription { get; set; } = string.Empty;

    public string CategorySlug { get; set; } = string.Empty;

    public string ServiceSlug { get; set; } = string.Empty;

    public string CitySlug { get; set; } = string.Empty;

    public string DistrictSlug { get; set; } = string.Empty;

    public string? PublicAddress { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    public string ApplicantName { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string? Whatsapp { get; set; }

    public string? Note { get; set; }

    public ProviderApplicationStatus Status { get; set; } = ProviderApplicationStatus.Pending;

    public string? ReviewNote { get; set; }

    public DateTime? ReviewedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public int Version { get; set; }
}

