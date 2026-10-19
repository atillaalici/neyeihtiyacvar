using Microsoft.AspNetCore.DataProtection;
using System.Security.Cryptography;

namespace NeyeIhtiyacVar.Api.Infrastructure.Auth;

public static class GoogleLoginNonce
{
    public static string Protect(IDataProtectionProvider protection, string nonce, DateTimeOffset expires)
        => protection.CreateProtector("GoogleLoginNonce.v1")
            .Protect($"{expires.ToUnixTimeSeconds()}:{nonce}");

    public static bool IsValid(IDataProtectionProvider protection, string? cookie, string? nonce, DateTimeOffset now)
    {
        if (string.IsNullOrEmpty(cookie) || string.IsNullOrEmpty(nonce)) return false;
        try
        {
            var parts = protection.CreateProtector("GoogleLoginNonce.v1").Unprotect(cookie).Split(':', 2);
            return parts.Length == 2 && long.TryParse(parts[0], out var expires) &&
                expires > now.ToUnixTimeSeconds() &&
                string.Equals(parts[1], nonce, StringComparison.Ordinal);
        }
        catch (CryptographicException) { return false; }
    }
}
