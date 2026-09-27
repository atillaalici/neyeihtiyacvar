namespace NeyeIhtiyacVar.Api.Domain;

public sealed class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Email { get; set; } = string.Empty;

    public string NormalizedEmail { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public string? NormalizedPhoneNumber { get; set; }

    public DateTime? EmailVerifiedAtUtc { get; set; }

    public DateTime? PhoneVerifiedAtUtc { get; set; }

    public string PasswordHash { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string? CitySlug { get; set; }

    public string? DistrictSlug { get; set; }

    public string? WhatsAppNumber { get; set; }

    public string? Neighborhood { get; set; }

    public string? Street { get; set; }

    public string? BuildingNo { get; set; }

    public string? ApartmentNo { get; set; }

    public string? OpenAddress { get; set; }

    public UserRole Role { get; set; } = UserRole.User;

    public bool IsAdmin { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime? DeletedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}