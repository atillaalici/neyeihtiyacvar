using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class NeedDistributionGeographyTests
{
    [Theory]
    [InlineData("osmaniye", "merkez", "osmaniye", "merkez", true)]
    [InlineData("osmaniye", "merkez", "osmaniye", "kadirli", false)]
    [InlineData("osmaniye", "merkez", "gaziantep", "sahinbey", false)]
    public void District_OnlyMatchesSameDistrict(
        string needCity, string needDistrict,
        string providerCity, string providerDistrict, bool expected)
    {
        Assert.Equal(expected, NeedDistributionGeography.IsMatch(
            needCity, needDistrict, providerCity, providerDistrict,
            NeedDistributionGeography.District));
    }

    [Theory]
    [InlineData("osmaniye", "merkez", "osmaniye", "kadirli", true)]
    [InlineData("osmaniye", "merkez", "gaziantep", "sahinbey", false)]
    public void Province_OnlyMatchesSameProvince(
        string needCity, string needDistrict,
        string providerCity, string providerDistrict, bool expected)
    {
        Assert.Equal(expected, NeedDistributionGeography.IsMatch(
            needCity, needDistrict, providerCity, providerDistrict,
            NeedDistributionGeography.Province));
    }

    [Theory]
    [InlineData("osmaniye", "gaziantep", true)]
    [InlineData("osmaniye", "adana", true)]
    [InlineData("osmaniye", "hatay", true)]
    [InlineData("osmaniye", "kahramanmaras", true)]
    [InlineData("osmaniye", "osmaniye", true)]
    [InlineData("osmaniye", "istanbul", false)]
    public void NeighborProvinces_MatchesOwnAndNeighboringProvinces(
        string needCity, string providerCity, bool expected)
    {
        Assert.Equal(expected, NeedDistributionGeography.IsMatch(
            needCity, "merkez", providerCity, "merkez",
            NeedDistributionGeography.NeighborProvinces));
    }

    [Fact]
    public void Nationwide_MatchesDifferentProvinces()
    {
        Assert.True(NeedDistributionGeography.IsMatch(
            "osmaniye", "merkez", "istanbul", "kadikoy",
            NeedDistributionGeography.Nationwide));
    }

    [Theory]
    [InlineData(null, "osmaniye", "Nationwide")]
    [InlineData("osmaniye", null, "Nationwide")]
    [InlineData("osmaniye", "gaziantep", "Unknown")]
    [InlineData("osmaniye", "gaziantep", null)]
    public void MissingLocationOrInvalidStage_DoesNotMatch(
        string? needCity, string? providerCity, string? stage)
    {
        Assert.False(NeedDistributionGeography.IsMatch(
            needCity, "merkez", providerCity, "merkez", stage));
    }
}
