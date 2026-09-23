namespace NeyeIhtiyacVar.Api.Domain;

public sealed class Provider
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? SourceApplicationId { get; set; }

    public Guid? OwnerUserId { get; set; }

    public AppUser? OwnerUser { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string BusinessName { get; set; } = string.Empty;

    public string ShortDescription { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string CategorySlug { get; set; } = string.Empty;

    public string ServiceSlug { get; set; } = string.Empty;

    public string[] AdditionalServices { get; set; } = [];

    public string CitySlug { get; set; } = string.Empty;

    public string DistrictSlug { get; set; } = string.Empty;

    public string? PublicPhone { get; set; }

    public string? PublicWhatsapp { get; set; }

    public string? PublicAddress { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    public string? WorkingHours { get; set; }

    public int? ExperienceYears { get; set; }

    public bool EmergencyService { get; set; }

    public bool OnsiteService { get; set; }

    public bool NotifyByEmail { get; set; } = true;

    public bool NotifyBySms { get; set; }

    public bool NotifyByWhatsapp { get; set; }

    public bool NotifyByPush { get; set; } = true;

    public PublicationStatus PublicationStatus { get; set; } = PublicationStatus.Draft;

    public DateTime? PublishedAtUtc { get; set; }

    public string? PublishedBy { get; set; }
    public bool IsActive { get; set; } = true;


    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public int Version { get; set; }

    public int ModerationViolationCount { get; set; } = 0;
    public DateTime? LastModerationViolationAtUtc { get; set; }
    public string? LastModerationViolationReason { get; set; }
    public bool ModerationTerminated { get; set; } = false;
}
