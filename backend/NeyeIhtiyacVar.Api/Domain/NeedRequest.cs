namespace NeyeIhtiyacVar.Api.Domain;

public sealed class NeedRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? OwnerUserId { get; set; }
    public AppUser? OwnerUser { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string? CategorySlug { get; set; }
    public string? ServiceSlug { get; set; }
    public string? CitySlug { get; set; }
    public string? DistrictSlug { get; set; }
    public NeedStatus Status { get; set; } = NeedStatus.Open;
    public bool IsActive { get; set; } = true;

    // Talep ilk olusturuldugunda 7 gun boyunca takip edilir.
    // Eski kayitlarda null olabilir; endpointler CreatedAtUtc + 7 gun fallback kullanir.
    public DateTime? TrackingExpiresAtUtc { get; set; }

    // 7 gunluk sure doldugunda yenileme bildiriminin bir kez
    // gonderilebilmesi icin ileride kullanilacak.
    public DateTime? TrackingReminderSentAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public ICollection<ProviderOffer> Offers { get; set; } = [];
}
