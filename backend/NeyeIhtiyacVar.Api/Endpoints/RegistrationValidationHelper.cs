using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace NeyeIhtiyacVar.Api.Endpoints;

internal static class RegistrationValidationHelper
{
    internal static string ToSlug(
        string value)
    {
        value = value
            .Replace('\u0131', 'i')
            .Replace('\u0130', 'I')
            .Replace('\u011F', 'g')
            .Replace('\u011E', 'G')
            .Replace('\u00FC', 'u')
            .Replace('\u00DC', 'U')
            .Replace('\u015F', 's')
            .Replace('\u015E', 'S')
            .Replace('\u00F6', 'o')
            .Replace('\u00D6', 'O')
            .Replace('\u00E7', 'c')
            .Replace('\u00C7', 'C');

        var normalized =
            value.Normalize(
                NormalizationForm.FormD);

        var builder =
            new StringBuilder();

        foreach (var character in normalized)
        {
            if (
                CharUnicodeInfo.GetUnicodeCategory(
                    character) !=
                UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        var ascii =
            builder
                .ToString()
                .Normalize(
                    NormalizationForm.FormC)
                .ToLowerInvariant();

        ascii =
            Regex.Replace(
                ascii,
                "[^a-z0-9]+",
                "-");

        return ascii.Trim('-');
    }
}
