using System.Globalization;
using System.Text.Encodings.Web;

namespace NeyeIhtiyacVar.Api.Infrastructure.Email;

public static class JobOpportunityEmailTemplate
{
    public static string Render(
        string businessName,
        string service,
        string description,
        string city,
        string district,
        DateTime createdAtUtc,
        string actionUrl)
    {
        static string Safe(string? value) =>
            HtmlEncoder.Default.Encode(value ?? string.Empty);

        var name = Safe(string.IsNullOrWhiteSpace(businessName)
            ? "Değerli İşletmemiz" : businessName);
        var title = Safe(service);
        var location = Safe($"{city} / {district}");
        var details = Safe(description);
        var url = Safe(actionUrl);
        var date = createdAtUtc.AddHours(3)
            .ToString("dd MMMM yyyy", new CultureInfo("tr-TR"));

        var descriptionHtml = string.IsNullOrWhiteSpace(description)
            ? ""
            : $"""
              <tr><td style="padding:0 30px 22px;">
                <div style="border-top:1px solid #e8edf4;padding-top:18px;">
                  <p style="margin:0 0 8px;color:#65758b;font-size:12px;font-weight:bold;">MÜŞTERİNİN İHTİYACI</p>
                  <p style="margin:0;color:#263750;font-size:14px;line-height:1.7;white-space:pre-wrap;">{details}</p>
                </div>
              </td></tr>
              """;

        return $$"""
        <!doctype html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Yeni İş Fırsatı</title>
        </head>
        <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#172b4d;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb;">
            <tr><td align="center" style="padding:28px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
                <tr><td align="center" style="background:#102c50;padding:30px 20px;">
                  <div style="color:#ffffff;font-size:25px;font-weight:bold;">
                    Neye <span style="color:#ff914d;">İhtiyaç</span> Var?
                  </div>
                  <div style="color:#cbd9eb;font-size:12px;margin-top:8px;">
                    İhtiyaçlar fırsata dönüşüyor.
                  </div>
                </td></tr>
                <tr><td style="padding:32px 30px 16px;">
                  <p style="margin:0 0 12px;color:#e57931;font-size:12px;font-weight:bold;letter-spacing:1px;">
                    YENİ İŞ FIRSATI
                  </p>
                  <h1 style="margin:0 0 18px;font-size:25px;line-height:1.3;color:#102c50;">
                    Size uygun yeni bir iş fırsatı var!
                  </h1>
                  <p style="font-size:15px;line-height:1.7;margin:0 0 12px;">
                    Merhaba <strong>{{name}}</strong>,
                  </p>
                  <p style="font-size:14px;line-height:1.7;margin:0;color:#475569;">
                    Hizmet verdiğiniz bölgede yeni bir müşteri talebi oluşturuldu.
                    Detayları inceleyerek teklifinizi iletebilirsiniz.
                  </p>
                </td></tr>
                <tr><td style="padding:12px 30px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                         style="border:1px solid #e3eaf3;border-radius:12px;">
                    <tr><td style="background:#f5f8fc;padding:20px 22px;">
                      <div style="color:#66788e;font-size:11px;font-weight:bold;">TALEP EDİLEN HİZMET</div>
                      <div style="font-size:21px;font-weight:bold;color:#102c50;margin-top:7px;">{{title}}</div>
                    </td></tr>
                    <tr><td style="padding:20px 22px;font-size:14px;line-height:1.8;">
                      <strong>Konum:</strong> {{location}}<br>
                      <strong>Talep tarihi:</strong> {{date}}
                    </td></tr>
                    {{descriptionHtml}}
                  </table>
                </td></tr>
                <tr><td align="center" style="padding:0 30px 24px;">
                  <a href="{{url}}" style="display:block;background:#174a85;color:#ffffff;
                     padding:17px 16px;border-radius:9px;font-size:15px;font-weight:bold;
                     text-decoration:none;text-align:center;">
                    Talebi İncele ve Teklif Ver &#8594;
                  </a>
                </td></tr>
                <tr><td style="padding:0 30px 30px;">
                  <p style="background:#f0f6ff;border-radius:10px;padding:16px;
                            font-size:13px;line-height:1.6;color:#244669;margin:0;">
                    <strong>Teklif başına ek ücret yok.</strong><br>
                    Aktif üyeliğiniz ve hizmet kapsamınız dahilindeki taleplere
                    teklif başına ücret ödemeden yanıt verebilirsiniz.
                  </p>
                </td></tr>
                <tr><td align="center" style="background:#f7f9fc;padding:24px 20px;
                                                border-top:1px solid #e8edf4;">
                  <div style="font-weight:bold;color:#102c50;font-size:14px;">Neye İhtiyaç Var?</div>
                  <p style="font-size:12px;line-height:1.6;color:#748298;margin:10px 0;">
                    Bu bildirim işletmenizle eşleşen yeni bir talep nedeniyle gönderilmiştir.
                  </p>
                  <a href="https://neyeihtiyacvar.com"
                     style="color:#174a85;font-size:12px;text-decoration:none;">
                    neyeihtiyacvar.com
                  </a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
    }
}
