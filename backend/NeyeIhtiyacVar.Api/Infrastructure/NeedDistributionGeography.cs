namespace NeyeIhtiyacVar.Api.Infrastructure;

public static class NeedDistributionGeography
{
    public const string District = "District";
    public const string Province = "Province";
    public const string NeighborProvinces = "NeighborProvinces";
    public const string Nationwide = "Nationwide";

    public static bool IsMatch(
        string? needCitySlug,
        string? needDistrictSlug,
        string? providerCitySlug,
        string? providerDistrictSlug,
        string? stage)
    {
        if (string.IsNullOrWhiteSpace(needCitySlug) ||
            string.IsNullOrWhiteSpace(providerCitySlug))
        {
            return false;
        }

        if (stage == Nationwide)
        {
            return true;
        }

        if (stage == NeighborProvinces)
        {
            return needCitySlug == providerCitySlug ||
                   EmergencyProvinceNeighbors.Get(needCitySlug)
                       .Contains(providerCitySlug);
        }

        if (needCitySlug != providerCitySlug)
        {
            return false;
        }

        if (stage == Province)
        {
            return true;
        }

        return stage == District &&
               !string.IsNullOrWhiteSpace(needDistrictSlug) &&
               needDistrictSlug == providerDistrictSlug;
    }
}
