export type LegalSectionData = {
  title: string;
  paragraphs: string[];
};

export type LegalDocumentData = {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSectionData[];
};

export const legalDocuments: LegalDocumentData[] = [
  {
    slug: "kullanim-kosullari",
    title: "Kullanım ve Üyelik Koşulları",
    summary: "Kullanıcı üyeliği, ihtiyaç oluşturma, eşleştirme, teklif, iletişim ve platform kullanım kuralları.",
    sections: [
      { title: "1. Taraflar ve Platform İşletmecisi", paragraphs: [
        "neyeihtiyacvar.com ve buna bağlı dijital hizmetler Teknonet Yazılım tarafından işletilmektedir. Bu metinde TEKNONET platform işletmecisini, Platform Neye İhtiyaç Var hizmetlerini, Kullanıcı ihtiyaç sahibi kişiyi, İşletme ise bağımsız hizmet sağlayıcıları ifade eder."
      ]},
      { title: "2. Platformun Amacı ve Rolü", paragraphs: [
        "Neye İhtiyaç Var; kullanıcıların ihtiyaçlarını oluşturabildiği, ihtiyaçlarına uygun işletmeleri bulabildiği, teklif ve iletişim süreçlerini yürütebildiği dijital eşleştirme ve aracılık platformudur.",
        "Aksi açıkça belirtilmedikçe TEKNONET, Platformda listelenen bağımsız işletmeler tarafından sunulan mal veya hizmetlerin satıcısı ya da sağlayıcısı değildir. Hizmetin kapsamı, fiyatı, süresi ve ifa şartları esas olarak Kullanıcı ile ilgili İşletme arasında belirlenir. Bu hüküm TEKNONET'in mevzuattan doğan ve sözleşmeyle kaldırılamayacak yükümlülüklerini ortadan kaldırmaz."
      ]},
      { title: "3. Üyelik", paragraphs: [
        "Platformun bazı özellikleri üyelik gerektirebilir. Kullanıcı kayıt sırasında verdiği bilgilerin doğru, güncel ve kendisine ait olduğunu kabul eder. Başkasına ait kimlik veya iletişim bilgileriyle hesap oluşturulamaz. Hesap güvenliğinin korunması Kullanıcının sorumluluğundadır."
      ]},
      { title: "4. İhtiyaç Oluşturma", paragraphs: [
        "Kullanıcılar ürün veya hizmet ihtiyaçlarına ilişkin talep oluşturabilir. Talepler gerçeğe uygun olmalı; hukuka aykırı, yanıltıcı, tehdit edici, hakaret içeren veya üçüncü kişilerin haklarını ihlal eden içerik barındırmamalıdır.",
        "İhtiyaç açıklamalarına gereksiz kişisel veri, parola, finansal hesap bilgisi veya üçüncü kişilere ait hassas bilgiler eklenmemelidir."
      ]},
      { title: "5. Eşleştirme ve İşletme Önerileri", paragraphs: [
        "Platform; ihtiyaç türü, kategori, hizmet, konum, işletme bilgileri, değerlendirmeler ve diğer uygunluk ölçütlerinden yararlanarak İşletmeler önerebilir. Sıralama tek başına belirli bir işletmenin diğerlerinden daha kaliteli olduğu anlamına gelmez.",
        "Ücretli öne çıkarma, reklam veya sponsorlu sıralama kullanılırsa bunun Kullanıcı tarafından anlaşılabilir şekilde belirtilmesi esastır."
      ]},
      { title: "6. Teklifler ve İletişim", paragraphs: [
        "İşletmeler uygun ihtiyaçlara teklif verebilir. Tekliflerde fiyat, hizmet kapsamı ve şartların açık olması İşletmenin sorumluluğundadır. Tarafların iletişim bilgilerinin paylaşımı Platformun ilgili özelliği ve kişisel verilerin korunması kuralları çerçevesinde gerçekleştirilir."
      ]},
      { title: "7. İşletmelerin Bağımsızlığı", paragraphs: [
        "İşletmeler, aksi açıkça belirtilmedikçe TEKNONET'in çalışanı, şubesi, temsilcisi veya acentesi değildir. Gerekli ruhsat, izin, yetki ve mesleki yeterliliklerin bulunmasından ilgili İşletme sorumludur."
      ]},
      { title: "8. Fiyat ve Ödeme", paragraphs: [
        "Mevcut yapıda Kullanıcı ile İşletme arasındaki hizmet bedeli ve ödeme şartları taraflar arasında belirlenebilir. Platform üzerinden doğrudan ödeme özelliği sunulmaya başlanırsa gerekli ön bilgilendirme, ödeme, iptal ve tüketici haklarına ilişkin koşullar ayrıca düzenlenir."
      ]},
      { title: "9. Değerlendirme ve Yorumlar", paragraphs: [
        "Değerlendirmelerin gerçek deneyime dayanması esastır. Sahte değerlendirme, manipülasyon, hakaret, tehdit, kişisel veri paylaşımı, reklam veya spam içerikleri yasaktır. Olumsuz olması tek başına bir yorumun kaldırılması nedeni değildir."
      ]},
      { title: "10. Yasaklanan Kullanımlar", paragraphs: [
        "Sahte hesap oluşturmak, dolandırıcılık yapmak, sistem güvenliğini ihlal etmeye çalışmak, izinsiz veri toplamak, spam göndermek, kişisel verileri hukuka aykırı paylaşmak ve Platformu suç teşkil eden faaliyetlerde kullanmak yasaktır."
      ]},
      { title: "11. Hesabın Kısıtlanması veya Kapatılması", paragraphs: [
        "Ciddi veya tekrarlanan kural ihlali, sahtecilik şüphesi, güvenlik riski veya hukuka aykırı kullanım durumlarında içerik kaldırılabilir, hesap özellikleri sınırlandırılabilir veya gerekli hallerde hesap kapatılabilir."
      ]},
      { title: "12. Platformun Kullanılabilirliği", paragraphs: [
        "TEKNONET Platformun güvenli ve kesintisiz çalışması için makul teknik ve idari tedbirleri alır. Bakım, güncelleme, altyapı arızası veya kontrol dışı olaylar nedeniyle geçici kesintiler meydana gelebilir."
      ]},
      { title: "13. Fikri Mülkiyet", paragraphs: [
        "Platform yazılımı, tasarımı, markası, logosu ve özgün içerikleri üzerindeki haklar ilgili hak sahiplerine aittir. Kullanıcı ve İşletmeler yükledikleri içeriklerin hukuka uygunluğundan ve gerekli kullanım haklarına sahip olmaktan sorumludur."
      ]},
      { title: "14. Kişisel Verilerin Korunması", paragraphs: [
        "Kişisel verilerin işlenmesine ilişkin ayrıntılar KVKK Aydınlatma Metni ve Gizlilik Politikası kapsamında açıklanır. Açık rıza gerektiren ayrı bir işlem bulunması halinde rıza ayrıca alınır."
      ]},
      { title: "15. Ticari Elektronik İletiler", paragraphs: [
        "Hesap, güvenlik, doğrulama ve işlem bildirimleri ile reklam ve pazarlama iletileri birbirinden ayrılır. Pazarlama amacıyla izin gereken iletiler için ilgili mevzuata uygun ayrıca izin süreçleri uygulanır."
      ]},
      { title: "16. Ücretli ve Premium Hizmetler", paragraphs: [
        "Platform gelecekte premium üyelik, öne çıkarma, reklam, görünürlük artırma ve benzeri ücretli hizmetler sunabilir. Ücretli hizmet alınmadan önce kapsam, bedel ve koşullar ayrıca gösterilir; bu metin tek başına ödeme yükümlülüğü doğurmaz."
      ]},
      // NIHV-HUKUK-GUNCELLEME-2026-09-23
      { title: "17. Kullanıcı ile İşletme Arasındaki Hukuki ve Ticari İlişki", paragraphs: [
        "Platform; Kullanıcı ile İşletmenin birbirini bulmasını, teklif ve iletişim süreçlerini kolaylaştıran dijital bir eşleştirme ve aracılık hizmetidir. Aksi açıkça belirtilmedikçe TEKNONET; Kullanıcı ile İşletme arasında kurulabilecek satış, eser, hizmet, vekalet veya benzeri sözleşmenin tarafı, işveren, yüklenici, alt yüklenici, satıcı, sağlayıcı, temsilci, kefil, garantör veya sigortacısı değildir.",
        "İşin kapsamı, fiyatı, kapora veya avans, ödeme zamanı ve yöntemi, fatura veya diğer mali belgeler, malzeme seçimi, teslim, iptal, gecikme, ayıp, garanti, iade, işçilik, zarar ve diğer tüm ticari şartlar Kullanıcı ile İşletme tarafından belirlenir. Platform dışında veya doğrudan taraflar arasında gerçekleştirilen ödeme ve para transferleri TEKNONET tarafından tahsil edilmiş veya güvence altına alınmış sayılmaz.",
        "Kullanıcı; bir İşletmeyle anlaşmadan, ödeme veya kapora yapmadan önce gerekli gördüğü kimlik, yetki, ruhsat, lisans, mesleki yeterlilik, vergi ve iletişim bilgilerini kontrol etmenin kendi sorumluluğunda olduğunu kabul eder. Platformda bir İşletmenin listelenmesi, eşleştirilmesi, doğrulanmış olarak gösterilmesi veya üst sıralarda yer alması, aksi açıkça belirtilmedikçe hizmetin kalitesi, güvenliği, fiyatı, sonucu veya İşletmenin tüm hukuki ve mesleki yeterlilikleri bakımından TEKNONET garantisi anlamına gelmez."
      ]},
      { title: "18. Uyuşmazlıklar, Fiziksel Olaylar ve Tarafların Sorumluluğu", paragraphs: [
        "Kullanıcı ile İşletme arasındaki görüşme, pazarlık, teklif, ödeme, işin yapılması veya yapılmaması, teslim, ayıp, gecikme, iptal, iade ve benzeri uyuşmazlıklar esas olarak ilgili taraflar arasındadır. Taraflar kendi fiil ve ihmallerinden ve kendi aralarındaki sözleşmesel yükümlülüklerinden sorumludur.",
        "Tarafların telefon, mesajlaşma, çevrim içi iletişim, keşif, iş yeri veya konut ziyareti, yüz yüze görüşme ya da hizmetin ifası sırasında gerçekleştirdiği tehdit, hakaret, taciz, fiziksel müdahale, kavga, hırsızlık, mala zarar verme, kişilik hakkı ihlali veya diğer hukuka aykırı fiiller ilgili fiili gerçekleştiren kişi veya kişilerin sorumluluğundadır. TEKNONET bu fiillerin tarafı veya faili değildir.",
        "Bu hükümler TEKNONET'in yürürlükteki emredici mevzuat uyarınca sözleşmeyle kaldırılamayan kendi kusur veya yükümlülüklerinden doğabilecek sorumluluğunu ortadan kaldırmaz."
      ]},
      { title: "19. Hukuka Uygun Kullanım, Yasaklı ve Kısıtlı Faaliyetler", paragraphs: [
        "Kullanıcı; Platformu Türkiye Cumhuriyeti mevzuatına, Türk Ceza Kanunu ve ilgili özel kanunlara, kamu düzenine ve genel ahlaka aykırı bir amaçla kullanmayacağını; suç teşkil eden bir mal, madde, ürün veya hizmeti istemeyeceğini, satın almaya veya temin etmeye yönelik talep oluşturmayacağını kabul, beyan ve taahhüt eder.",
        "Satışı, bulundurulması, temini, aracılığı, reklamı, tanıtımı veya halka arzı yasaklanmış ya da izne, ruhsata, lisansa, reçeteye, yetki belgesine veya başka bir resmi koşula bağlanmış ürün ve hizmetler, ancak yürürlükteki mevzuatın açıkça izin verdiği kapsam ve usulde konu edilebilir. Mevzuatın izin vermediği içerik Platformda yayımlanamaz.",
        "Uyuşturucu veya uyarıcı maddeler, yasa dışı silah veya mühimmat, kaçak veya sahte ürünler, yasa dışı bahis ve kumar, dolandırıcılık, sahtecilik, insan ticareti veya istismarı, müstehcen ve özellikle çocukların cinsel istismarına ilişkin içerikler ile suçtan kaynaklanan malvarlığı değerleri ve yürürlükteki mevzuata göre hukuka aykırı diğer mal, hizmet ve faaliyetler için Platform kullanılamaz.",
        "TEKNONET; hukuka aykırı, yasaklı, kısıtlı veya makul biçimde şüpheli gördüğü talep ve içerikleri otomatik veya manuel incelemeye alma, yayımlamama, kaldırma, hesabı geçici olarak kısıtlama ve gerekli hallerde mevzuat çerçevesinde yetkili mercilerle iş birliği yapma hakkını saklı tutar."
      ]},
      { title: "20. Beyan, Taahhüt ve İhlalin Sonuçları", paragraphs: [
        "Kullanıcı, üyelik oluşturmak ve Platformu kullanmakla bu Sözleşmedeki hukuka uygun kullanım kurallarına uyacağını; verdiği bilgi ve belgelerin doğru olacağını; üçüncü kişilerin haklarını ihlal etmeyeceğini kabul, beyan ve taahhüt eder.",
        "Kullanıcının kendi hukuka aykırı fiili, gerçeğe aykırı beyanı veya Sözleşme ihlali nedeniyle TEKNONET'in idari, adli veya üçüncü kişi talepleriyle karşılaşması halinde tarafların kusuru, illiyet bağı ve yürürlükteki mevzuat çerçevesindeki yasal sorumlulukları saklıdır."
      ]},
      { title: "21. Güncelleme, Hukuk ve İletişim", paragraphs: [
        "Koşullar mevzuat, Platform özellikleri veya ticari model değiştikçe güncellenebilir. Türkiye Cumhuriyeti hukuku uygulanır ve tüketicilerin kanunen yetkili mercilere başvuru hakları saklıdır."
      ]}
    ]
  },
  {
    slug: "isletme-kosullari",
    title: "İşletme ve Hizmet Sağlayıcı Koşulları",
    summary: "İşletme profili, teklif verme, hizmet sorumluluğu, değerlendirmeler ve ücretli hizmetler.",
    sections: [
      { title: "1. Kapsam ve Platformun Rolü", paragraphs: [
        "Neye İhtiyaç Var, Teknonet Yazılım tarafından işletilen dijital eşleştirme ve yönlendirme platformudur. İşletmeler, aksi belirtilmedikçe TEKNONET'in çalışanı, şubesi, acentesi veya temsilcisi değildir."
      ]},
      { title: "2. İşletme Başvurusu ve Bilgilerin Doğruluğu", paragraphs: [
        "İşletme, başvuru ve profil bilgilerinin doğru ve güncel olduğunu kabul eder. Faaliyet için ruhsat, izin, yetki belgesi, diploma, sertifika veya mesleki yeterlilik gerekiyorsa bunların temini ve geçerliliği İşletmenin sorumluluğundadır. Platform gerektiğinde ek bilgi veya belge isteyebilir."
      ]},
      { title: "3. İşletme Profili", paragraphs: [
        "Onaylanan işletmelerin adı, açıklaması, hizmetleri, hizmet bölgeleri, iletişim seçenekleri, görselleri ve değerlendirme bilgileri Platformda gösterilebilir. İşletme bu bilgileri güncel tutmakla sorumludur."
      ]},
      { title: "4. Kullanıcı İhtiyaçları ve Teklifler", paragraphs: [
        "Platform ihtiyaçları kategori, hizmet, konum ve diğer uygunluk kriterleri ile İşletmelerle eşleştirebilir. Teklifler açık, gerçeğe uygun ve yanıltıcı olmayan biçimde hazırlanmalı; zorunlu ek maliyetler gizlenmemelidir."
      ]},
      { title: "5. Kullanıcıyla İletişim ve Kişisel Veriler", paragraphs: [
        "Platform üzerinden elde edilen kullanıcı iletişim bilgileri yalnızca ilgili hizmet süreci ve hukuka uygun amaçlar için kullanılmalıdır. Kullanıcı verileri izinsiz reklam listesine eklenemez, satılamaz veya ilgisiz üçüncü kişilere aktarılamaz."
      ]},
      { title: "6. Hizmetin İfası ve Mali Yükümlülükler", paragraphs: [
        "Hizmetin kalitesi, güvenliği, kullanılan malzemeler, personel, garanti ve satış sonrası yükümlülükler ilgili İşletmeye aittir. İşletme kendi gelirlerinin vergilendirilmesi ve gerekli mali belgelerin düzenlenmesinden sorumludur."
      ]},
      { title: "7. Değerlendirmeler", paragraphs: [
        "Gerçek hizmet deneyimine dayalı kullanıcı değerlendirmeleri yalnızca olumsuz oldukları için kaldırılamaz. Sahte yorum, manipülasyon, hakaret, kişisel veri açıklama veya hukuka aykırı içerik incelemeye alınabilir."
      ]},
      { title: "8. Sıralama, Reklam ve Ücretli Hizmetler", paragraphs: [
        "Görünürlük; uygunluk, konum, profil bilgileri, kullanıcı değerlendirmeleri ve Platformun objektif kriterlerinden etkilenebilir. Platform gelecekte premium paket, öne çıkarma, sponsorlu listeleme, reklam alanı, gelişmiş araç ve istatistik gibi ücretli hizmetler sunabilir.",
        "Ücretli olarak öne çıkarılan içerikler kullanıcı açısından yanıltıcı olmayacak biçimde belirtilir. İşletmenin açıkça satın almadığı ücretli bir hizmet için kendiliğinden ödeme yükümlülüğü oluşturulmaz."
      ]},
      { title: "9. Yasaklanan Davranışlar", paragraphs: [
        "Sahte profil, yanıltıcı belge, gerçekte sunulmayan hizmet, spam, tehdit, taciz, sahte teklif veya yorum, izinsiz veri toplama ve sistem güvenliğini ihlal etme yasaktır."
      ]},
      { title: "10. Askıya Alma ve Kapatma", paragraphs: [
        "Ciddi veya tekrarlanan kural ihlali, sahtecilik, güvenlik riski, hukuka aykırı faaliyet veya kullanıcıların zarar görme riski durumunda profil geçici olarak askıya alınabilir veya gerekli hallerde kapatılabilir."
      ]},
      { title: "11. Fikri Mülkiyet ve İçerikler", paragraphs: [
        "İşletme Platforma yüklediği logo, fotoğraf, marka ve diğer içerikleri kullanmaya yetkili olduğunu kabul eder. İçeriğin mülkiyeti sırf Platforma yüklenmesi nedeniyle TEKNONET'e geçmez."
      ]},
      { title: "12. İşletmenin Bağımsızlığı ve Hizmetten Doğan Sorumluluk", paragraphs: [
        "İşletme; Kullanıcıyla kuracağı hukuki ve ticari ilişkinin bağımsız tarafıdır. Aksi açıkça belirtilmedikçe TEKNONET; İşletmenin çalışanı, işvereni, ortağı, acentesi, temsilcisi, yüklenicisi, alt yüklenicisi, kefili, garantörü veya sigortacısı değildir ve Kullanıcıya sunulan mal veya hizmetin satıcısı ya da sağlayıcısı sıfatını taşımaz.",
        "İşletme; verdiği teklif, fiyat, kapora veya avans, tahsilat, fatura ve diğer mali belgeler, işin kapsamı, malzeme, personel, iş sağlığı ve güvenliği, mesleki yeterlilik, hizmet kalitesi, teslim, gecikme, ayıp, garanti, satış sonrası yükümlülükler, iptal ve iadeler dahil Kullanıcıya karşı üstlendiği yükümlülüklerden kendisinin sorumlu olduğunu kabul eder.",
        "Kullanıcı ile İşletme arasındaki ticari veya kişisel uyuşmazlıklar ile görüşme, keşif veya hizmet ifası sırasında meydana gelebilecek tehdit, hakaret, taciz, fiziksel müdahale, kavga, hırsızlık, mala zarar veya diğer hukuka aykırı fiiller ilgili tarafların ve fiili gerçekleştiren kişilerin sorumluluğundadır. Bu hüküm TEKNONET'in emredici mevzuat uyarınca sözleşmeyle kaldırılamayan kendi sorumluluklarını ortadan kaldırmaz."
      ]},
      { title: "13. Ruhsat, İzin, Mesleki Yeterlilik ve Mevzuata Uygunluk", paragraphs: [
        "İşletme; sunduğu faaliyet için kanunen gerekli her türlü ruhsat, lisans, izin, yetki belgesi, mesleki yeterlilik, oda veya sicil kaydı ve diğer resmi şartları sağlamak ve bunların geçerliliğini korumakla yükümlüdür. TEKNONET'in belge talep etmesi veya bazı belgeleri kontrol etmesi, İşletmenin yasal yükümlülüklerini devraldığı anlamına gelmez.",
        "İşletme; Türkiye Cumhuriyeti mevzuatına, Türk Ceza Kanunu ve ilgili özel kanunlara aykırı hiçbir mal veya hizmeti sunmayacağını; suç teşkil eden faaliyette bulunmayacağını; satışı, bulundurulması, temini, aracılığı, reklamı veya tanıtımı yasaklanmış ya da izne tabi ürün ve hizmetleri mevzuata aykırı biçimde Platformda yayımlamayacağını kabul, beyan ve taahhüt eder.",
        "İşletme; uyuşturucu veya uyarıcı madde, yasa dışı silah veya mühimmat, kaçak veya sahte ürün, yasa dışı bahis veya kumar, dolandırıcılık, sahtecilik, insan ticareti veya istismarı, müstehcen ve özellikle çocukların cinsel istismarına ilişkin içerikler, suçtan kaynaklanan malvarlığı değerleri ve yürürlükteki mevzuata göre hukuka aykırı diğer mal, hizmet veya faaliyetleri teklif etmeyeceğini, tanıtmayacağını, temin etmeyeceğini ve bunlara aracılık etmeyeceğini kabul, beyan ve taahhüt eder.",
        "Reklamı veya tanıtımı kanunla yasaklanan ya da özel kurallara bağlanan mal ve hizmetlerde İşletme ilgili sektörel reklam ve tanıtım mevzuatına uymakla yükümlüdür. Ücretli üyelik veya Platformda bulunma hakkı, hukuka aykırı içerik yayımlama hakkı vermez."
      ]},
      { title: "14. Moderasyon, İhlal Sistemi ve Askıya Alma", paragraphs: [
        "TEKNONET; Platformun güvenliği, mevzuata uyum ve kullanıcıların korunması amacıyla işletme profili, açıklama, teklif, görsel ve diğer içerikleri otomatik veya manuel yöntemlerle inceleyebilir. Şüpheli içerik yönetici incelemesine alınabilir; profil geçici olarak pasife alınabilir veya içerik yayından kaldırılabilir.",
        "Yasaklı veya kısıtlı içerik ve benzeri ciddi sözleşme ihlallerinde İşletmeye moderasyon ihlali kaydedilebilir. Platformun yürürlükteki moderasyon politikasında üç ihlal eşiğinin uygulanması halinde üçüncü ihlale ulaşan İşletmenin profili pasife alınabilir ve hesabı fesih incelemesine alınabilir. TEKNONET, açıkça suç teşkil eden veya Platform ya da üçüncü kişiler açısından ciddi ve yakın risk oluşturan hallerde üç ihlal eşiğini beklemeksizin içeriği kaldırma, hesabı askıya alma veya mevzuatın izin verdiği ölçüde sözleşmeyi haklı nedenle sona erdirme hakkını saklı tutar.",
        "Moderasyon kararı İşletmeye Platform içi bildirim, kayıtlı elektronik iletişim kanalı veya uygun başka bir yöntemle bildirilebilir. İşletme, hatalı olduğunu düşündüğü bir moderasyon kararının yeniden incelenmesini Platformun sunduğu itiraz veya destek kanalları üzerinden talep edebilir."
      ]},
      { title: "15. Haklı Fesih, Ücretli Üyelik ve İade Sonuçları", paragraphs: [
        "İşletmenin yasaklı veya kısıtlı faaliyet, hukuka aykırı içerik, sahte veya yanıltıcı bilgi, güvenlik ihlali ya da bu Sözleşmenin ciddi veya tekrarlanan ihlali nedeniyle hesabının haklı sebeple kapatılması veya sözleşmesinin sona erdirilmesi, İşletmenin kendi sözleşmeye aykırı davranışından kaynaklanan bir yaptırım niteliğindedir.",
        "İşletme, ücretli üyelik veya yıllık paket satın almış olmasının Platform kurallarını ihlal etme ya da profilinin her koşulda yayında tutulmasını isteme hakkı vermediğini kabul eder. Özellikle üç moderasyon ihlaline ulaşılması sonucunda yapılan inceleme ile ihlallerin doğrulanması ve sözleşmenin İşletmenin kusurlu veya sözleşmeye aykırı davranışı nedeniyle haklı sebeple sona erdirilmesi halinde, yürürlükteki emredici mevzuat hükümleri saklı kalmak kaydıyla, kullanılmayan üyelik dönemi veya kalan paket süresi için ücret iadesi, indirim, tazminat, cezai şart veya benzeri ad altında bir bedel talep edilemeyeceğini İşletme kabul, beyan ve taahhüt eder.",
        "Bu hüküm; TEKNONET'in kendi kusurundan, hiç sunulmayan ücretli Platform hizmetinden veya emredici mevzuat gereği iadesi zorunlu bir bedelden doğabilecek hakları ortadan kaldıracak şekilde yorumlanamaz. Herhangi bir iade veya mahsup yükümlülüğünün emredici mevzuattan doğması halinde ilgili mevzuat uygulanır."
      ]},
      { title: "16. İşletmenin Tazmin ve Rücu Sorumluluğu", paragraphs: [
        "İşletmenin hukuka aykırı faaliyeti, gerçeğe aykırı beyanı, gerekli ruhsat veya izinlere sahip olmaması, üçüncü kişilerin haklarını ihlal etmesi, Kullanıcıya karşı yükümlülüklerini ihlal etmesi veya bu Sözleşmeye aykırı davranması nedeniyle TEKNONET'e yöneltilen talep, idari yaptırım, mahkeme veya hakem kararı ya da üçüncü kişi zararı bakımından; İşletmenin kusuru ve fiili ile zarar arasındaki illiyet bağı ölçüsünde TEKNONET'in kanunen İşletmeye rücu edebileceği zarar, gider ve feriler saklıdır.",
        "Bu madde TEKNONET'in kendi kusurundan veya kanunen kendisine ait yükümlülüklerden doğan sorumluluğu İşletmeye aktarmak amacıyla yorumlanamaz."
      ]},
      { title: "17. Kayıtlar, Bildirimler ve Deliller", paragraphs: [
        "Platform üzerinde oluşturulan başvuru, profil, teklif, moderasyon, bildirim, işlem zamanı, güvenlik ve benzeri sistem kayıtları; kişisel verilerin korunması ve ilgili usul hukuku hükümleri saklı kalmak üzere, uyuşmazlıkların araştırılması, Platform güvenliği ve hukuki hakların korunması amacıyla saklanabilir ve kanunen izin verilen ölçüde delil olarak ileri sürülebilir.",
        "İşletme, hesap ve iletişim bilgilerini güncel tutmakla yükümlüdür. Platformda kayıtlı iletişim kanalına gönderilen bildirimlerin ulaştırılabilmesi için gerekli güncellemeleri yapmak İşletmenin sorumluluğundadır."
      ]},
      { title: "18. Güncelleme ve Uygulanacak Hukuk", paragraphs: [
        "Bu koşullar mevzuat, ticari model ve Platform özellikleri değiştikçe güncellenebilir. Türkiye Cumhuriyeti hukuku uygulanır; görevli ve yetkili merciler uyuşmazlığın niteliğine göre ilgili mevzuata göre belirlenir."
      ]}
    ]
  },
  {
    slug: "kvkk-aydinlatma",
    title: "KVKK Aydınlatma Metni",
    summary: "Kişisel verilerin hangi amaçlarla, hangi hukuki sebeplerle işlendiğine ilişkin aydınlatma.",
    sections: [
      { title: "1. Veri Sorumlusu", paragraphs: [
        "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu Teknonet Yazılım'dır. Bu metin neyeihtiyacvar.com ziyaretçileri, kullanıcıları ve işletme hesapları için hazırlanmıştır."
      ]},
      { title: "2. İşlenebilecek Kişisel Veriler", paragraphs: [
        "Kullanımınıza göre ad-soyad, e-posta, telefon, hesap bilgileri, il-ilçe, ihtiyaç ve işlem bilgileri, işletme profil bilgileri, değerlendirmeler, destek/iletişim kayıtları ile güvenlik için gerekli teknik ve oturum kayıtları işlenebilir.",
        "Platformun açıkça talep etmediği sağlık, biyometrik veya benzeri özel nitelikli kişisel verilerin serbest metin alanlarına yazılmaması gerekir."
      ]},
      { title: "3. İşleme Amaçları", paragraphs: [
        "Veriler; üyelik ve hesap yönetimi, doğrulama, ihtiyaç oluşturma, eşleştirme, teklif ve iletişim süreçleri, işletme profillerinin yönetimi, değerlendirme sistemi, destek, güvenlik, kötüye kullanımın önlenmesi, hukuki yükümlülüklerin yerine getirilmesi ve hakların korunması amacıyla işlenebilir."
      ]},
      { title: "4. Toplanma Yöntemi", paragraphs: [
        "Veriler kayıt ve profil formları, ihtiyaç ve teklif ekranları, işletme başvuruları, değerlendirmeler, destek kanalları, oturum ve doğrulama işlemleri ile Platformun kullanımı sırasında oluşan teknik kayıtlar aracılığıyla elektronik ortamda toplanabilir."
      ]},
      { title: "5. Hukuki Sebepler", paragraphs: [
        "İşlemin niteliğine göre sözleşmenin kurulması veya ifası, veri sorumlusunun hukuki yükümlülüğü, bir hakkın tesisi/kullanılması/korunması ve temel haklara zarar vermemek kaydıyla meşru menfaat gibi KVKK'daki uygun işleme şartlarına dayanılır. Açık rıza gereken ayrı bir işlem varsa rıza ayrıca alınır."
      ]},
      { title: "6. Aktarım", paragraphs: [
        "Gerekli olduğu ölçüde ilgili Kullanıcı veya İşletmelere, barındırma, e-posta, güvenlik ve yedekleme gibi teknik hizmet sağlayıcılara, hukuki ve mali hizmet sağlayıcılara ve kanuni yükümlülük halinde yetkili kamu kurumlarına aktarım yapılabilir."
      ]},
      { title: "7. Yurt Dışı Aktarımı", paragraphs: [
        "Kullanılan teknik hizmet sağlayıcının altyapısının yurt dışında bulunması veya aktarım gerektirmesi halinde yürürlükteki KVKK yurt dışı aktarım hükümleri uygulanır. Production altyapısındaki gerçek servisler ve veri akışları ayrıca doğrulanır."
      ]},
      { title: "8. Saklama ve Güvenlik", paragraphs: [
        "Veriler işleme amacının gerektirdiği ve mevzuatın öngördüğü süre boyunca saklanır; amaç ve hukuki gereklilik ortadan kalktığında silinir, yok edilir veya anonimleştirilir. Erişim yetkileri, kimlik doğrulama, güvenli bağlantı, loglama, güncelleme ve yedekleme gibi tedbirler uygulanabilir."
      ]},
      { title: "9. KVKK Kapsamındaki Haklar", paragraphs: [
        "KVKK'nın 11. maddesi kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacını öğrenme, aktarılan üçüncü kişileri bilme, yanlış verilerin düzeltilmesini isteme, şartları varsa silme/yok etme talep etme, otomatik analiz sonucuna itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini isteme haklarına sahipsiniz."
      ]},
      { title: "10. Başvuru Yöntemi", paragraphs: [
        "Taleplerinizi Teknonet Yazılım'ya, Merkez / OSMANİYE adresinden iletebilirsiniz. Elektronik KVKK başvuru kanalı Platformun iletişim alanında ayrıca yayımlanacaktır."
      ]},
      { title: "11. Aydınlatma ve Açık Rızanın Ayrılığı", paragraphs: [
        "Bu metin bilgilendirme amacı taşıyan bir aydınlatma metnidir. Genel bir kişisel veri işleme rızası yerine, açık rıza gerçekten gereken ayrı bir işlem varsa bu işlem özelinde ayrıca rıza alınır."
      ]}
    ]
  },
  {
    slug: "gizlilik",
    title: "Gizlilik Politikası",
    summary: "Platformdaki bilgi güvenliği, veri paylaşımı ve gizlilik yaklaşımımız.",
    sections: [
      { title: "1. Gizlilik Yaklaşımımız", paragraphs: [
        "İhtiyacımız olmayan kişisel veriyi toplamamak, topladığımız veriyi belirli amaçlarla kullanmak, erişimi gerektiği ölçüde sınırlandırmak ve kullanıcı verilerini ticari bir ürün olarak satmamak temel yaklaşımımızdır."
      ]},
      { title: "2. Kullanılabilecek Bilgiler", paragraphs: [
        "Ad-soyad, e-posta, telefon, hesap bilgileri, konum, ihtiyaçlar, hizmet tercihleri, teklifler, işletme bilgileri ve görselleri, değerlendirmeler, işlem kayıtları ve güvenlik için gerekli teknik bilgiler işlenebilir."
      ]},
      { title: "3. Bilgileri Neden Kullanıyoruz?", paragraphs: [
        "Üyelik, doğrulama, ihtiyaç oluşturma, eşleştirme, teklif, kullanıcı-işletme iletişimi, işletme profilleri, değerlendirme sistemi, destek, güvenlik ve kötüye kullanımın önlenmesi için kullanılabilir."
      ]},
      { title: "4. Kullanıcı ile İşletme Arasındaki Paylaşım", paragraphs: [
        "İhtiyaç türü, kategori, konum ve hizmet sürecinin yürütülmesi için gerekli bilgiler uygun işletmelere gösterilebilir. İletişim bilgileri Platformun ilgili özelliğinin çalışma şekline ve hukuki gerekliliklere göre paylaşılır."
      ]},
      { title: "5. Kişisel Verileri Satmıyoruz", paragraphs: [
        "Kullanıcıların kişisel verileri kişisel veri ticareti amacıyla üçüncü kişilere satılmaz. Teknik hizmet sağlayıcılarla veya yetkili mercilerle mevzuata uygun gerekli aktarımlar bu kapsamın dışındadır."
      ]},
      { title: "6. Hesap Güvenliği", paragraphs: [
        "Şifrelerin okunabilir düz metin olarak saklanması hedeflenen sistem mimarisinin parçası değildir. Güvenli kimlik doğrulama, e-posta doğrulama, oturum yönetimi ve gerekli teknik tedbirler kullanılabilir."
      ]},
      { title: "7. İşletme Profilleri ve Yorumlar", paragraphs: [
        "İşletme adı, açıklama, hizmetler, hizmet bölgesi, görseller ve değerlendirme bilgileri kamuya açık profilde gösterilebilir. Kullanıcılar yorumlarda gereksiz kişisel veri veya özel yazışma paylaşmamalıdır."
      ]},
      { title: "8. Teknik Kayıtlar ve Hizmet Sağlayıcıları", paragraphs: [
        "IP, oturum, işlem zamanı, hata ve güvenlik kayıtları Platform güvenliği için işlenebilir. Barındırma, e-posta, güvenlik, yedekleme ve benzeri teknik hizmetlerde üçüncü taraf sağlayıcılardan yararlanılabilir."
      ]},
      { title: "9. Saklama, Silme ve Hesap Kapatma", paragraphs: [
        "Veriler süresiz saklanmak üzere toplanmaz. Hizmet, hukuki yükümlülük, güvenlik ve hakların korunması için gereken süre sonunda ilgili mevzuata uygun biçimde silinir, yok edilir veya anonimleştirilir."
      ]},
      { title: "10. Pazarlama ve Çerezler", paragraphs: [
        "Hizmet bildirimleri ile pazarlama iletileri ayrılır. Pazarlama izni gerekiyorsa ayrıca alınır. Analitik veya reklam amaçlı zorunlu olmayan çerezler kullanılırsa Çerez Politikası ve gerekli tercih mekanizması uygulanır."
      ]},
      { title: "11. Güncelleme", paragraphs: [
        "Platform özellikleri, teknolojiler veya mevzuat değiştikçe bu politika güncellenebilir. Güncel sürüm neyeihtiyacvar.com üzerinde yayımlanır."
      ]}
    ]
  },
  {
    slug: "cerez-politikasi",
    title: "Çerez Politikası",
    summary: "Çerezler ve tarayıcı depolama teknolojilerinin kullanım esasları.",
    sections: [
      { title: "1. Çerez Nedir?", paragraphs: [
        "Çerezler bir internet sitesi ziyaret edildiğinde tarayıcı veya cihazda saklanabilen küçük veri dosyalarıdır. Benzer amaçlarla localStorage ve benzeri tarayıcı depolama teknolojileri de kullanılabilir."
      ]},
      { title: "2. Kullanım Amaçları", paragraphs: [
        "Oturumun güvenli biçimde sürdürülmesi, kimlik doğrulama, temel Platform fonksiyonlarının çalışması, güvenlik ve gerekli teknik tercihlerin hatırlanması amacıyla çerez veya benzeri teknolojiler kullanılabilir."
      ]},
      { title: "3. Zorunlu Çerezler ve Teknik Depolama", paragraphs: [
        "Platformun temel özellikleri için teknik olarak gerekli çerezler veya tarayıcı depolama kayıtları kullanılabilir. Bunların engellenmesi oturum, hesap güvenliği veya bazı temel özelliklerin çalışmamasına neden olabilir."
      ]},
      { title: "4. Analitik ve Reklam Çerezleri", paragraphs: [
        "Mevcut politika Google Analytics, Meta Pixel veya benzeri reklam/davranışsal takip teknolojilerinin kullanıldığını varsaymaz. İleride zorunlu olmayan analitik veya reklam teknolojileri kullanılırsa gerekli bilgilendirme yapılır ve mevzuat gerektiriyorsa kullanıcı tercihi alınır."
      ]},
      { title: "5. Birinci ve Üçüncü Taraf Teknolojiler", paragraphs: [
        "Birinci taraf teknolojiler doğrudan neyeihtiyacvar.com tarafından, üçüncü taraf teknolojiler ise Platformda kullanılan başka hizmet sağlayıcılarca oluşturulabilir. Production ortamındaki gerçek servisler teknik olarak doğrulanarak nihai çerez envanteri güncellenir."
      ]},
      { title: "6. Çerez Envanteri", paragraphs: [
        "Production sürümünde kullanılan gerçek çerez ve depolama kayıtları; ad, sağlayıcı, amaç, tür, saklama süresi ve hukuki dayanak bilgileriyle envanter halinde tutulacaktır. Kullanılmayan tahmini çerez isimleri bu politikaya eklenmez."
      ]},
      { title: "7. Tercihlerin Yönetilmesi", paragraphs: [
        "Kullanıcılar tarayıcı ayarlarından çerezleri görüntüleyebilir, silebilir veya engelleyebilir. Açık rıza gerektiren zorunlu olmayan çerezler kullanılmaya başlanırsa Platform üzerinden kabul, ret ve tercihleri değiştirme imkanı sağlanır."
      ]},
      { title: "8. Çerez Banner Yaklaşımı", paragraphs: [
        "Yalnızca teknik olarak gerekli ve açık rıza gerektirmeyen teknolojiler kullanılıyorsa sırf alışılmış olduğu için yanıltıcı bir tüm çerezleri kabul ekranı gösterilmez. Rıza gerektiren çerezler kullanılırsa uygun tercih paneli oluşturulur."
      ]},
      { title: "9. KVKK ve Yurt Dışı Aktarım", paragraphs: [
        "Çerezler aracılığıyla elde edilen bilgiler kişisel veri niteliğindeyse KVKK uygulanır. Üçüncü taraf teknoloji yurt dışına veri aktarımına neden oluyorsa ilgili aktarım ayrıca değerlendirilir."
      ]},
      { title: "10. Güncelleme", paragraphs: [
        "Teknik altyapı veya kullanılan teknolojiler değiştikçe Çerez Politikası ve çerez envanteri güncellenir."
      ]}
    ]
  }
];

export function getLegalDocument(slug: string) {
  return legalDocuments.find((document) => document.slug === slug);
}