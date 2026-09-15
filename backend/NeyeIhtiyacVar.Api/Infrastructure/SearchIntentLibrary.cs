using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace NeyeIhtiyacVar.Api.Infrastructure;

public sealed record SearchIntentSeedRow(
    string Phrase,
    string ServiceName,
    string Specialty,
    string CategoryName,
    string GroupName);

public sealed record SearchIntentSuggestion(
    string Id,
    string Label,
    string[] Keywords,
    string CategorySlug,
    string ServiceSlug,
    string Intent,
    int Score,
    string MatchReason);

public static class SearchIntentLibrary
{
    private sealed record ServiceTarget(
        string CategorySlug,
        string CategoryName,
        string ServiceSlug,
        string ServiceName);

    private sealed record Candidate(
        string Label,
        string Alias,
        ServiceTarget Target,
        string Intent,
        string[] Context,
        string[] Negative,
        string MatchReason);

    private sealed record Curated(
        string Phrase,
        string Label,
        string ServiceName,
        string Intent,
        string[] Context,
        string[] Negative);

    private static readonly string[] RepairWords =
    [
        "ariza", "arizali", "bozuk", "bozuldu", "calismiyor", "tamir",
        "onarim", "degistir", "taktir", "montaj", "bakim", "kaciriyor",
        "sizdiriyor", "patladi", "tikandi", "sarkti", "kirildi"
    ];

    private static readonly string[] SaleWords =
    [
        "almak", "satin", "satinal", "satiliyor", "satis", "fiyat",
        "nereden al", "lazim", "magaza", "market", "urun"
    ];

    private static readonly string[] RentalWords =
    [
        "kirala", "kiralamak", "kiralik", "gunluk", "saatlik"
    ];

    private static readonly Curated[] CuratedRows =
    [
        new("döşeme", "Oto döşeme / araç iç döşeme", "Oto Döşeme", "service",
            ["araba","araç","oto","otomobil","koltuk","tavan","deri","direksiyon","kapı içi"],
            ["banyo","mutfak","fayans","seramik","mermer","parke","halıfleks"]),
        new("döşeme", "Seramik / fayans döşeme", "Yüzey Döşeme", "service",
            ["seramik","fayans","karo","çini","banyo","mutfak","duvar","zemin"],
            ["araba","araç","oto","koltuk","tavan"]),
        new("döşeme", "Mermer / granit döşeme", "Yüzey Döşeme", "service",
            ["mermer","granit","doğal taş","basamak","tezgah","zemin"],
            ["araba","araç","oto","koltuk"]),
        new("döşeme", "Halıfleks / halı kaplama", "Zemin Kaplama", "service",
            ["halı","halıfleks","ofis","zemin","kaplama"],
            ["araba","araç","oto"]),
        new("döşeme", "Parke / laminat döşeme", "Zemin Kaplama", "service",
            ["parke","laminat","lamine","masif","sistre","zemin"],
            ["araba","araç","oto"]),

        new("priz", "Priz arızası / priz taktırma", "Elektrikçi", "repair",
            ["arızalı","çalışmıyor","yanmış","gevşek","değiştir","taktır","montaj","elektrik"],
            ["satın","satış","fiyat","market"]),
        new("priz", "Priz arızası / priz taktırma", "Elektrik & Aydınlatma", "repair",
            ["arızalı","çalışmıyor","yanmış","gevşek","değiştir","taktır","montaj","elektrik"],
            ["satın","satış","fiyat","market"]),
        new("priz", "Priz satın almak istiyorum", "Yapı Market", "sale",
            ["satın","almak","lazım","fiyat","satış","market","ürün"],
            ["arızalı","çalışmıyor","tamir"]),

        new("musluk", "Musluk arızası / tesisatçı", "Su Tesisatı", "repair",
            ["akıtıyor","damlatıyor","kaçırıyor","arızalı","değiştir","taktır","tesisatçı"],
            ["satın","satış","fiyat","market"]),
        new("musluk", "Musluk satın almak istiyorum", "Yapı Market", "sale",
            ["satın","almak","lazım","fiyat","satış","market","batarya"],
            ["akıtıyor","kaçırıyor","tamir"]),

        new("boya", "Ev / iş yeri boyama hizmeti", "Boyacı", "service",
            ["ev","duvar","oda","işyeri","badana","boyatmak","usta"],
            ["araba","oto","araç","satın"]),
        new("boya", "Oto kaporta & boya", "Oto Kaporta & Boya", "service",
            ["araba","oto","araç","kaporta","tampon","çamurluk"],
            ["duvar","ev","oda","satın"]),
        new("boya", "Boya ve boya malzemesi satın almak", "Yapı Market", "sale",
            ["satın","almak","lazım","fiyat","rulo","fırça","market"],
            ["boyatmak","usta","araba"]),

        new("cam", "Ev / iş yeri cam ve ayna", "Cam & Ayna", "service",
            ["ev","pencere","ayna","vitrin","balkon","duşakabin"],
            ["araba","oto","araç"]),
        new("cam", "Oto cam hizmeti", "Oto Cam", "service",
            ["araba","oto","araç","ön cam","yan cam","cam çatladı"],
            ["ev","pencere","ayna"]),

        new("anahtar", "Ev / iş yeri çilingir", "Çilingir", "service",
            ["ev","kapı","kilit","apartman","işyeri","kapıda kaldım"],
            ["araba","oto","araç"]),
        new("anahtar", "Oto anahtar / oto kilit", "Oto Açma & Oto Kilit Tamiri", "service",
            ["araba","oto","araç","kumanda","immobilizer","kontak"],
            ["ev","apartman"]),

        new("klima", "Ev / iş yeri klima servisi", "Klima Servisi", "repair",
            ["ev","işyeri","soğutmuyor","ısıtmıyor","gaz","bakım","montaj"],
            ["araba","oto","araç"]),
        new("klima", "Ev / iş yeri klima servisi", "Klima", "repair",
            ["ev","işyeri","soğutmuyor","ısıtmıyor","gaz","bakım","montaj"],
            ["araba","oto","araç"]),
        new("klima", "Oto klima servisi", "Oto Klima", "repair",
            ["araba","oto","araç","klima gazı","kompresör"],
            ["ev","işyeri"]),

        new("lastik", "Oto lastik tamiri", "Oto Lastik Tamiri", "repair",
            ["araba","oto","araç","patladı","hava kaçırıyor","jant","teker"],
            []),
        new("bilgisayar", "Bilgisayar teknik servisi", "Bilgisayar Servisi", "repair",
            ["açılmıyor","format","mavi ekran","laptop","notebook","tamir"],
            ["satın","satış","fiyat"]),
        new("telefon", "Cep telefonu tamiri", "Telefon Tamiri", "repair",
            ["ekran","şarj","batarya","kırıldı","açılmıyor","tamir"],
            ["satın","satış","fiyat"]),
        new("kamera", "Güvenlik kamerası kurulumu", "Kamera Sistemleri", "service",
            ["güvenlik","işyeri","ev","kamera taktır","dvr","nvr","ip kamera"],
            ["düğün","fotoğraf"]),
        new("mermer", "Mermer döşeme / uygulama", "Yüzey Döşeme", "service",
            ["mermer","granit","doğal taş","zemin","basamak","tezgah"],
            []),
        new("seramik", "Seramik / fayans döşeme", "Yüzey Döşeme", "service",
            ["seramik","fayans","karo","banyo","mutfak","zemin","duvar"],
            []),
        new("parke", "Parke / laminat döşeme", "Zemin Kaplama", "service",
            ["parke","laminat","lamine","masif","sistre","zemin"],
            []),
        new("halıfleks", "Halıfleks / halı kaplama", "Zemin Kaplama", "service",
            ["halıfleks","halı","zemin","ofis","kaplama"],
            [])
    ];

