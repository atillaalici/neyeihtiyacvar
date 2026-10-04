using System.Net.Http.Json;
using System.Text.Json;

namespace NeyeIhtiyacVar.Api.Infrastructure.Sms;

public interface ISmsSender
{
    Task<SmsSendResult> SendVerificationCodeAsync(
        string phoneNumber,
        string code,
        CancellationToken cancellationToken = default);
}

public sealed record SmsSendResult(
    bool Success,
    string? ProviderMessageId = null,
    string? ErrorMessage = null);

public sealed class VerimorSmsSender : ISmsSender
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<VerimorSmsSender> _logger;

    public VerimorSmsSender(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<VerimorSmsSender> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        _httpClient.BaseAddress = new Uri("https://sms.verimor.com.tr/");
        _httpClient.Timeout = TimeSpan.FromSeconds(20);
    }

    public async Task<SmsSendResult> SendVerificationCodeAsync(
        string phoneNumber,
        string code,
        CancellationToken cancellationToken = default)
    {
        var username = _configuration["Sms:Verimor:Username"];
        var password = _configuration["Sms:Verimor:Password"];
        var sourceAddress = _configuration["Sms:Verimor:SourceAddress"];

        if (string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            const string error = "Verimor SMS ayarları eksik.";
            _logger.LogError(error);

            return new SmsSendResult(
                false,
                ErrorMessage: error);
        }

        var destination = NormalizePhoneNumber(phoneNumber);

        if (destination is null)
        {
            return new SmsSendResult(
                false,
                ErrorMessage: "Telefon numarası SMS gönderimi için geçerli değil.");
        }

        var message =
            $"Neye İhtiyaç Var doğrulama kodunuz: {code}. " +
            "Kod 2 dakika geçerlidir. Bu kodu kimseyle paylaşmayın.";

        var payload = new
        {
            username,
            password,
            source_addr = string.IsNullOrWhiteSpace(sourceAddress)
                ? null
                : sourceAddress.Trim(),
            messages = new[]
            {
                new
                {
                    msg = message,
                    dest = destination
                }
            }
        };

        try
        {
            using var response = await _httpClient.PostAsJsonAsync(
                "v2/send.json",
                payload,
                cancellationToken);

            var responseText =
                await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Verimor SMS gönderimi başarısız. HTTP {Status}. Response: {Response}",
                    (int)response.StatusCode,
                    responseText);

                return new SmsSendResult(
                    false,
                    ErrorMessage: $"Verimor HTTP {(int)response.StatusCode}");
            }

            string? messageId = null;

            try
            {
                using var document = JsonDocument.Parse(responseText);

                if (document.RootElement.ValueKind == JsonValueKind.String)
                {
                    messageId = document.RootElement.GetString();
                }
                else if (document.RootElement.ValueKind == JsonValueKind.Number)
                {
                    messageId = document.RootElement.GetRawText();
                }
            }
            catch (JsonException)
            {
                messageId = responseText.Trim().Trim('"');
            }

            return new SmsSendResult(
                true,
                messageId);
        }
        catch (Exception ex) when (
            ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogError(
                ex,
                "Verimor SMS isteği başarısız.");

            return new SmsSendResult(
                false,
                ErrorMessage: ex.Message);
        }
    }

    private static string? NormalizePhoneNumber(string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return null;

        var digits = new string(
            phoneNumber.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("0090"))
            digits = digits[2..];

        if (digits.StartsWith("90") && digits.Length == 12)
            return digits;

        if (digits.StartsWith("0") && digits.Length == 11)
            return "90" + digits[1..];

        if (digits.Length == 10 && digits.StartsWith("5"))
            return "90" + digits;

        return null;
    }
}
