namespace NeyeIhtiyacVar.Api.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "NeyeIhtiyacVar.Api";

    public string Audience { get; set; } = "NeyeIhtiyacVar.Frontend";

    public string Key { get; set; } = string.Empty;

    public int ExpirationMinutes { get; set; } = 480;
}