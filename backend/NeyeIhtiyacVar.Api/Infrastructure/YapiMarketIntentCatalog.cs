namespace NeyeIhtiyacVar.Api.Infrastructure;

public static class YapiMarketIntentCatalog
{
    public sealed record Intent(
        string Query,
        string Label,
        string CategorySlug,
        string ServiceSlug,
        string IntentType);

    public static readonly Intent[] Items =
    [
        new("priz", "Priz satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("anahtar", "Elektrik anahtarı satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("sigorta", "Elektrik sigortası satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("kaçak akım", "Kaçak akım rölesi satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("kablo", "Elektrik kablosu satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("ampul", "Ampul / LED satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("musluk", "Musluk / batarya satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("batarya", "Lavabo / duş bataryası satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("vana", "Su vanası satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("boru", "Su tesisat borusu satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("klozet", "Klozet / vitrifiye satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("lavabo", "Lavabo satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("çimento", "Çimento satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("bims", "Bims / briket satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("tuğla", "Tuğla satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("kum", "İnşaat kumu satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("fayans", "Fayans / seramik satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("seramik", "Seramik satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("boya", "Boya ve boya malzemesi satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("silikon", "Silikon / yapıştırıcı satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("vida", "Vida / civata satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("matkap", "Matkap satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("matkap ucu", "Matkap ucu satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("spiral", "Taşlama / spiral makinesi satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("testere", "Testere / kesici takım satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("kereste", "Kereste / ahşap malzeme satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("izolasyon", "Yalıtım malzemesi satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("membran", "Su yalıtım membranı satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("iş eldiveni", "İş güvenliği eldiveni satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("baret", "Baret / iş güvenliği malzemesi satın almak istiyorum", "ev-yasam", "yapi-market", "sale"),
        new("merdiven", "Merdiven satın almak istiyorum", "ev-yasam", "yapi-market", "sale")
    ];
}