using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class NeedDistributionPolicyTests
{
    [Theory]
    [InlineData("District", 2, 0, "District")]
    [InlineData("District", 3, 2, "Province")]
    [InlineData("District", 3, 3, "District")]
    [InlineData("District", 8, 4, "NeighborProvinces")]
    [InlineData("Province", 8, 4, "NeighborProvinces")]
    [InlineData("Province", 8, 5, "Province")]
    [InlineData("District", 16, 7, "Nationwide")]
    [InlineData("Province", 16, 7, "Nationwide")]
    [InlineData("NeighborProvinces", 16, 7, "Nationwide")]
    [InlineData("NeighborProvinces", 16, 8, "NeighborProvinces")]
    [InlineData("Nationwide", 20, 0, "Nationwide")]
    public void DistributionStage_FollowsTimeAndOfferThresholds(
        string currentStage,
        int elapsedHours,
        int validOfferCount,
        string expectedStage)
    {
        var actual = NeedDistributionPolicy.GetNextStage(
            currentStage,
            TimeSpan.FromHours(elapsedHours),
            validOfferCount);

        Assert.Equal(expectedStage, actual);
    }

    [Theory]
    [InlineData(119, 0, false)]
    [InlineData(120, 0, true)]
    [InlineData(121, 0, true)]
    [InlineData(120, 1, false)]
    [InlineData(150, 3, false)]
    public void AutoClose_Requires120HoursAndZeroValidOffers(
        int elapsedHours,
        int validOfferCount,
        bool expected)
    {
        var actual = NeedDistributionPolicy.ShouldAutoClose(
            TimeSpan.FromHours(elapsedHours),
            validOfferCount);

        Assert.Equal(expected, actual);
    }
}
