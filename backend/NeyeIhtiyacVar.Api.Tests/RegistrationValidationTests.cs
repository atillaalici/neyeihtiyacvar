using System.Reflection;
using NeyeIhtiyacVar.Api.Endpoints;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class RegistrationValidationTests
{
    private static Dictionary<string, string[]> Validate(RegisterRequest request) =>
        (Dictionary<string, string[]>)typeof(AuthEndpoints)
            .GetMethod("ValidateRegister", BindingFlags.Static | BindingFlags.NonPublic)!
            .Invoke(null, [request])!;

    [Theory]
    [InlineData("05321234567")]
    [InlineData("+90 532 123 45 67")]
    public void Valid_phone_is_accepted(string phone)
    {
        Assert.Empty(Validate(new("Test Kullanıcı", phone, "test@example.com", "Guvenli123")));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("123")]
    public void Missing_or_invalid_phone_is_rejected(string? phone)
    {
        var errors = Validate(new("Test Kullanıcı", phone!, "test@example.com", "Guvenli123"));
        Assert.Contains("phoneNumber", errors.Keys);
    }

    [Fact]
    public void Invalid_fields_have_individual_errors()
    {
        var errors = Validate(new("", "123", "invalid", "weak"));
        Assert.Contains("displayName", errors.Keys);
        Assert.Contains("phoneNumber", errors.Keys);
        Assert.Contains("email", errors.Keys);
        Assert.Contains("password", errors.Keys);
    }

    [Theory]
    [InlineData("abcdefgh")]
    [InlineData("ABCDEFGH1")]
    [InlineData("Abc1")]
    public void Password_policy_is_preserved(string password)
    {
        Assert.Contains("password", Validate(new("Test", "05321234567", "test@example.com", password)).Keys);
    }
}
