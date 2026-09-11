using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Encodings.Web;

namespace NeyeIhtiyacVar.Api.Infrastructure.Email;

public interface IEmailSender
{
    Task<EmailSendResult> SendAccountVerificationCodeAsync(
        string toEmail, string displayName, string code,
        CancellationToken cancellationToken = default);

    Task<EmailSendResult> SendPasswordResetCodeAsync(
        string toEmail, string displayName, string code,
        CancellationToken cancellationToken = default);
}

public sealed record EmailSendResult(
    bool Success,
    string? ProviderMessageId = null,
    string? ErrorMessage = null);

public sealed class ResendEmailSender : IEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ResendEmailSender> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        _httpClient.BaseAddress = new Uri("https://api.resend.com/");
        _httpClient.Timeout = TimeSpan.FromSeconds(20);
    }

    public Task<EmailSendResult> SendAccountVerificationCodeAsync(
        string toEmail, string displayName, string code,
        CancellationToken cancellationToken = default)
        => SendCodeAsync(
            toEmail,
            displayName,
            "E-posta doğrulama kodunuz",
            "E-posta adresinizi doğrulayın",
            "Neye İhtiyaç Var? hesabınız için doğrulama kodunuz:",
            code,
            cancellationToken);

    public Task<EmailSendResult> SendPasswordResetCodeAsync(
        string toEmail, string displayName, string code,
        CancellationToken cancellationToken = default)
        => SendCodeAsync(
            toEmail,
            displayName,
            "Şifre yenileme kodunuz",
            "Şifrenizi yenileyin",
            "Neye İhtiyaç Var? hesabınız için şifre yenileme kodunuz:",
            code,
            cancellationToken);

    private async Task<EmailSendResult> SendCodeAsync(
        string toEmail,
        string displayName,
        string subject,
        string heading,
        string description,
        string code,
        CancellationToken cancellationToken)
    {
        var apiKey = _configuration["Email:ResendApiKey"];
        var fromAddress = _configuration["Email:FromAddress"];
        var fromName = _configuration["Email:FromName"] ?? "Neye İhtiyaç Var?";

        if (string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(fromAddress))
        {
            const string error = "Resend e-posta ayarları eksik.";
            _logger.LogError(error);
            return new EmailSendResult(false, ErrorMessage: error);
        }

        var safeName = HtmlEncoder.Default.Encode(
            string.IsNullOrWhiteSpace(displayName)
                ? "Değerli kullanıcımız"
                : displayName.Trim());

        var safeHeading = HtmlEncoder.Default.Encode(heading);
        var safeDescription = HtmlEncoder.Default.Encode(description);
        var safeCode = HtmlEncoder.Default.Encode(code);

        var html = $$"""
<!doctype html>
<html lang="tr">
<body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e5eaf2;border-radius:18px;">
<tr><td style="padding:28px 32px 12px;font-size:20px;font-weight:700;">Neye İhtiyaç Var?</td></tr>
<tr><td style="padding:8px 32px 32px;">
<h1 style="font-size:24px;margin:0 0 16px;">{{safeHeading}}</h1>
<p>Merhaba {{safeName}},</p>
<p>{{safeDescription}}</p>
<div style="margin:24px 0;padding:18px;text-align:center;background:#f0f7ff;border-radius:14px;">
<span style="font-size:32px;letter-spacing:8px;font-weight:700;">{{safeCode}}</span>
</div>
<p>Bu kod <strong>2 dakika</strong> geçerlidir.</p>
<p style="color:#6b7280;font-size:13px;">Bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayın.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
""";

        var text =
            $"Merhaba {displayName},\n\n{description}\n\n{code}\n\n" +
            "Bu kod 2 dakika geçerlidir. Bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayın.";

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);

        request.Content = JsonContent.Create(new
        {
            from = $"{fromName} <{fromAddress}>",
            to = new[] { toEmail },
            subject,
            html,
            text
        });

        try
        {
            using var response = await _httpClient.SendAsync(
                request,
                cancellationToken);

            var payload = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Resend gönderimi başarısız. HTTP {Status}. Response: {Response}",
                    (int)response.StatusCode,
                    payload);

                return new EmailSendResult(
                    false,
                    ErrorMessage: $"Resend HTTP {(int)response.StatusCode}");
            }

            string? id = null;
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(payload);
                if (doc.RootElement.TryGetProperty("id", out var idElement))
                    id = idElement.GetString();
            }
            catch (System.Text.Json.JsonException)
            {
            }

            return new EmailSendResult(true, id);
        }
        catch (Exception ex) when (
            ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogError(ex, "Resend e-posta isteği başarısız.");
            return new EmailSendResult(false, ErrorMessage: ex.Message);
        }
    }
}