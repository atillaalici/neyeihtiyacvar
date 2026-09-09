namespace NeyeIhtiyacVar.Api.Domain;

public sealed class AccountVerificationCode
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public VerificationPurpose Purpose { get; set; }

    public VerificationChannel Channel { get; set; }

    public string CodeHash { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }

    public int AttemptCount { get; set; }

    public DateTime? UsedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public enum VerificationPurpose
{
    AccountVerification = 0,
    PasswordReset = 1
}

public enum VerificationChannel
{
    Email = 0,
    Phone = 1
}