    public static readonly SearchIntentSeedRow[] SeedRows =
    [
        new("Altın & Gümüş Tamiri", "Altın & Gümüş Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Altın & Gümüş Tamiri lazım", "Altın & Gümüş Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Altın & Gümüş Tamiri arıyorum", "Altın & Gümüş Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçı", "Alçı & Kartonpiyer", "Alçı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçı & Kartonpiyer", "Alçı & Kartonpiyer", "Alçı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçı lazım", "Alçı & Kartonpiyer", "Alçı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçı arıyorum", "Alçı & Kartonpiyer", "Alçı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçı Sıva", "Alçı & Kartonpiyer", "Alçı Sıva", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçı Sıva lazım", "Alçı & Kartonpiyer", "Alçı Sıva", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçı Sıva arıyorum", "Alçı & Kartonpiyer", "Alçı Sıva", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçıpan Asma Tavan", "Alçı & Kartonpiyer", "Alçıpan Asma Tavan", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçıpan Asma Tavan lazım", "Alçı & Kartonpiyer", "Alçıpan Asma Tavan", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçıpan Asma Tavan arıyorum", "Alçı & Kartonpiyer", "Alçıpan Asma Tavan", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçıpan Bölme Duvar", "Alçı & Kartonpiyer", "Alçıpan Bölme Duvar", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçıpan Bölme Duvar lazım", "Alçı & Kartonpiyer", "Alçıpan Bölme Duvar", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alçıpan Bölme Duvar arıyorum", "Alçı & Kartonpiyer", "Alçıpan Bölme Duvar", "Usta & Tamir", "Tadilat & Yapı"),
        new("Betopan", "Alçı & Kartonpiyer", "Betopan", "Usta & Tamir", "Tadilat & Yapı"),
        new("Betopan lazım", "Alçı & Kartonpiyer", "Betopan", "Usta & Tamir", "Tadilat & Yapı"),
        new("Betopan arıyorum", "Alçı & Kartonpiyer", "Betopan", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kartonpiyer", "Alçı & Kartonpiyer", "Kartonpiyer", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kartonpiyer lazım", "Alçı & Kartonpiyer", "Kartonpiyer", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kartonpiyer arıyorum", "Alçı & Kartonpiyer", "Kartonpiyer", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kemer", "Alçı & Kartonpiyer", "Kemer", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kemer lazım", "Alçı & Kartonpiyer", "Kemer", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kemer arıyorum", "Alçı & Kartonpiyer", "Kemer", "Usta & Tamir", "Tadilat & Yapı"),
        new("Niş", "Alçı & Kartonpiyer", "Niş", "Usta & Tamir", "Tadilat & Yapı"),
        new("Niş lazım", "Alçı & Kartonpiyer", "Niş", "Usta & Tamir", "Tadilat & Yapı"),
        new("Niş arıyorum", "Alçı & Kartonpiyer", "Niş", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçe Duvarı", "Bahçe ve Peyzaj", "Bahçe Duvarı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçe ve Peyzaj", "Bahçe ve Peyzaj", "Bahçe Duvarı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçe Duvarı lazım", "Bahçe ve Peyzaj", "Bahçe Duvarı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçe Duvarı arıyorum", "Bahçe ve Peyzaj", "Bahçe Duvarı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçe Çiti", "Bahçe ve Peyzaj", "Bahçe Çiti", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçe Çiti lazım", "Bahçe ve Peyzaj", "Bahçe Çiti", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçe Çiti arıyorum", "Bahçe ve Peyzaj", "Bahçe Çiti", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçıvanlık İşleri", "Bahçe ve Peyzaj", "Bahçıvanlık İşleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçıvanlık İşleri lazım", "Bahçe ve Peyzaj", "Bahçıvanlık İşleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bahçıvanlık İşleri arıyorum", "Bahçe ve Peyzaj", "Bahçıvanlık İşleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Branda & Tente", "Bahçe ve Peyzaj", "Branda & Tente", "Usta & Tamir", "Tadilat & Yapı"),
        new("Branda & Tente lazım", "Bahçe ve Peyzaj", "Branda & Tente", "Usta & Tamir", "Tadilat & Yapı"),
        new("Branda & Tente arıyorum", "Bahçe ve Peyzaj", "Branda & Tente", "Usta & Tamir", "Tadilat & Yapı"),
        new("Havuz Sistemleri", "Bahçe ve Peyzaj", "Havuz Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Havuz Sistemleri lazım", "Bahçe ve Peyzaj", "Havuz Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Havuz Sistemleri arıyorum", "Bahçe ve Peyzaj", "Havuz Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Hazır Çim", "Bahçe ve Peyzaj", "Hazır Çim", "Usta & Tamir", "Tadilat & Yapı"),
        new("Hazır Çim lazım", "Bahçe ve Peyzaj", "Hazır Çim", "Usta & Tamir", "Tadilat & Yapı"),
        new("Hazır Çim arıyorum", "Bahçe ve Peyzaj", "Hazır Çim", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kış Bahçesi", "Bahçe ve Peyzaj", "Kış Bahçesi", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kış Bahçesi lazım", "Bahçe ve Peyzaj", "Kış Bahçesi", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kış Bahçesi arıyorum", "Bahçe ve Peyzaj", "Kış Bahçesi", "Usta & Tamir", "Tadilat & Yapı"),
        new("Peyzaj", "Bahçe ve Peyzaj", "Peyzaj", "Usta & Tamir", "Tadilat & Yapı"),
        new("Peyzaj lazım", "Bahçe ve Peyzaj", "Peyzaj", "Usta & Tamir", "Tadilat & Yapı"),
        new("Peyzaj arıyorum", "Bahçe ve Peyzaj", "Peyzaj", "Usta & Tamir", "Tadilat & Yapı"),
        new("Sulama Sistemleri", "Bahçe ve Peyzaj", "Sulama Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Sulama Sistemleri lazım", "Bahçe ve Peyzaj", "Sulama Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Sulama Sistemleri arıyorum", "Bahçe ve Peyzaj", "Sulama Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Taş Süsleme", "Bahçe ve Peyzaj", "Taş Süsleme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Taş Süsleme lazım", "Bahçe ve Peyzaj", "Taş Süsleme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Taş Süsleme arıyorum", "Bahçe ve Peyzaj", "Taş Süsleme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çardak, Kamelya Kurulumu", "Bahçe ve Peyzaj", "Çardak, Kamelya Kurulumu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çardak, Kamelya Kurulumu lazım", "Bahçe ve Peyzaj", "Çardak, Kamelya Kurulumu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çardak, Kamelya Kurulumu arıyorum", "Bahçe ve Peyzaj", "Çardak, Kamelya Kurulumu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo Tadilat", "Banyo Tadilat", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo Tadilat lazım", "Banyo Tadilat", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo Tadilat arıyorum", "Banyo Tadilat", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo Dekorasyonu", "Banyo ve Mutfak Dekorasyonu", "Banyo Dekorasyonu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo ve Mutfak Dekorasyonu", "Banyo ve Mutfak Dekorasyonu", "Banyo Dekorasyonu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo Dekorasyonu lazım", "Banyo ve Mutfak Dekorasyonu", "Banyo Dekorasyonu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo Dekorasyonu arıyorum", "Banyo ve Mutfak Dekorasyonu", "Banyo Dekorasyonu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo Dolabı", "Banyo ve Mutfak Dekorasyonu", "Banyo Dolabı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo Dolabı lazım", "Banyo ve Mutfak Dekorasyonu", "Banyo Dolabı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Banyo Dolabı arıyorum", "Banyo ve Mutfak Dekorasyonu", "Banyo Dolabı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Buhar Odası", "Banyo ve Mutfak Dekorasyonu", "Buhar Odası", "Usta & Tamir", "Tadilat & Yapı"),
        new("Buhar Odası lazım", "Banyo ve Mutfak Dekorasyonu", "Buhar Odası", "Usta & Tamir", "Tadilat & Yapı"),
        new("Buhar Odası arıyorum", "Banyo ve Mutfak Dekorasyonu", "Buhar Odası", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duş Kabin, Küvet Kurulumu", "Banyo ve Mutfak Dekorasyonu", "Duş Kabin, Küvet Kurulumu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duş Kabin, Küvet Kurulumu lazım", "Banyo ve Mutfak Dekorasyonu", "Duş Kabin, Küvet Kurulumu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duş Kabin, Küvet Kurulumu arıyorum", "Banyo ve Mutfak Dekorasyonu", "Duş Kabin, Küvet Kurulumu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Hazır Mutfak", "Banyo ve Mutfak Dekorasyonu", "Hazır Mutfak", "Usta & Tamir", "Tadilat & Yapı"),
        new("Hazır Mutfak lazım", "Banyo ve Mutfak Dekorasyonu", "Hazır Mutfak", "Usta & Tamir", "Tadilat & Yapı"),
        new("Hazır Mutfak arıyorum", "Banyo ve Mutfak Dekorasyonu", "Hazır Mutfak", "Usta & Tamir", "Tadilat & Yapı"),
        new("Jakuzi Tamiri", "Banyo ve Mutfak Dekorasyonu", "Jakuzi Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Jakuzi Tamiri lazım", "Banyo ve Mutfak Dekorasyonu", "Jakuzi Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Jakuzi Tamiri arıyorum", "Banyo ve Mutfak Dekorasyonu", "Jakuzi Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Dekorasyonu", "Banyo ve Mutfak Dekorasyonu", "Mutfak Dekorasyonu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Dekorasyonu lazım", "Banyo ve Mutfak Dekorasyonu", "Mutfak Dekorasyonu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Dekorasyonu arıyorum", "Banyo ve Mutfak Dekorasyonu", "Mutfak Dekorasyonu", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Dolabı", "Banyo ve Mutfak Dekorasyonu", "Mutfak Dolabı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Dolabı lazım", "Banyo ve Mutfak Dekorasyonu", "Mutfak Dolabı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Dolabı arıyorum", "Banyo ve Mutfak Dekorasyonu", "Mutfak Dolabı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Tezgahı", "Banyo ve Mutfak Dekorasyonu", "Mutfak Tezgahı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Tezgahı lazım", "Banyo ve Mutfak Dekorasyonu", "Mutfak Tezgahı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Tezgahı arıyorum", "Banyo ve Mutfak Dekorasyonu", "Mutfak Tezgahı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Beyaz Eşya Servisi", "Beyaz Eşya Servisi", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Beyaz Eşya Servisi lazım", "Beyaz Eşya Servisi", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Beyaz Eşya Servisi arıyorum", "Beyaz Eşya Servisi", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bisiklet Tamiri", "Bisiklet Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bisiklet Tamiri lazım", "Bisiklet Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Bisiklet Tamiri arıyorum", "Bisiklet Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Boya Badana", "Boya Badana", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Boya Badana lazım", "Boya Badana", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Boya Badana arıyorum", "Boya Badana", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duvar Kağıdı", "Boyacı", "Duvar Kağıdı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Boyacı", "Boyacı", "Duvar Kağıdı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duvar Kağıdı lazım", "Boyacı", "Duvar Kağıdı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duvar Kağıdı arıyorum", "Boyacı", "Duvar Kağıdı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dış Cephe Boya", "Boyacı", "Dış Cephe Boya", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dış Cephe Boya lazım", "Boyacı", "Dış Cephe Boya", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dış Cephe Boya arıyorum", "Boyacı", "Dış Cephe Boya", "Usta & Tamir", "Tadilat & Yapı"),
        new("İç Cephe Boya", "Boyacı", "İç Cephe Boya", "Usta & Tamir", "Tadilat & Yapı"),
        new("İç Cephe Boya lazım", "Boyacı", "İç Cephe Boya", "Usta & Tamir", "Tadilat & Yapı"),
        new("İç Cephe Boya arıyorum", "Boyacı", "İç Cephe Boya", "Usta & Tamir", "Tadilat & Yapı"),
        new("Cam Balkon", "Cam Balkon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Cam Balkon lazım", "Cam Balkon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Cam Balkon arıyorum", "Cam Balkon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Demir Dekorasyon", "Demir & Ferforje", "Demir Dekorasyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Demir & Ferforje", "Demir & Ferforje", "Demir Dekorasyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Demir Dekorasyon lazım", "Demir & Ferforje", "Demir Dekorasyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Demir Dekorasyon arıyorum", "Demir & Ferforje", "Demir Dekorasyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Demir Doğrama", "Demir & Ferforje", "Demir Doğrama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Demir Doğrama lazım", "Demir & Ferforje", "Demir Doğrama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Demir Doğrama arıyorum", "Demir & Ferforje", "Demir Doğrama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dökme Demir", "Demir & Ferforje", "Dökme Demir", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dökme Demir lazım", "Demir & Ferforje", "Dökme Demir", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dökme Demir arıyorum", "Demir & Ferforje", "Dökme Demir", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Bahçe & Bina Giriş Kapısı", "Demir & Ferforje", "Ferforje Bahçe & Bina Giriş Kapısı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Bahçe & Bina Giriş Kapısı lazım", "Demir & Ferforje", "Ferforje Bahçe & Bina Giriş Kapısı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Bahçe & Bina Giriş Kapısı arıyorum", "Demir & Ferforje", "Ferforje Bahçe & Bina Giriş Kapısı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Balkon", "Demir & Ferforje", "Ferforje Balkon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Balkon lazım", "Demir & Ferforje", "Ferforje Balkon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Balkon arıyorum", "Demir & Ferforje", "Ferforje Balkon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Duvar Üstü Korkuluk", "Demir & Ferforje", "Ferforje Duvar Üstü Korkuluk", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Duvar Üstü Korkuluk lazım", "Demir & Ferforje", "Ferforje Duvar Üstü Korkuluk", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Duvar Üstü Korkuluk arıyorum", "Demir & Ferforje", "Ferforje Duvar Üstü Korkuluk", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Merdiven", "Demir & Ferforje", "Ferforje Merdiven", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Merdiven lazım", "Demir & Ferforje", "Ferforje Merdiven", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Merdiven arıyorum", "Demir & Ferforje", "Ferforje Merdiven", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Pencere Korkuluk", "Demir & Ferforje", "Ferforje Pencere Korkuluk", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Pencere Korkuluk lazım", "Demir & Ferforje", "Ferforje Pencere Korkuluk", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ferforje Pencere Korkuluk arıyorum", "Demir & Ferforje", "Ferforje Pencere Korkuluk", "Usta & Tamir", "Tadilat & Yapı"),
        new("Metal Enjeksiyon", "Demir & Ferforje", "Metal Enjeksiyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Metal Enjeksiyon lazım", "Demir & Ferforje", "Metal Enjeksiyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Metal Enjeksiyon arıyorum", "Demir & Ferforje", "Metal Enjeksiyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Yangın Merdiveni", "Demir & Ferforje", "Yangın Merdiveni", "Usta & Tamir", "Tadilat & Yapı"),
        new("Yangın Merdiveni lazım", "Demir & Ferforje", "Yangın Merdiveni", "Usta & Tamir", "Tadilat & Yapı"),
        new("Yangın Merdiveni arıyorum", "Demir & Ferforje", "Yangın Merdiveni", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çelik Konstrüksiyon", "Demir & Ferforje", "Çelik Konstrüksiyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çelik Konstrüksiyon lazım", "Demir & Ferforje", "Çelik Konstrüksiyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çelik Konstrüksiyon arıyorum", "Demir & Ferforje", "Çelik Konstrüksiyon", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duvar Dekorasyon", "Duvar Dekorasyon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duvar Dekorasyon lazım", "Duvar Dekorasyon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duvar Dekorasyon arıyorum", "Duvar Dekorasyon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duşakabin", "Duşakabin", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duşakabin lazım", "Duşakabin", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Duşakabin arıyorum", "Duşakabin", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Enstrüman Tamiri", "Enstrüman Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Enstrüman Tamiri lazım", "Enstrüman Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Enstrüman Tamiri arıyorum", "Enstrüman Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Aletleri Tamiri", "Ev Aletleri Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Aletleri Tamiri lazım", "Ev Aletleri Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Aletleri Tamiri arıyorum", "Ev Aletleri Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Dekorasyon", "Ev Dekorasyon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Dekorasyon lazım", "Ev Dekorasyon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Dekorasyon arıyorum", "Ev Dekorasyon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Tadilat", "Ev Tadilat", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Tadilat lazım", "Ev Tadilat", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Tadilat arıyorum", "Ev Tadilat", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Fayans Döşeme", "Fayans Döşeme", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Fayans Döşeme lazım", "Fayans Döşeme", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Fayans Döşeme arıyorum", "Fayans Döşeme", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alüminyum Kapı", "Kapı, Pencere, Cam & Cam Balkon", "Alüminyum Kapı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kapı, Pencere, Cam & Cam Balkon", "Kapı, Pencere, Cam & Cam Balkon", "Alüminyum Kapı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alüminyum Kapı lazım", "Kapı, Pencere, Cam & Cam Balkon", "Alüminyum Kapı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alüminyum Kapı arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Alüminyum Kapı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alüminyum Pencere", "Kapı, Pencere, Cam & Cam Balkon", "Alüminyum Pencere", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alüminyum Pencere lazım", "Kapı, Pencere, Cam & Cam Balkon", "Alüminyum Pencere", "Usta & Tamir", "Tadilat & Yapı"),
        new("Alüminyum Pencere arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Alüminyum Pencere", "Usta & Tamir", "Tadilat & Yapı"),
        new("Cam & Ayna", "Kapı, Pencere, Cam & Cam Balkon", "Cam & Ayna", "Usta & Tamir", "Tadilat & Yapı"),
        new("Cam & Ayna lazım", "Kapı, Pencere, Cam & Cam Balkon", "Cam & Ayna", "Usta & Tamir", "Tadilat & Yapı"),
        new("Cam & Ayna arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Cam & Ayna", "Usta & Tamir", "Tadilat & Yapı"),
        new("Cam Balkon Sistemleri", "Kapı, Pencere, Cam & Cam Balkon", "Cam Balkon Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Cam Balkon Sistemleri lazım", "Kapı, Pencere, Cam & Cam Balkon", "Cam Balkon Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Cam Balkon Sistemleri arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Cam Balkon Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Garaj Kapıları", "Kapı, Pencere, Cam & Cam Balkon", "Garaj Kapıları", "Usta & Tamir", "Tadilat & Yapı"),
        new("Garaj Kapıları lazım", "Kapı, Pencere, Cam & Cam Balkon", "Garaj Kapıları", "Usta & Tamir", "Tadilat & Yapı"),
        new("Garaj Kapıları arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Garaj Kapıları", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kepenk Sistemleri", "Kapı, Pencere, Cam & Cam Balkon", "Kepenk Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kepenk Sistemleri lazım", "Kapı, Pencere, Cam & Cam Balkon", "Kepenk Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kepenk Sistemleri arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Kepenk Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Korniş", "Kapı, Pencere, Cam & Cam Balkon", "Korniş", "Usta & Tamir", "Tadilat & Yapı"),
        new("Korniş lazım", "Kapı, Pencere, Cam & Cam Balkon", "Korniş", "Usta & Tamir", "Tadilat & Yapı"),
        new("Korniş arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Korniş", "Usta & Tamir", "Tadilat & Yapı"),
        new("Panjur Sistemleri", "Kapı, Pencere, Cam & Cam Balkon", "Panjur Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Panjur Sistemleri lazım", "Kapı, Pencere, Cam & Cam Balkon", "Panjur Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Panjur Sistemleri arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Panjur Sistemleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Perde & Jaluzi", "Kapı, Pencere, Cam & Cam Balkon", "Perde & Jaluzi", "Usta & Tamir", "Tadilat & Yapı"),
        new("Perde & Jaluzi lazım", "Kapı, Pencere, Cam & Cam Balkon", "Perde & Jaluzi", "Usta & Tamir", "Tadilat & Yapı"),
        new("Perde & Jaluzi arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Perde & Jaluzi", "Usta & Tamir", "Tadilat & Yapı"),
        new("Pvc Kapı", "Kapı, Pencere, Cam & Cam Balkon", "Pvc Kapı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Pvc Kapı lazım", "Kapı, Pencere, Cam & Cam Balkon", "Pvc Kapı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Pvc Kapı arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Pvc Kapı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Pvc Pencere", "Kapı, Pencere, Cam & Cam Balkon", "Pvc Pencere", "Usta & Tamir", "Tadilat & Yapı"),
        new("Pvc Pencere lazım", "Kapı, Pencere, Cam & Cam Balkon", "Pvc Pencere", "Usta & Tamir", "Tadilat & Yapı"),
        new("Pvc Pencere arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Pvc Pencere", "Usta & Tamir", "Tadilat & Yapı"),
        new("Sineklik", "Kapı, Pencere, Cam & Cam Balkon", "Sineklik", "Usta & Tamir", "Tadilat & Yapı"),
        new("Sineklik lazım", "Kapı, Pencere, Cam & Cam Balkon", "Sineklik", "Usta & Tamir", "Tadilat & Yapı"),
        new("Sineklik arıyorum", "Kapı, Pencere, Cam & Cam Balkon", "Sineklik", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kombi Tamiri", "Kombi Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kombi Tamiri lazım", "Kombi Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kombi Tamiri arıyorum", "Kombi Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kontak Tamiri & Anahtar Yedeği", "Kontak Tamiri & Anahtar Yedeği", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kontak Tamiri & Anahtar Yedeği lazım", "Kontak Tamiri & Anahtar Yedeği", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kontak Tamiri & Anahtar Yedeği arıyorum", "Kontak Tamiri & Anahtar Yedeği", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Lostra & Ayakkabı Tamiri", "Lostra & Ayakkabı Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Lostra & Ayakkabı Tamiri lazım", "Lostra & Ayakkabı Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Lostra & Ayakkabı Tamiri arıyorum", "Lostra & Ayakkabı Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ahşap Kapı Pencere Tamiri", "Marangoz", "Ahşap Kapı Pencere Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Marangoz", "Marangoz", "Ahşap Kapı Pencere Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ahşap Kapı Pencere Tamiri lazım", "Marangoz", "Ahşap Kapı Pencere Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ahşap Kapı Pencere Tamiri arıyorum", "Marangoz", "Ahşap Kapı Pencere Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ahşap Kapı Pencere Yapımı", "Marangoz", "Ahşap Kapı Pencere Yapımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ahşap Kapı Pencere Yapımı lazım", "Marangoz", "Ahşap Kapı Pencere Yapımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ahşap Kapı Pencere Yapımı arıyorum", "Marangoz", "Ahşap Kapı Pencere Yapımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Marangozluk İşleri", "Marangoz", "Marangozluk İşleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Marangozluk İşleri lazım", "Marangoz", "Marangozluk İşleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Marangozluk İşleri arıyorum", "Marangoz", "Marangozluk İşleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Süpürgelik", "Marangoz", "Süpürgelik", "Usta & Tamir", "Tadilat & Yapı"),
        new("Süpürgelik lazım", "Marangoz", "Süpürgelik", "Usta & Tamir", "Tadilat & Yapı"),
        new("Süpürgelik arıyorum", "Marangoz", "Süpürgelik", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dolap, Raf", "Mobilya ve Döşeme", "Dolap, Raf", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mobilya ve Döşeme", "Mobilya ve Döşeme", "Dolap, Raf", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dolap, Raf lazım", "Mobilya ve Döşeme", "Dolap, Raf", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dolap, Raf arıyorum", "Mobilya ve Döşeme", "Dolap, Raf", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Mobilyası", "Mobilya ve Döşeme", "Ev Mobilyası", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Mobilyası lazım", "Mobilya ve Döşeme", "Ev Mobilyası", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ev Mobilyası arıyorum", "Mobilya ve Döşeme", "Ev Mobilyası", "Usta & Tamir", "Tadilat & Yapı"),
        new("Koltuk Döşeme", "Mobilya ve Döşeme", "Koltuk Döşeme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Koltuk Döşeme lazım", "Mobilya ve Döşeme", "Koltuk Döşeme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Koltuk Döşeme arıyorum", "Mobilya ve Döşeme", "Koltuk Döşeme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Koltuk Kaplama, Döşeme", "Mobilya ve Döşeme", "Koltuk Kaplama, Döşeme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Koltuk Kaplama, Döşeme lazım", "Mobilya ve Döşeme", "Koltuk Kaplama, Döşeme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Koltuk Kaplama, Döşeme arıyorum", "Mobilya ve Döşeme", "Koltuk Kaplama, Döşeme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mobilya Cila & Lake İşleri", "Mobilya ve Döşeme", "Mobilya Cila & Lake İşleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mobilya Cila & Lake İşleri lazım", "Mobilya ve Döşeme", "Mobilya Cila & Lake İşleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mobilya Cila & Lake İşleri arıyorum", "Mobilya ve Döşeme", "Mobilya Cila & Lake İşleri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ofis Mobilyası", "Mobilya ve Döşeme", "Ofis Mobilyası", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ofis Mobilyası lazım", "Mobilya ve Döşeme", "Ofis Mobilyası", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ofis Mobilyası arıyorum", "Mobilya ve Döşeme", "Ofis Mobilyası", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Dekorasyon", "Mutfak Dekorasyon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Dekorasyon lazım", "Mutfak Dekorasyon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mutfak Dekorasyon arıyorum", "Mutfak Dekorasyon", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Overlok & Halı Onarımı", "Overlok & Halı Onarımı", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Overlok & Halı Onarımı lazım", "Overlok & Halı Onarımı", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Overlok & Halı Onarımı arıyorum", "Overlok & Halı Onarımı", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Parke Laminat Döşeme", "Parke Laminat Döşeme", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Parke Laminat Döşeme lazım", "Parke Laminat Döşeme", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Parke Laminat Döşeme arıyorum", "Parke Laminat Döşeme", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Pimapen", "Pimapen", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Pimapen lazım", "Pimapen", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Pimapen arıyorum", "Pimapen", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Piyano Akort", "Piyano Akort", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Piyano Akort lazım", "Piyano Akort", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Piyano Akort arıyorum", "Piyano Akort", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Radyo Televizyon Tamiri", "Radyo Televizyon Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Radyo Televizyon Tamiri lazım", "Radyo Televizyon Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Radyo Televizyon Tamiri arıyorum", "Radyo Televizyon Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Saat Tamiri", "Saat Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Saat Tamiri lazım", "Saat Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Saat Tamiri arıyorum", "Saat Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Spor Ekipmanları Bakım & Onarımı", "Spor Ekipmanları Bakım & Onarımı", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Spor Ekipmanları Bakım & Onarımı lazım", "Spor Ekipmanları Bakım & Onarımı", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Spor Ekipmanları Bakım & Onarımı arıyorum", "Spor Ekipmanları Bakım & Onarımı", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Tabela Tamiri", "Tabela Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Tabela Tamiri lazım", "Tabela Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Tabela Tamiri arıyorum", "Tabela Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Tekstil Tadilatı", "Tekstil Tadilatı", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Tekstil Tadilatı lazım", "Tekstil Tadilatı", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Tekstil Tadilatı arıyorum", "Tekstil Tadilatı", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dış Cephe Kaplama", "Yalıtım ve Mantolama", "Dış Cephe Kaplama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Yalıtım ve Mantolama", "Yalıtım ve Mantolama", "Dış Cephe Kaplama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dış Cephe Kaplama lazım", "Yalıtım ve Mantolama", "Dış Cephe Kaplama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Dış Cephe Kaplama arıyorum", "Yalıtım ve Mantolama", "Dış Cephe Kaplama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Isı Yalıtımı", "Yalıtım ve Mantolama", "Isı Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Isı Yalıtımı lazım", "Yalıtım ve Mantolama", "Isı Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Isı Yalıtımı arıyorum", "Yalıtım ve Mantolama", "Isı Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mantolama", "Yalıtım ve Mantolama", "Mantolama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mantolama lazım", "Yalıtım ve Mantolama", "Mantolama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Mantolama arıyorum", "Yalıtım ve Mantolama", "Mantolama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ses Yalıtımı", "Yalıtım ve Mantolama", "Ses Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ses Yalıtımı lazım", "Yalıtım ve Mantolama", "Ses Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Ses Yalıtımı arıyorum", "Yalıtım ve Mantolama", "Ses Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Su Yalıtımı", "Yalıtım ve Mantolama", "Su Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Su Yalıtımı lazım", "Yalıtım ve Mantolama", "Su Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Su Yalıtımı arıyorum", "Yalıtım ve Mantolama", "Su Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Söve", "Yalıtım ve Mantolama", "Söve", "Usta & Tamir", "Tadilat & Yapı"),
        new("Söve lazım", "Yalıtım ve Mantolama", "Söve", "Usta & Tamir", "Tadilat & Yapı"),
        new("Söve arıyorum", "Yalıtım ve Mantolama", "Söve", "Usta & Tamir", "Tadilat & Yapı"),
        new("Yangın Yalıtımı", "Yalıtım ve Mantolama", "Yangın Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Yangın Yalıtımı lazım", "Yalıtım ve Mantolama", "Yangın Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Yangın Yalıtımı arıyorum", "Yalıtım ve Mantolama", "Yangın Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çatı Tamiri", "Yalıtım ve Mantolama", "Çatı Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çatı Tamiri lazım", "Yalıtım ve Mantolama", "Çatı Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çatı Tamiri arıyorum", "Yalıtım ve Mantolama", "Çatı Tamiri", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çatı Yalıtımı", "Yalıtım ve Mantolama", "Çatı Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çatı Yalıtımı lazım", "Yalıtım ve Mantolama", "Çatı Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çatı Yalıtımı arıyorum", "Yalıtım ve Mantolama", "Çatı Yalıtımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çatı Yapımı", "Yalıtım ve Mantolama", "Çatı Yapımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çatı Yapımı lazım", "Yalıtım ve Mantolama", "Çatı Yapımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çatı Yapımı arıyorum", "Yalıtım ve Mantolama", "Çatı Yapımı", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çamaşır Makinesi Tamiri", "Çamaşır Makinesi Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çamaşır Makinesi Tamiri lazım", "Çamaşır Makinesi Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çamaşır Makinesi Tamiri arıyorum", "Çamaşır Makinesi Tamiri", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Anahtar Kopyalama", "Çilingir", "Anahtar Kopyalama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Çilingir", "Çilingir", "Anahtar Kopyalama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Anahtar Kopyalama lazım", "Çilingir", "Anahtar Kopyalama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Anahtar Kopyalama arıyorum", "Çilingir", "Anahtar Kopyalama", "Usta & Tamir", "Tadilat & Yapı"),
        new("Apartman Kapısı Kilidi", "Çilingir", "Apartman Kapısı Kilidi", "Usta & Tamir", "Tadilat & Yapı"),
        new("Apartman Kapısı Kilidi lazım", "Çilingir", "Apartman Kapısı Kilidi", "Usta & Tamir", "Tadilat & Yapı"),
        new("Apartman Kapısı Kilidi arıyorum", "Çilingir", "Apartman Kapısı Kilidi", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kapı Açma", "Çilingir", "Kapı Açma", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kapı Açma lazım", "Çilingir", "Kapı Açma", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kapı Açma arıyorum", "Çilingir", "Kapı Açma", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kasa Açma", "Çilingir", "Kasa Açma", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kasa Açma lazım", "Çilingir", "Kasa Açma", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kasa Açma arıyorum", "Çilingir", "Kasa Açma", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kilit Değiştirme", "Çilingir", "Kilit Değiştirme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kilit Değiştirme lazım", "Çilingir", "Kilit Değiştirme", "Usta & Tamir", "Tadilat & Yapı"),
        new("Kilit Değiştirme arıyorum", "Çilingir", "Kilit Değiştirme", "Usta & Tamir", "Tadilat & Yapı"),
        new("İç Mimar", "İç Mimar", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("İç Mimar lazım", "İç Mimar", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("İç Mimar arıyorum", "İç Mimar", "", "Usta & Tamir", "Tadilat & Yapı"),
        new("Geçiş Kontrol Sistemleri", "Alarm & Güvenlik", "Geçiş Kontrol Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Alarm & Güvenlik", "Alarm & Güvenlik", "Geçiş Kontrol Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Geçiş Kontrol Sistemleri lazım", "Alarm & Güvenlik", "Geçiş Kontrol Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Geçiş Kontrol Sistemleri arıyorum", "Alarm & Güvenlik", "Geçiş Kontrol Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Görüntülü Kapı Telefonları", "Alarm & Güvenlik", "Görüntülü Kapı Telefonları", "Usta & Tamir", "Tesisat & Teknik"),
        new("Görüntülü Kapı Telefonları lazım", "Alarm & Güvenlik", "Görüntülü Kapı Telefonları", "Usta & Tamir", "Tesisat & Teknik"),
        new("Görüntülü Kapı Telefonları arıyorum", "Alarm & Güvenlik", "Görüntülü Kapı Telefonları", "Usta & Tamir", "Tesisat & Teknik"),
        new("Hırsız Alarm Sistemleri", "Alarm & Güvenlik", "Hırsız Alarm Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Hırsız Alarm Sistemleri lazım", "Alarm & Güvenlik", "Hırsız Alarm Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Hırsız Alarm Sistemleri arıyorum", "Alarm & Güvenlik", "Hırsız Alarm Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kamera Sistemleri", "Alarm & Güvenlik", "Kamera Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kamera Sistemleri lazım", "Alarm & Güvenlik", "Kamera Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kamera Sistemleri arıyorum", "Alarm & Güvenlik", "Kamera Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kesintisiz Güç Kaynakları", "Alarm & Güvenlik", "Kesintisiz Güç Kaynakları", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kesintisiz Güç Kaynakları lazım", "Alarm & Güvenlik", "Kesintisiz Güç Kaynakları", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kesintisiz Güç Kaynakları arıyorum", "Alarm & Güvenlik", "Kesintisiz Güç Kaynakları", "Usta & Tamir", "Tesisat & Teknik"),
        new("Yangın & Güvenlik Sistemleri Servisi", "Alarm & Güvenlik", "Yangın & Güvenlik Sistemleri Servisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Yangın & Güvenlik Sistemleri Servisi lazım", "Alarm & Güvenlik", "Yangın & Güvenlik Sistemleri Servisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Yangın & Güvenlik Sistemleri Servisi arıyorum", "Alarm & Güvenlik", "Yangın & Güvenlik Sistemleri Servisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Yangın Alarm Sistemleri", "Alarm & Güvenlik", "Yangın Alarm Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Yangın Alarm Sistemleri lazım", "Alarm & Güvenlik", "Yangın Alarm Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Yangın Alarm Sistemleri arıyorum", "Alarm & Güvenlik", "Yangın Alarm Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Yangın Söndürme Sistemleri", "Alarm & Güvenlik", "Yangın Söndürme Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Yangın Söndürme Sistemleri lazım", "Alarm & Güvenlik", "Yangın Söndürme Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Yangın Söndürme Sistemleri arıyorum", "Alarm & Güvenlik", "Yangın Söndürme Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Asansör Tamiri", "Asansör Tamiri", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Asansör Tamiri lazım", "Asansör Tamiri", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Asansör Tamiri arıyorum", "Asansör Tamiri", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Doğal Gaz Tesisatı Ana Hat", "Doğalgaz Tesisatı", "Doğal Gaz Tesisatı Ana Hat", "Usta & Tamir", "Tesisat & Teknik"),
        new("Doğalgaz Tesisatı", "Doğalgaz Tesisatı", "Doğal Gaz Tesisatı Ana Hat", "Usta & Tamir", "Tesisat & Teknik"),
        new("Doğal Gaz Tesisatı Ana Hat lazım", "Doğalgaz Tesisatı", "Doğal Gaz Tesisatı Ana Hat", "Usta & Tamir", "Tesisat & Teknik"),
        new("Doğal Gaz Tesisatı Ana Hat arıyorum", "Doğalgaz Tesisatı", "Doğal Gaz Tesisatı Ana Hat", "Usta & Tamir", "Tesisat & Teknik"),
        new("Doğal Gaz Tesisatı Birim İçi", "Doğalgaz Tesisatı", "Doğal Gaz Tesisatı Birim İçi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Doğal Gaz Tesisatı Birim İçi lazım", "Doğalgaz Tesisatı", "Doğal Gaz Tesisatı Birim İçi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Doğal Gaz Tesisatı Birim İçi arıyorum", "Doğalgaz Tesisatı", "Doğal Gaz Tesisatı Birim İçi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kombi ve Petek Bakımı", "Doğalgaz Tesisatı", "Kombi ve Petek Bakımı", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kombi ve Petek Bakımı lazım", "Doğalgaz Tesisatı", "Kombi ve Petek Bakımı", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kombi ve Petek Bakımı arıyorum", "Doğalgaz Tesisatı", "Kombi ve Petek Bakımı", "Usta & Tamir", "Tesisat & Teknik"),
        new("Bahçe Aydınlatma", "Elektrik & Aydınlatma", "Bahçe Aydınlatma", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik & Aydınlatma", "Elektrik & Aydınlatma", "Bahçe Aydınlatma", "Usta & Tamir", "Tesisat & Teknik"),
        new("Bahçe Aydınlatma lazım", "Elektrik & Aydınlatma", "Bahçe Aydınlatma", "Usta & Tamir", "Tesisat & Teknik"),
        new("Bahçe Aydınlatma arıyorum", "Elektrik & Aydınlatma", "Bahçe Aydınlatma", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik Kablo Döşeme", "Elektrik & Aydınlatma", "Elektrik Kablo Döşeme", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik Kablo Döşeme lazım", "Elektrik & Aydınlatma", "Elektrik Kablo Döşeme", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik Kablo Döşeme arıyorum", "Elektrik & Aydınlatma", "Elektrik Kablo Döşeme", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik Tesisatı Döşeme", "Elektrik & Aydınlatma", "Elektrik Tesisatı Döşeme", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik Tesisatı Döşeme lazım", "Elektrik & Aydınlatma", "Elektrik Tesisatı Döşeme", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik Tesisatı Döşeme arıyorum", "Elektrik & Aydınlatma", "Elektrik Tesisatı Döşeme", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik Tesisatı Tamiri", "Elektrik & Aydınlatma", "Elektrik Tesisatı Tamiri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik Tesisatı Tamiri lazım", "Elektrik & Aydınlatma", "Elektrik Tesisatı Tamiri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrik Tesisatı Tamiri arıyorum", "Elektrik & Aydınlatma", "Elektrik Tesisatı Tamiri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Gizli Işık", "Elektrik & Aydınlatma", "Gizli Işık", "Usta & Tamir", "Tesisat & Teknik"),
        new("Gizli Işık lazım", "Elektrik & Aydınlatma", "Gizli Işık", "Usta & Tamir", "Tesisat & Teknik"),
        new("Gizli Işık arıyorum", "Elektrik & Aydınlatma", "Gizli Işık", "Usta & Tamir", "Tesisat & Teknik"),
        new("İç Mekan Aydınlatma", "Elektrik & Aydınlatma", "İç Mekan Aydınlatma", "Usta & Tamir", "Tesisat & Teknik"),
        new("İç Mekan Aydınlatma lazım", "Elektrik & Aydınlatma", "İç Mekan Aydınlatma", "Usta & Tamir", "Tesisat & Teknik"),
        new("İç Mekan Aydınlatma arıyorum", "Elektrik & Aydınlatma", "İç Mekan Aydınlatma", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrikçi", "Elektrikçi", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrikçi lazım", "Elektrikçi", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Elektrikçi arıyorum", "Elektrikçi", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Güneş Enerjisi", "Isıtma, Soğutma", "Güneş Enerjisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Isıtma, Soğutma", "Isıtma, Soğutma", "Güneş Enerjisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Güneş Enerjisi lazım", "Isıtma, Soğutma", "Güneş Enerjisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Güneş Enerjisi arıyorum", "Isıtma, Soğutma", "Güneş Enerjisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Havalandırma Sistemleri", "Isıtma, Soğutma", "Havalandırma Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Havalandırma Sistemleri lazım", "Isıtma, Soğutma", "Havalandırma Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Havalandırma Sistemleri arıyorum", "Isıtma, Soğutma", "Havalandırma Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kat Kalorifer Tesisatı", "Isıtma, Soğutma", "Kat Kalorifer Tesisatı", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kat Kalorifer Tesisatı lazım", "Isıtma, Soğutma", "Kat Kalorifer Tesisatı", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kat Kalorifer Tesisatı arıyorum", "Isıtma, Soğutma", "Kat Kalorifer Tesisatı", "Usta & Tamir", "Tesisat & Teknik"),
        new("Klima Servisi", "Isıtma, Soğutma", "Klima Servisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Klima Servisi lazım", "Isıtma, Soğutma", "Klima Servisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Klima Servisi arıyorum", "Isıtma, Soğutma", "Klima Servisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kombi & Radyatör Servisi", "Isıtma, Soğutma", "Kombi & Radyatör Servisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kombi & Radyatör Servisi lazım", "Isıtma, Soğutma", "Kombi & Radyatör Servisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kombi & Radyatör Servisi arıyorum", "Isıtma, Soğutma", "Kombi & Radyatör Servisi", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kombi Ve Radyatör", "Isıtma, Soğutma", "Kombi Ve Radyatör", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kombi Ve Radyatör lazım", "Isıtma, Soğutma", "Kombi Ve Radyatör", "Usta & Tamir", "Tesisat & Teknik"),
        new("Kombi Ve Radyatör arıyorum", "Isıtma, Soğutma", "Kombi Ve Radyatör", "Usta & Tamir", "Tesisat & Teknik"),
        new("Merkezi Sistem Kalorifer Tesisatı", "Isıtma, Soğutma", "Merkezi Sistem Kalorifer Tesisatı", "Usta & Tamir", "Tesisat & Teknik"),
        new("Merkezi Sistem Kalorifer Tesisatı lazım", "Isıtma, Soğutma", "Merkezi Sistem Kalorifer Tesisatı", "Usta & Tamir", "Tesisat & Teknik"),
        new("Merkezi Sistem Kalorifer Tesisatı arıyorum", "Isıtma, Soğutma", "Merkezi Sistem Kalorifer Tesisatı", "Usta & Tamir", "Tesisat & Teknik"),
        new("Şofben & Termosifon", "Isıtma, Soğutma", "Şofben & Termosifon", "Usta & Tamir", "Tesisat & Teknik"),
        new("Şofben & Termosifon lazım", "Isıtma, Soğutma", "Şofben & Termosifon", "Usta & Tamir", "Tesisat & Teknik"),
        new("Şofben & Termosifon arıyorum", "Isıtma, Soğutma", "Şofben & Termosifon", "Usta & Tamir", "Tesisat & Teknik"),
        new("Jeneratör Tamiri", "Jeneratör Tamiri", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Jeneratör Tamiri lazım", "Jeneratör Tamiri", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Jeneratör Tamiri arıyorum", "Jeneratör Tamiri", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Klima Montaj", "Klima Montaj", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Klima Montaj lazım", "Klima Montaj", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Klima Montaj arıyorum", "Klima Montaj", "", "Usta & Tamir", "Tesisat & Teknik"),
        new("Hidrofor Tesisatı Kurulum & Değişim", "Su Tesisatı", "Hidrofor Tesisatı Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Tesisatı", "Su Tesisatı", "Hidrofor Tesisatı Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Hidrofor Tesisatı Kurulum & Değişim lazım", "Su Tesisatı", "Hidrofor Tesisatı Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Hidrofor Tesisatı Kurulum & Değişim arıyorum", "Su Tesisatı", "Hidrofor Tesisatı Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Hidrofor Tesisatı Tamir & Bakım", "Su Tesisatı", "Hidrofor Tesisatı Tamir & Bakım", "Usta & Tamir", "Tesisat & Teknik"),
        new("Hidrofor Tesisatı Tamir & Bakım lazım", "Su Tesisatı", "Hidrofor Tesisatı Tamir & Bakım", "Usta & Tamir", "Tesisat & Teknik"),
        new("Hidrofor Tesisatı Tamir & Bakım arıyorum", "Su Tesisatı", "Hidrofor Tesisatı Tamir & Bakım", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Arıtma Sistemleri", "Su Tesisatı", "Su Arıtma Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Arıtma Sistemleri lazım", "Su Tesisatı", "Su Arıtma Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Arıtma Sistemleri arıyorum", "Su Tesisatı", "Su Arıtma Sistemleri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Deposu Kurulum & Değişim", "Su Tesisatı", "Su Deposu Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Deposu Kurulum & Değişim lazım", "Su Tesisatı", "Su Deposu Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Deposu Kurulum & Değişim arıyorum", "Su Tesisatı", "Su Deposu Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Kaçak Tespiti", "Su Tesisatı", "Su Kaçak Tespiti", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Kaçak Tespiti lazım", "Su Tesisatı", "Su Kaçak Tespiti", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Kaçak Tespiti arıyorum", "Su Tesisatı", "Su Kaçak Tespiti", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Tesisatı Kurulum & Değişim", "Su Tesisatı", "Su Tesisatı Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Tesisatı Kurulum & Değişim lazım", "Su Tesisatı", "Su Tesisatı Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Tesisatı Kurulum & Değişim arıyorum", "Su Tesisatı", "Su Tesisatı Kurulum & Değişim", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Tesisatı Tamiri", "Su Tesisatı", "Su Tesisatı Tamiri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Tesisatı Tamiri lazım", "Su Tesisatı", "Su Tesisatı Tamiri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Su Tesisatı Tamiri arıyorum", "Su Tesisatı", "Su Tesisatı Tamiri", "Usta & Tamir", "Tesisat & Teknik"),
        new("Tıkalı Boru Açma", "Su Tesisatı", "Tıkalı Boru Açma", "Usta & Tamir", "Tesisat & Teknik"),
        new("Tıkalı Boru Açma lazım", "Su Tesisatı", "Tıkalı Boru Açma", "Usta & Tamir", "Tesisat & Teknik"),
        new("Tıkalı Boru Açma arıyorum", "Su Tesisatı", "Tıkalı Boru Açma", "Usta & Tamir", "Tesisat & Teknik"),
        new("Mimarlık Hizmeti", "Mimarlık & Mühendislik", "Mimarlık Hizmeti", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Mimarlık & Mühendislik", "Mimarlık & Mühendislik", "Mimarlık Hizmeti", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Mimarlık Hizmeti lazım", "Mimarlık & Mühendislik", "Mimarlık Hizmeti", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Mimarlık Hizmeti arıyorum", "Mimarlık & Mühendislik", "Mimarlık Hizmeti", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Mühendislik Hizmeti", "Mimarlık & Mühendislik", "Mühendislik Hizmeti", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Mühendislik Hizmeti lazım", "Mimarlık & Mühendislik", "Mühendislik Hizmeti", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Mühendislik Hizmeti arıyorum", "Mimarlık & Mühendislik", "Mühendislik Hizmeti", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Proje Hizmetleri", "Mimarlık & Mühendislik", "Proje Hizmetleri", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Proje Hizmetleri lazım", "Mimarlık & Mühendislik", "Proje Hizmetleri", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Proje Hizmetleri arıyorum", "Mimarlık & Mühendislik", "Proje Hizmetleri", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("İç Mimari", "Mimarlık & Mühendislik", "İç Mimari", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("İç Mimari lazım", "Mimarlık & Mühendislik", "İç Mimari", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("İç Mimari arıyorum", "Mimarlık & Mühendislik", "İç Mimari", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Beton Duvar", "Taş & Beton Döşeme", "Beton Duvar", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Taş & Beton Döşeme", "Taş & Beton Döşeme", "Beton Duvar", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Beton Duvar lazım", "Taş & Beton Döşeme", "Beton Duvar", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Beton Duvar arıyorum", "Taş & Beton Döşeme", "Beton Duvar", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Taş Duvar", "Taş & Beton Döşeme", "Taş Duvar", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Taş Duvar lazım", "Taş & Beton Döşeme", "Taş Duvar", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Taş Duvar arıyorum", "Taş & Beton Döşeme", "Taş Duvar", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Taş Zemin", "Taş & Beton Döşeme", "Taş Zemin", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Taş Zemin lazım", "Taş & Beton Döşeme", "Taş Zemin", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Taş Zemin arıyorum", "Taş & Beton Döşeme", "Taş Zemin", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Cam Mozaik", "Yüzey Döşeme", "Cam Mozaik", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Yüzey Döşeme", "Yüzey Döşeme", "Cam Mozaik", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Cam Mozaik lazım", "Yüzey Döşeme", "Cam Mozaik", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Cam Mozaik arıyorum", "Yüzey Döşeme", "Cam Mozaik", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Fayans", "Yüzey Döşeme", "Fayans", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Fayans lazım", "Yüzey Döşeme", "Fayans", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Fayans arıyorum", "Yüzey Döşeme", "Fayans", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Granit", "Yüzey Döşeme", "Granit", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Granit lazım", "Yüzey Döşeme", "Granit", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Granit arıyorum", "Yüzey Döşeme", "Granit", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Karo Çini", "Yüzey Döşeme", "Karo Çini", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Karo Çini lazım", "Yüzey Döşeme", "Karo Çini", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Karo Çini arıyorum", "Yüzey Döşeme", "Karo Çini", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Mermer", "Yüzey Döşeme", "Mermer", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Mermer lazım", "Yüzey Döşeme", "Mermer", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Mermer arıyorum", "Yüzey Döşeme", "Mermer", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Seramik", "Yüzey Döşeme", "Seramik", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Seramik lazım", "Yüzey Döşeme", "Seramik", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Seramik arıyorum", "Yüzey Döşeme", "Seramik", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Endüstriyel Zemin Kaplama", "Zemin Kaplama", "Endüstriyel Zemin Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Zemin Kaplama", "Zemin Kaplama", "Endüstriyel Zemin Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Endüstriyel Zemin Kaplama lazım", "Zemin Kaplama", "Endüstriyel Zemin Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Endüstriyel Zemin Kaplama arıyorum", "Zemin Kaplama", "Endüstriyel Zemin Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Epoksi Zemin Kaplama", "Zemin Kaplama", "Epoksi Zemin Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Epoksi Zemin Kaplama lazım", "Zemin Kaplama", "Epoksi Zemin Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Epoksi Zemin Kaplama arıyorum", "Zemin Kaplama", "Epoksi Zemin Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Halı Kaplama", "Zemin Kaplama", "Halı Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Halı Kaplama lazım", "Zemin Kaplama", "Halı Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Halı Kaplama arıyorum", "Zemin Kaplama", "Halı Kaplama", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Laminat Parke", "Zemin Kaplama", "Laminat Parke", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Laminat Parke lazım", "Zemin Kaplama", "Laminat Parke", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Laminat Parke arıyorum", "Zemin Kaplama", "Laminat Parke", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Lamine Parke", "Zemin Kaplama", "Lamine Parke", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Lamine Parke lazım", "Zemin Kaplama", "Lamine Parke", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Lamine Parke arıyorum", "Zemin Kaplama", "Lamine Parke", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Masif Parke", "Zemin Kaplama", "Masif Parke", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Masif Parke lazım", "Zemin Kaplama", "Masif Parke", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Masif Parke arıyorum", "Zemin Kaplama", "Masif Parke", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Sistre Cila", "Zemin Kaplama", "Sistre Cila", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Sistre Cila lazım", "Zemin Kaplama", "Sistre Cila", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Sistre Cila arıyorum", "Zemin Kaplama", "Sistre Cila", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Altyapı", "İnşaat & Hafriyat", "Altyapı", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("İnşaat & Hafriyat", "İnşaat & Hafriyat", "Altyapı", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Altyapı lazım", "İnşaat & Hafriyat", "Altyapı", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Altyapı arıyorum", "İnşaat & Hafriyat", "Altyapı", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Bina Yıkım", "İnşaat & Hafriyat", "Bina Yıkım", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Bina Yıkım lazım", "İnşaat & Hafriyat", "Bina Yıkım", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Bina Yıkım arıyorum", "İnşaat & Hafriyat", "Bina Yıkım", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Hafriyat", "İnşaat & Hafriyat", "Hafriyat", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Hafriyat lazım", "İnşaat & Hafriyat", "Hafriyat", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Hafriyat arıyorum", "İnşaat & Hafriyat", "Hafriyat", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Müteahhit", "İnşaat & Hafriyat", "Müteahhit", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Müteahhit lazım", "İnşaat & Hafriyat", "Müteahhit", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Müteahhit arıyorum", "İnşaat & Hafriyat", "Müteahhit", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Prefabrik Yapı", "İnşaat & Hafriyat", "Prefabrik Yapı", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Prefabrik Yapı lazım", "İnşaat & Hafriyat", "Prefabrik Yapı", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Prefabrik Yapı arıyorum", "İnşaat & Hafriyat", "Prefabrik Yapı", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Restorasyon", "İnşaat & Hafriyat", "Restorasyon", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Restorasyon lazım", "İnşaat & Hafriyat", "Restorasyon", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Restorasyon arıyorum", "İnşaat & Hafriyat", "Restorasyon", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Sondaj", "İnşaat & Hafriyat", "Sondaj", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Sondaj lazım", "İnşaat & Hafriyat", "Sondaj", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Sondaj arıyorum", "İnşaat & Hafriyat", "Sondaj", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("Diyetisyen", "Diyetisyen", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Diyetisyen lazım", "Diyetisyen", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Diyetisyen arıyorum", "Diyetisyen", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Online Psikolog", "Online Psikolog", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Online Psikolog lazım", "Online Psikolog", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Online Psikolog arıyorum", "Online Psikolog", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Personal Trainer / Kişisel Antrenör", "Personal Trainer / Kişisel Antrenör", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Personal Trainer / Kişisel Antrenör lazım", "Personal Trainer / Kişisel Antrenör", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Personal Trainer / Kişisel Antrenör arıyorum", "Personal Trainer / Kişisel Antrenör", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Psikolog", "Psikolog", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Psikolog lazım", "Psikolog", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Psikolog arıyorum", "Psikolog", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Yaşlı Bakımı", "Yaşlı Bakımı", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Yaşlı Bakımı lazım", "Yaşlı Bakımı", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Yaşlı Bakımı arıyorum", "Yaşlı Bakımı", "", "Ev Yaşam", "Bakım & Yaşam"),
        new("Sütun", "Alçı & Kartonpiyer", "Sütun", "Ev Yaşam", "Temizlik"),
        new("Sütun lazım", "Alçı & Kartonpiyer", "Sütun", "Ev Yaşam", "Temizlik"),
        new("Sütun arıyorum", "Alçı & Kartonpiyer", "Sütun", "Ev Yaşam", "Temizlik"),
        new("Apartman Temizliği", "Apartman Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Apartman Temizliği lazım", "Apartman Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Apartman Temizliği arıyorum", "Apartman Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Boş Ev Temizliği", "Boş Ev Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Boş Ev Temizliği lazım", "Boş Ev Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Boş Ev Temizliği arıyorum", "Boş Ev Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Böcek İlaçlama", "Böcek İlaçlama", "", "Ev Yaşam", "Temizlik"),
        new("Böcek İlaçlama lazım", "Böcek İlaçlama", "", "Ev Yaşam", "Temizlik"),
        new("Böcek İlaçlama arıyorum", "Böcek İlaçlama", "", "Ev Yaşam", "Temizlik"),
        new("Cam Temizliği", "Cam Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Cam Temizliği lazım", "Cam Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Cam Temizliği arıyorum", "Cam Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Ev Temizliği", "Ev Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Ev Temizliği lazım", "Ev Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Ev Temizliği arıyorum", "Ev Temizliği", "", "Ev Yaşam", "Temizlik"),
        new("Halı Yıkama", "Halı Yıkama", "", "Ev Yaşam", "Temizlik"),
        new("Halı Yıkama lazım", "Halı Yıkama", "", "Ev Yaşam", "Temizlik"),
        new("Halı Yıkama arıyorum", "Halı Yıkama", "", "Ev Yaşam", "Temizlik"),
        new("Koltuk Yıkama", "Koltuk Yıkama", "", "Ev Yaşam", "Temizlik"),
        new("Koltuk Yıkama lazım", "Koltuk Yıkama", "", "Ev Yaşam", "Temizlik"),
        new("Koltuk Yıkama arıyorum", "Koltuk Yıkama", "", "Ev Yaşam", "Temizlik"),
        new("Su Deposu Temizlik & Yalıtım", "Su Tesisatı", "Su Deposu Temizlik & Yalıtım", "Ev Yaşam", "Temizlik"),
        new("Su Deposu Temizlik & Yalıtım lazım", "Su Tesisatı", "Su Deposu Temizlik & Yalıtım", "Ev Yaşam", "Temizlik"),
        new("Su Deposu Temizlik & Yalıtım arıyorum", "Su Tesisatı", "Su Deposu Temizlik & Yalıtım", "Ev Yaşam", "Temizlik"),
        new("Baca Temizleme", "Temizlik & İlaçlama", "Baca Temizleme", "Ev Yaşam", "Temizlik"),
        new("Temizlik & İlaçlama", "Temizlik & İlaçlama", "Baca Temizleme", "Ev Yaşam", "Temizlik"),
        new("Baca Temizleme lazım", "Temizlik & İlaçlama", "Baca Temizleme", "Ev Yaşam", "Temizlik"),
        new("Baca Temizleme arıyorum", "Temizlik & İlaçlama", "Baca Temizleme", "Ev Yaşam", "Temizlik"),
        new("Bina Temizliği", "Temizlik & İlaçlama", "Bina Temizliği", "Ev Yaşam", "Temizlik"),
        new("Bina Temizliği lazım", "Temizlik & İlaçlama", "Bina Temizliği", "Ev Yaşam", "Temizlik"),
        new("Bina Temizliği arıyorum", "Temizlik & İlaçlama", "Bina Temizliği", "Ev Yaşam", "Temizlik"),
        new("Dış Cephe Temizliği", "Temizlik & İlaçlama", "Dış Cephe Temizliği", "Ev Yaşam", "Temizlik"),
        new("Dış Cephe Temizliği lazım", "Temizlik & İlaçlama", "Dış Cephe Temizliği", "Ev Yaşam", "Temizlik"),
        new("Dış Cephe Temizliği arıyorum", "Temizlik & İlaçlama", "Dış Cephe Temizliği", "Ev Yaşam", "Temizlik"),
        new("Havuz Temizleme", "Temizlik & İlaçlama", "Havuz Temizleme", "Ev Yaşam", "Temizlik"),
        new("Havuz Temizleme lazım", "Temizlik & İlaçlama", "Havuz Temizleme", "Ev Yaşam", "Temizlik"),
        new("Havuz Temizleme arıyorum", "Temizlik & İlaçlama", "Havuz Temizleme", "Ev Yaşam", "Temizlik"),
        new("Perde Yıkama", "Temizlik & İlaçlama", "Perde Yıkama", "Ev Yaşam", "Temizlik"),
        new("Perde Yıkama lazım", "Temizlik & İlaçlama", "Perde Yıkama", "Ev Yaşam", "Temizlik"),
        new("Perde Yıkama arıyorum", "Temizlik & İlaçlama", "Perde Yıkama", "Ev Yaşam", "Temizlik"),
        new("İşyeri Temizliği", "Temizlik & İlaçlama", "İşyeri Temizliği", "Ev Yaşam", "Temizlik"),
        new("İşyeri Temizliği lazım", "Temizlik & İlaçlama", "İşyeri Temizliği", "Ev Yaşam", "Temizlik"),
        new("İşyeri Temizliği arıyorum", "Temizlik & İlaçlama", "İşyeri Temizliği", "Ev Yaşam", "Temizlik"),
        new("Nem & Rutubet Yalıtımı", "Yalıtım ve Mantolama", "Nem & Rutubet Yalıtımı", "Ev Yaşam", "Temizlik"),
        new("Nem & Rutubet Yalıtımı lazım", "Yalıtım ve Mantolama", "Nem & Rutubet Yalıtımı", "Ev Yaşam", "Temizlik"),
        new("Nem & Rutubet Yalıtımı arıyorum", "Yalıtım ve Mantolama", "Nem & Rutubet Yalıtımı", "Ev Yaşam", "Temizlik"),
        new("İnşaat Sonrası Temizlik", "İnşaat Sonrası Temizlik", "", "Ev Yaşam", "Temizlik"),
        new("İnşaat Sonrası Temizlik lazım", "İnşaat Sonrası Temizlik", "", "Ev Yaşam", "Temizlik"),
        new("İnşaat Sonrası Temizlik arıyorum", "İnşaat Sonrası Temizlik", "", "Ev Yaşam", "Temizlik"),
        new("Evden Eve Nakliyat", "Evden Eve Nakliyat", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Evden Eve Nakliyat lazım", "Evden Eve Nakliyat", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Evden Eve Nakliyat arıyorum", "Evden Eve Nakliyat", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Eşya Taşıma", "Eşya Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Eşya Taşıma lazım", "Eşya Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Eşya Taşıma arıyorum", "Eşya Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Fuar, Fabrika & Banka Taşımacılığı", "Fuar, Fabrika & Banka Taşımacılığı", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Fuar, Fabrika & Banka Taşımacılığı lazım", "Fuar, Fabrika & Banka Taşımacılığı", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Fuar, Fabrika & Banka Taşımacılığı arıyorum", "Fuar, Fabrika & Banka Taşımacılığı", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Gümrükleme", "Gümrükleme", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Gümrükleme lazım", "Gümrükleme", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Gümrükleme arıyorum", "Gümrükleme", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Hamal", "Hamal", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Hamal lazım", "Hamal", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Hamal arıyorum", "Hamal", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Koltuk Taşıma", "Koltuk Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Koltuk Taşıma lazım", "Koltuk Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Koltuk Taşıma arıyorum", "Koltuk Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Kurye, Kargo", "Kurye, Kargo", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Kurye, Kargo lazım", "Kurye, Kargo", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Kurye, Kargo arıyorum", "Kurye, Kargo", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Lojistik, Depolama & Paketleme", "Lojistik, Depolama & Paketleme", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Lojistik, Depolama & Paketleme lazım", "Lojistik, Depolama & Paketleme", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Lojistik, Depolama & Paketleme arıyorum", "Lojistik, Depolama & Paketleme", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Nakliye", "Nakliye", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Nakliye lazım", "Nakliye", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Nakliye arıyorum", "Nakliye", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Nakliye Ambarları & Kooperatifleri", "Nakliye Ambarları & Kooperatifleri", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Nakliye Ambarları & Kooperatifleri lazım", "Nakliye Ambarları & Kooperatifleri", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Nakliye Ambarları & Kooperatifleri arıyorum", "Nakliye Ambarları & Kooperatifleri", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Parça Eşya Taşıma", "Parça Eşya Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Parça Eşya Taşıma lazım", "Parça Eşya Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Parça Eşya Taşıma arıyorum", "Parça Eşya Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Yük Taşıma", "Yük Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Yük Taşıma lazım", "Yük Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Yük Taşıma arıyorum", "Yük Taşıma", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Şehirler Arası Nakliye", "Şehirler Arası Nakliye", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Şehirler Arası Nakliye lazım", "Şehirler Arası Nakliye", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Şehirler Arası Nakliye arıyorum", "Şehirler Arası Nakliye", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Şoförlü Araç & Transfer", "Şoförlü Araç & Transfer", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Şoförlü Araç & Transfer lazım", "Şoförlü Araç & Transfer", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Şoförlü Araç & Transfer arıyorum", "Şoförlü Araç & Transfer", "", "Nakliye & Taşıma", "Taşıma & Lojistik"),
        new("Bilgisayar Teknik Servisi", "Bilgisayar Teknik Servisi", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Bilgisayar Teknik Servisi lazım", "Bilgisayar Teknik Servisi", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Bilgisayar Teknik Servisi arıyorum", "Bilgisayar Teknik Servisi", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Cep Telefonu Tamiri", "Cep Telefonu Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Cep Telefonu Tamiri lazım", "Cep Telefonu Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Cep Telefonu Tamiri arıyorum", "Cep Telefonu Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Elektronik Cihaz Tamiri", "Elektronik Cihaz Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Elektronik Cihaz Tamiri lazım", "Elektronik Cihaz Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Elektronik Cihaz Tamiri arıyorum", "Elektronik Cihaz Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Fotokopi Makinesi Tamiri", "Fotokopi Makinesi Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Fotokopi Makinesi Tamiri lazım", "Fotokopi Makinesi Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Fotokopi Makinesi Tamiri arıyorum", "Fotokopi Makinesi Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Telefon Santrali Servisi", "Telefon Santrali Servisi", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Telefon Santrali Servisi lazım", "Telefon Santrali Servisi", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Telefon Santrali Servisi arıyorum", "Telefon Santrali Servisi", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Uydu Sistemleri Kurulum & Onarım", "Uydu Sistemleri Kurulum & Onarım", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Uydu Sistemleri Kurulum & Onarım lazım", "Uydu Sistemleri Kurulum & Onarım", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Uydu Sistemleri Kurulum & Onarım arıyorum", "Uydu Sistemleri Kurulum & Onarım", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Yazıcı Tamiri", "Yazıcı Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Yazıcı Tamiri lazım", "Yazıcı Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Yazıcı Tamiri arıyorum", "Yazıcı Tamiri", "", "Teknoloji", "Bilişim & Elektronik"),
        new("Marina & Liman Hizmetleri", "Marina & Liman Hizmetleri", "", "Otomotiv", "Otomotiv"),
        new("Marina & Liman Hizmetleri lazım", "Marina & Liman Hizmetleri", "", "Otomotiv", "Otomotiv"),
        new("Marina & Liman Hizmetleri arıyorum", "Marina & Liman Hizmetleri", "", "Otomotiv", "Otomotiv"),
        new("Oto Açma & Oto Kilit Tamiri", "Oto Açma & Oto Kilit Tamiri", "", "Otomotiv", "Otomotiv"),
        new("Oto Açma & Oto Kilit Tamiri lazım", "Oto Açma & Oto Kilit Tamiri", "", "Otomotiv", "Otomotiv"),
        new("Oto Açma & Oto Kilit Tamiri arıyorum", "Oto Açma & Oto Kilit Tamiri", "", "Otomotiv", "Otomotiv"),
        new("Oto Döşeme", "Oto Döşeme", "", "Otomotiv", "Otomotiv"),
        new("Oto Döşeme lazım", "Oto Döşeme", "", "Otomotiv", "Otomotiv"),
        new("Oto Döşeme arıyorum", "Oto Döşeme", "", "Otomotiv", "Otomotiv"),
        new("Oto Ekspertiz", "Oto Ekspertiz", "", "Otomotiv", "Otomotiv"),
        new("Oto Ekspertiz lazım", "Oto Ekspertiz", "", "Otomotiv", "Otomotiv"),
        new("Oto Ekspertiz arıyorum", "Oto Ekspertiz", "", "Otomotiv", "Otomotiv"),
        new("Oto Elektrik & Ses", "Oto Elektrik & Ses", "", "Otomotiv", "Otomotiv"),
        new("Oto Elektrik & Ses lazım", "Oto Elektrik & Ses", "", "Otomotiv", "Otomotiv"),
        new("Oto Elektrik & Ses arıyorum", "Oto Elektrik & Ses", "", "Otomotiv", "Otomotiv"),
        new("Oto Kaporta & Boya", "Oto Kaporta & Boya", "", "Otomotiv", "Otomotiv"),
        new("Oto Kaporta & Boya lazım", "Oto Kaporta & Boya", "", "Otomotiv", "Otomotiv"),
        new("Oto Kaporta & Boya arıyorum", "Oto Kaporta & Boya", "", "Otomotiv", "Otomotiv"),
        new("Oto Lastik Tamiri", "Oto Lastik Tamiri", "", "Otomotiv", "Otomotiv"),
        new("Oto Lastik Tamiri lazım", "Oto Lastik Tamiri", "", "Otomotiv", "Otomotiv"),
        new("Oto Lastik Tamiri arıyorum", "Oto Lastik Tamiri", "", "Otomotiv", "Otomotiv"),
        new("Oto Modifiye", "Oto Modifiye", "", "Otomotiv", "Otomotiv"),
        new("Oto Modifiye lazım", "Oto Modifiye", "", "Otomotiv", "Otomotiv"),
        new("Oto Modifiye arıyorum", "Oto Modifiye", "", "Otomotiv", "Otomotiv"),
        new("Oto Plaka", "Oto Plaka", "", "Otomotiv", "Otomotiv"),
        new("Oto Plaka lazım", "Oto Plaka", "", "Otomotiv", "Otomotiv"),
        new("Oto Plaka arıyorum", "Oto Plaka", "", "Otomotiv", "Otomotiv"),
        new("Oto Tamir & Servis", "Oto Tamir & Servis", "", "Otomotiv", "Otomotiv"),
        new("Oto Tamir & Servis lazım", "Oto Tamir & Servis", "", "Otomotiv", "Otomotiv"),
        new("Oto Tamir & Servis arıyorum", "Oto Tamir & Servis", "", "Otomotiv", "Otomotiv"),
        new("Oto Temizlik", "Oto Temizlik", "", "Otomotiv", "Otomotiv"),
        new("Oto Temizlik lazım", "Oto Temizlik", "", "Otomotiv", "Otomotiv"),
        new("Oto Temizlik arıyorum", "Oto Temizlik", "", "Otomotiv", "Otomotiv"),
        new("Tekne & Yat Tamiri", "Tekne & Yat Tamiri", "", "Otomotiv", "Otomotiv"),
        new("Tekne & Yat Tamiri lazım", "Tekne & Yat Tamiri", "", "Otomotiv", "Otomotiv"),
        new("Tekne & Yat Tamiri arıyorum", "Tekne & Yat Tamiri", "", "Otomotiv", "Otomotiv"),
        new("Trafik Müşavirliği", "Trafik Müşavirliği", "", "Otomotiv", "Otomotiv"),
        new("Trafik Müşavirliği lazım", "Trafik Müşavirliği", "", "Otomotiv", "Otomotiv"),
        new("Trafik Müşavirliği arıyorum", "Trafik Müşavirliği", "", "Otomotiv", "Otomotiv"),
        new("Çekici & Yol Yardım", "Çekici & Yol Yardım", "", "Otomotiv", "Yol Yardım"),
        new("Çekici & Yol Yardım lazım", "Çekici & Yol Yardım", "", "Otomotiv", "Yol Yardım"),
        new("Çekici & Yol Yardım arıyorum", "Çekici & Yol Yardım", "", "Otomotiv", "Yol Yardım"),
        new("Direksiyon Dersi", "Direksiyon Dersi", "", "Eğitim", "Eğitim & Kurs"),
        new("Direksiyon Dersi lazım", "Direksiyon Dersi", "", "Eğitim", "Eğitim & Kurs"),
        new("Direksiyon Dersi arıyorum", "Direksiyon Dersi", "", "Eğitim", "Eğitim & Kurs"),
        new("Matematik Özel Ders", "Matematik Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Matematik Özel Ders lazım", "Matematik Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Matematik Özel Ders arıyorum", "Matematik Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Online İngilizce Özel Ders", "Online İngilizce Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Online İngilizce Özel Ders lazım", "Online İngilizce Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Online İngilizce Özel Ders arıyorum", "Online İngilizce Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Ortaokul Matematik Özel Ders", "Ortaokul Matematik Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Ortaokul Matematik Özel Ders lazım", "Ortaokul Matematik Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Ortaokul Matematik Özel Ders arıyorum", "Ortaokul Matematik Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Tenis Dersi", "Tenis Dersi", "", "Eğitim", "Eğitim & Kurs"),
        new("Tenis Dersi lazım", "Tenis Dersi", "", "Eğitim", "Eğitim & Kurs"),
        new("Tenis Dersi arıyorum", "Tenis Dersi", "", "Eğitim", "Eğitim & Kurs"),
        new("Yüzme Dersi", "Yüzme Dersi", "", "Eğitim", "Eğitim & Kurs"),
        new("Yüzme Dersi lazım", "Yüzme Dersi", "", "Eğitim", "Eğitim & Kurs"),
        new("Yüzme Dersi arıyorum", "Yüzme Dersi", "", "Eğitim", "Eğitim & Kurs"),
        new("İlkokul Özel Ders", "İlkokul Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("İlkokul Özel Ders lazım", "İlkokul Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("İlkokul Özel Ders arıyorum", "İlkokul Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("İngilizce Özel Ders", "İngilizce Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("İngilizce Özel Ders lazım", "İngilizce Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("İngilizce Özel Ders arıyorum", "İngilizce Özel Ders", "", "Eğitim", "Eğitim & Kurs"),
        new("Düğün Fotoğrafçısı / Dış Çekim", "Düğün Fotoğrafçısı / Dış Çekim", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Düğün Fotoğrafçısı / Dış Çekim lazım", "Düğün Fotoğrafçısı / Dış Çekim", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Düğün Fotoğrafçısı / Dış Çekim arıyorum", "Düğün Fotoğrafçısı / Dış Çekim", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Düğün Organizasyon", "Düğün Organizasyon", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Düğün Organizasyon lazım", "Düğün Organizasyon", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Düğün Organizasyon arıyorum", "Düğün Organizasyon", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Grafik Tasarım", "Grafik Tasarım", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Grafik Tasarım lazım", "Grafik Tasarım", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Grafik Tasarım arıyorum", "Grafik Tasarım", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Logo Tasarım", "Logo Tasarım", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Logo Tasarım lazım", "Logo Tasarım", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Logo Tasarım arıyorum", "Logo Tasarım", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Organizasyon", "Organizasyon", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Organizasyon lazım", "Organizasyon", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Organizasyon arıyorum", "Organizasyon", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Pasta", "Pasta", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Pasta lazım", "Pasta", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Pasta arıyorum", "Pasta", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Web Sitesi Yapımı", "Web Sitesi Yapımı", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Web Sitesi Yapımı lazım", "Web Sitesi Yapımı", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Web Sitesi Yapımı arıyorum", "Web Sitesi Yapımı", "", "Organizasyon", "Etkinlik & Organizasyon"),
        new("Buzdolabı Servisi", "Buzdolabı Servisi", "", "Diğer", "Diğer İhtiyaçlar"),
        new("Buzdolabı Servisi lazım", "Buzdolabı Servisi", "", "Diğer", "Diğer İhtiyaçlar"),
        new("Buzdolabı Servisi arıyorum", "Buzdolabı Servisi", "", "Diğer", "Diğer İhtiyaçlar"),
        new("Kombi Servisi", "Kombi Servisi", "", "Diğer", "Diğer İhtiyaçlar"),
        new("Kombi Servisi lazım", "Kombi Servisi", "", "Diğer", "Diğer İhtiyaçlar"),
        new("Kombi Servisi arıyorum", "Kombi Servisi", "", "Diğer", "Diğer İhtiyaçlar"),
        new("Petek Temizliği", "Petek Temizliği", "", "Diğer", "Diğer İhtiyaçlar"),
        new("Petek Temizliği lazım", "Petek Temizliği", "", "Diğer", "Diğer İhtiyaçlar"),
        new("Petek Temizliği arıyorum", "Petek Temizliği", "", "Diğer", "Diğer İhtiyaçlar"),
        new("vana arızalı", "Su Tesisatı", "Musluk / Vana Tamiri", "Usta & Tamir", "Tesisat & Teknik"),
        new("vena arızalı", "Su Tesisatı", "Musluk / Vana Tamiri", "Usta & Tamir", "Tesisat & Teknik"),
        new("çukur kazdıracağım", "İnşaat & Hafriyat", "Kazı / Hafriyat", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("kazı yaptıracağım", "İnşaat & Hafriyat", "Kazı / Hafriyat", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("kepçe lazım", "İnşaat & Hafriyat", "İş Makinesi", "Usta & Tamir", "İnşaat & Hafriyat"),
        new("yolda kaldım", "Çekici & Yol Yardım", "Oto Çekici", "Otomotiv", "Yol Yardım"),
        new("telefon düştü ekran gitti", "Cep Telefonu Tamiri", "Ekran / Donanım", "Teknoloji", "Bilişim & Elektronik"),
        new("sigorta sürekli atıyor", "Elektrik & Aydınlatma", "Elektrik Arızası", "Usta & Tamir", "Tesisat & Teknik"),
    ];

    public static async Task<SearchIntentSuggestion[]> SuggestAsync(
        AppDbContext dbContext,
        string query,
        int limit,
        CancellationToken cancellationToken)
    {
        var clean = Normalize(query);

        if (clean.Length < 2)
        {
            return [];
        }

        var categories = await dbContext.Categories
            .AsNoTracking()
            .Include(x => x.Services)
            .Where(x => x.IsActive)
            .ToListAsync(cancellationToken);

        var targets = categories
            .SelectMany(category => category.Services
                .Where(service => service.IsActive)
                .Select(service => new ServiceTarget(
                    category.Slug,
                    category.Name,
                    TaxonomyV3Catalog.ToSlug(service.Name),
                    service.Name)))
            .ToArray();

        var candidates = new List<Candidate>(targets.Length * 10);

        foreach (var target in targets)
        {
            AddCandidate(candidates, target.ServiceName, target.ServiceName, target, "service", [], [], "katalog");

            foreach (var phrase in BuildGenericPhrases(target.ServiceName))
            {
                AddCandidate(candidates, target.ServiceName, phrase, target, InferIntent(phrase), [], [], "otomatik-varyasyon");
            }
        }

        foreach (var row in SeedRows)
        {
            var target = ResolveTarget(targets, row.CategoryName, row.ServiceName);

            if (target is null)
            {
                continue;
            }

            var label = string.IsNullOrWhiteSpace(row.Specialty)
                ? row.ServiceName
                : row.Specialty;

            AddCandidate(
                candidates,
                label,
                row.Phrase,
                target,
                InferIntent(row.Phrase),
                [],
                [],
                "master-sozluk");
        }

        foreach (var path in TaxonomyV3Catalog.Paths)
        {
            var target = targets.FirstOrDefault(x =>
                string.Equals(
                    x.CategorySlug,
                    path.LegacyCategorySlug,
                    StringComparison.OrdinalIgnoreCase) &&
                string.Equals(
                    x.ServiceSlug,
                    path.LegacyServiceSlug,
                    StringComparison.OrdinalIgnoreCase));

            if (target is null)
            {
                continue;
            }

            foreach (var term in path.SearchTerms)
            {
                AddCandidate(
                    candidates,
                    path.Specialty,
                    term,
                    target,
                    InferIntent(term),
                    [],
                    [],
                    "taxonomy-v3");
            }
        }

        foreach (var curated in CuratedRows)
        {
            var target = ResolveTarget(targets, null, curated.ServiceName);

            if (target is null)
            {
                continue;
            }

            AddCandidate(
                candidates,
                curated.Label,
                curated.Phrase,
                target,
                curated.Intent,
                curated.Context,
                curated.Negative,
                "baglam-kurali");
        }

        var detectedIntent = InferIntent(clean);
        var queryTokens = Tokens(clean);

        var scored = candidates
            .Select(candidate =>
            {
                var score = ScoreAlias(clean, queryTokens, candidate.Alias);

                foreach (var context in candidate.Context)
                {
                    if (ContainsPhrase(clean, Normalize(context)))
                    {
                        score += 16;
                    }
                }

                foreach (var negative in candidate.Negative)
                {
                    if (ContainsPhrase(clean, Normalize(negative)))
                    {
                        score -= 22;
                    }
                }

                if (detectedIntent != "service" &&
                    candidate.Intent != "service")
                {
                    score += candidate.Intent == detectedIntent ? 12 : -10;
                }

                if (ContainsPhrase(clean, Normalize(candidate.Target.ServiceName)))
                {
                    score += 9;
                }

                score = Math.Clamp(score, 0, 100);

                return new
                {
                    Candidate = candidate,
                    Score = score
                };
            })
            .Where(x => x.Score >= 52)
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Candidate.Label)
            .GroupBy(x => new
            {
                x.Candidate.Target.CategorySlug,
                x.Candidate.Target.ServiceSlug,
                x.Candidate.Label,
                x.Candidate.Intent
            })
            .Select(group => group.First())
            .Take(Math.Clamp(limit, 1, 12))
            .Select(x => new SearchIntentSuggestion(
                Id:
                    $"{x.Candidate.Target.CategorySlug}:{x.Candidate.Target.ServiceSlug}:{TaxonomyV3Catalog.ToSlug(x.Candidate.Label)}:{x.Candidate.Intent}",
                Label: x.Candidate.Label,
                Keywords: [x.Candidate.Alias],
                CategorySlug: x.Candidate.Target.CategorySlug,
                ServiceSlug: x.Candidate.Target.ServiceSlug,
                Intent: x.Candidate.Intent,
                Score: x.Score,
                MatchReason: x.Candidate.MatchReason))
            .ToArray();

        return scored;
    }

    public static string Normalize(string? value)
        => TaxonomyV3Catalog.Normalize(value);

    private static void AddCandidate(
        List<Candidate> candidates,
        string label,
        string alias,
        ServiceTarget target,
        string intent,
        string[] context,
        string[] negative,
        string reason)
    {
        if (string.IsNullOrWhiteSpace(alias))
        {
            return;
        }

        candidates.Add(new Candidate(
            label.Trim(),
            Normalize(alias),
            target,
            intent,
            context,
            negative,
            reason));
    }

    private static ServiceTarget? ResolveTarget(
        ServiceTarget[] targets,
        string? categoryName,
        string serviceName)
    {
        var normalizedService = Normalize(serviceName);
        var normalizedCategory = Normalize(categoryName);

        var exact = targets.FirstOrDefault(x =>
            Normalize(x.ServiceName) == normalizedService &&
            (normalizedCategory.Length == 0 ||
             Normalize(x.CategoryName) == normalizedCategory));

        if (exact is not null)
        {
            return exact;
        }

        var serviceMatches = targets
            .Where(x => Normalize(x.ServiceName) == normalizedService)
            .ToArray();

        return serviceMatches.Length == 1
            ? serviceMatches[0]
            : null;
    }

    private static IEnumerable<string> BuildGenericPhrases(string serviceName)
    {
        yield return serviceName;
        yield return $"{serviceName} lazım";
        yield return $"{serviceName} arıyorum";
        yield return $"{serviceName} yaptırmak istiyorum";
        yield return $"{serviceName} hizmeti";
        yield return $"{serviceName} servisi";
        yield return $"{serviceName} tamiri";
        yield return $"{serviceName} kurulumu";
        yield return $"{serviceName} montajı";
        yield return $"{serviceName} fiyatı";
        yield return $"{serviceName} satın almak";
        yield return $"{serviceName} kiralamak";
    }

    private static string InferIntent(string phrase)
    {
        var normalized = Normalize(phrase);

        if (RentalWords.Any(x => ContainsPhrase(normalized, Normalize(x))))
        {
            return "rental";
        }

        if (SaleWords.Any(x => ContainsPhrase(normalized, Normalize(x))))
        {
            return "sale";
        }

        if (RepairWords.Any(x => ContainsPhrase(normalized, Normalize(x))))
        {
            return "repair";
        }

        return "service";
    }

    private static int ScoreAlias(
        string query,
        string[] queryTokens,
        string alias)
    {
        if (query == alias)
        {
            return 100;
        }

        if (query.Length >= 3 && alias.Contains(query, StringComparison.Ordinal))
        {
            return 86;
        }

        if (alias.Length >= 3 && query.Contains(alias, StringComparison.Ordinal))
        {
            return 92;
        }

        var aliasTokens = Tokens(alias);

        if (queryTokens.Length == 0 || aliasTokens.Length == 0)
        {
            return 0;
        }

        var tokenScores = new List<double>();

        foreach (var queryToken in queryTokens)
        {
            var best = aliasTokens
                .Select(aliasToken => TokenSimilarity(queryToken, aliasToken))
                .DefaultIfEmpty(0d)
                .Max();

            tokenScores.Add(best);
        }

        var average = tokenScores.Average();
        var exactHits = queryTokens.Count(qt =>
            aliasTokens.Any(at => at == qt));

        var coverage = (double)exactHits /
            Math.Max(1, Math.Min(queryTokens.Length, aliasTokens.Length));

        return (int)Math.Round(
            Math.Min(
                88,
                average * 68 +
                coverage * 22));
    }

    private static double TokenSimilarity(string left, string right)
    {
        if (left == right)
        {
            return 1d;
        }

        if (left.Length >= 3 &&
            right.Length >= 3 &&
            (left.Contains(right, StringComparison.Ordinal) ||
             right.Contains(left, StringComparison.Ordinal)))
        {
            return 0.9d;
        }

        var distance = LevenshteinDistance(left, right);
        var maxLength = Math.Max(left.Length, right.Length);

        if (maxLength == 0)
        {
            return 0d;
        }

        return Math.Max(
            0d,
            1d - (double)distance / maxLength);
    }

    private static bool ContainsPhrase(string haystack, string needle)
        => needle.Length > 0 &&
           (haystack == needle ||
            haystack.Contains(needle, StringComparison.Ordinal));

    private static string[] Tokens(string value)
        => Normalize(value)
            .Split(
                ' ',
                StringSplitOptions.RemoveEmptyEntries |
                StringSplitOptions.TrimEntries)
            .Where(x => x.Length > 1)
            .ToArray();

    private static int LevenshteinDistance(string left, string right)
    {
        var previous = new int[right.Length + 1];
        var current = new int[right.Length + 1];

        for (var j = 0; j <= right.Length; j++)
        {
            previous[j] = j;
        }

        for (var i = 1; i <= left.Length; i++)
        {
            current[0] = i;

            for (var j = 1; j <= right.Length; j++)
            {
                var cost = left[i - 1] == right[j - 1] ? 0 : 1;

                current[j] = Math.Min(
                    Math.Min(
                        current[j - 1] + 1,
                        previous[j] + 1),
                    previous[j - 1] + cost);
            }

            (previous, current) = (current, previous);
        }

        return previous[right.Length];
    }
}
