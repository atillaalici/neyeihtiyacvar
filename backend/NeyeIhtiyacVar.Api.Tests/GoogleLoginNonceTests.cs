using Microsoft.AspNetCore.DataProtection;
using NeyeIhtiyacVar.Api.Infrastructure.Auth;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class GoogleLoginNonceTests
{
    [Fact]
    public void Challenge_requires_original_cookie_nonce_and_unexpired_ticket()
    {
        var protection = new EphemeralDataProtectionProvider();
        var now = DateTimeOffset.UtcNow;
        var ticket = GoogleLoginNonce.Protect(protection, "random-browser-nonce", now.AddMinutes(10));
        Assert.True(GoogleLoginNonce.IsValid(protection, ticket, "random-browser-nonce", now));
        Assert.False(GoogleLoginNonce.IsValid(protection, null, "random-browser-nonce", now));
        Assert.False(GoogleLoginNonce.IsValid(protection, ticket, null, now));
        Assert.False(GoogleLoginNonce.IsValid(protection, ticket, "other-browser", now));
        Assert.False(GoogleLoginNonce.IsValid(protection, ticket, "random-browser-nonce", now.AddMinutes(11)));
        Assert.False(GoogleLoginNonce.IsValid(protection, ticket + "tampered", "random-browser-nonce", now));
        Assert.False(GoogleLoginNonce.IsValid(new EphemeralDataProtectionProvider(), ticket, "random-browser-nonce", now));
    }
}
