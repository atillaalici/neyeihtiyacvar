namespace NeyeIhtiyacVar.Api.Infrastructure;

public static class NeedDistributionPolicy
{
    public static string GetNextStage(
        string currentStage,
        TimeSpan elapsed,
        int validOfferCount)
    {
        if (currentStage == NeedDistributionGeography.Nationwide)
            return currentStage;

        if (elapsed >= TimeSpan.FromHours(16) && validOfferCount < 8)
            return NeedDistributionGeography.Nationwide;

        if (elapsed >= TimeSpan.FromHours(8) && validOfferCount < 5)
        {
            return currentStage == NeedDistributionGeography.District ||
                   currentStage == NeedDistributionGeography.Province
                ? NeedDistributionGeography.NeighborProvinces
                : currentStage;
        }

        if (elapsed >= TimeSpan.FromHours(3) && validOfferCount < 3)
        {
            return currentStage == NeedDistributionGeography.District
                ? NeedDistributionGeography.Province
                : currentStage;
        }

        return currentStage;
    }

    public static bool ShouldAutoClose(
        TimeSpan elapsed,
        int validOfferCount)
    {
        return elapsed >= TimeSpan.FromHours(120) &&
               validOfferCount == 0;
    }
}
