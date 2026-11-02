"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { apiBaseUrl } from "@/lib/api";

type CampaignAvailability = {
  available: boolean;
  remaining: number;
};

export function ProviderCTA() {
  const [campaignVisible, setCampaignVisible] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCampaign() {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/promotions/first500/availability`,
          { cache: "no-store" },
        );

        if (!response.ok) return;

        const data =
          (await response.json()) as CampaignAvailability;

        if (active) {
          setCampaignVisible(
            data.available === true && data.remaining > 0,
          );
        }
      } catch {
        // Kampanya durumu doğrulanamazsa reklam gösterilmez.
      }
    }

    void loadCampaign();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="home-cta section-shell py-6 sm:py-8 lg:py-10">
      <div className="rounded-2xl border border-primary/25 bg-accent px-4 py-10 sm:px-8">
        {campaignVisible && (
          <Link
            href="/kayit?hesap=isletme&paket=kobi"
            aria-label="İlk 500 işletmeye ücretsiz KOBİ üyeliği kampanyasına katıl"
            className="block overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500"
          >
            <picture>
              <source
                media="(max-width: 639px)"
                srcSet="/kampanya/kampanya-ilk500-mobil-v2.webp"
              />
              <img
                src="/kampanya/kampanya-ilk500-masaustu-v2.webp"
                alt="İlk 500 işletmeye özel ücretsiz KOBİ üyeliği kampanyası"
                className="block h-auto w-full"
                loading="lazy"
              />
            </picture>
          </Link>
        )}

        <div className="mx-auto mt-10 max-w-5xl rounded-xl border border-primary/25 bg-card p-6 sm:p-8">

          <h3 className="font-display text-2xl font-bold">
            Platformumuzun Sunduğu Hizmetler
          </h3>

          <h4 className="mt-6 text-xl font-bold">
            İşletmenizin Dijital Dünyadaki Güçlü Adresi
          </h4>

          <div className="mt-4 space-y-4 leading-7 text-muted-foreground">
            <p>
              Neye İhtiyaç Var, işletmelerin dijital dünyadaki görünürlüğünü
              artırmak, sundukları hizmetleri ihtiyaç sahipleriyle buluşturmak
              ve müşterileriyle doğrudan iletişim kurmalarını sağlamak amacıyla
              geliştirilmiş, yıllık üyelik esasına dayalı bir dijital hizmet
              ve işletme keşif platformudur.
            </p>
            <p>
              Platformumuz; profesyonel dijital vitrin, hizmet ve kategori
              yönetimi, konum bazlı keşfedilme, müşteri iletişim kanalları
              ve işletme yönetim panelini bir arada sunan bütünleşik bir
              dijital altyapı sağlar.
            </p>
            <p>
              Amacımız, işletmelerin güçlü bir dijital kimlik oluşturmasına
              katkı sağlamak ve ihtiyaç sahipleriyle doğrudan bağlantı
              kurabilecekleri erişilebilir, güvenilir ve sürdürülebilir
              bir dijital ortam sunmaktır.
            </p>
          </div>

          <h4 className="mt-8 border-b border-border pb-3 text-lg font-bold">
            İşletmelere Neler Sunuyoruz?
          </h4>

          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["Profesyonel Dijital Vitrin",
               "İşletme profili, faaliyet alanları, hizmetler ve kurumsal tanıtım."],
              ["Kategori ve Hizmet Yönetimi",
               "Satın alınan paket kapsamında hizmet ve kategori tanımlama."],
              ["Konum Bazlı Keşfedilme",
               "İlgili bölgelerde ve hizmet aramalarında keşfedilme imkânı."],
              ["Doğrudan Müşteri İletişimi",
               "Telefon, WhatsApp ve platform içi mesajlaşma."],
              ["İşletme Yönetim Paneli",
               "İşletme bilgilerini ve dijital vitrini tek merkezden yönetme."],
              ["12 Aylık Dijital Üyelik",
               "Fiyatı, kapsamı ve hizmet kapasitesi önceden belirlenmiş üyelik."]
            ].map(([title, description]) => (
              <li key={title} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-emerald-600" />
                  <div>
                    <h5 className="font-semibold">{title}</h5>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-muted-foreground">
            Sunulan özellikler ve kullanım hakları, tercih edilen üyelik
            paketinin kapsamına göre belirlenir.
          </p>

          <details className="group mt-6 rounded-xl border border-border bg-background p-4">
  <summary className="cursor-pointer list-item font-bold text-foreground">
    Şeffaf ve Doğrudan Hizmet Modelimiz
  </summary>
<div className="mt-4 space-y-4 leading-7 text-muted-foreground">
            <p>
              Neye İhtiyaç Var, işletmelere belirli bir süre ve kapsam
              dahilinde dijital vitrin, işletme tanıtımı ve platform
              kullanım hizmeti sunar.
            </p>
            <p>
              Gelir modelimiz, işletmelerin kendi tercihleriyle satın
              aldıkları yıllık dijital üyelik paketlerine dayanır.
            </p>
            <p>
              Üyelik paketleri satın alma tarihinden itibaren 12 ay
              geçerlidir. Otomatik yenileme veya kayıtlı kartlardan
              otomatik tahsilat yapılmaz. İşletmeler süre sonunda
              dilerlerse yeniden paket satın alabilir.
            </p>
            <p>
              İşletmelerden teklif başına ücret veya müşterileriyle
              gerçekleştirdikleri ticari işlemler üzerinden satış
              komisyonu alınmaz.
            </p>
          </div>
</details>

          <details className="group mt-6 rounded-xl border border-border bg-background p-4">
  <summary className="cursor-pointer list-item font-bold text-foreground">
    Platformun Rolü ve Ticari İşlemlerin Sınırları
  </summary>
<div className="mt-4 space-y-4 leading-7 text-muted-foreground">
            <p>
              Neye İhtiyaç Var, kullanıcılar ile işletmeler arasında
              gerçekleşen ürün veya hizmet satışlarında ödeme ve
              tahsilat aracısı olarak faaliyet göstermez.
            </p>
            <p>
              Platformumuz, işletmelerin müşterilerine sunduğu ürün
              veya hizmetlerin doğrudan satıcısı, sağlayıcısı ya da
              ticari sözleşmenin tarafı değildir. Bu işlemlerin
              bedellerini kendi adına veya taraflar adına tahsil etmez.
            </p>
            <p>
              Fiyat teklifleri, hizmet kapsamı, teslim veya uygulama
              koşulları, ödeme yöntemleri ve karşılıklı ticari
              anlaşmalar doğrudan ilgili taraflarca belirlenir.
            </p>
            <p>
              Platformumuz, taraflar arasındaki anlaşmaların ticari
              şartlarını belirlemez, fiyatlandırmaya müdahale etmez,
              ödeme koşullarını düzenlemez ve taraflar adına ticari
              kararlar almaz.
            </p>
            <p>
              Ürün veya hizmetin sunulması, işin gerçekleştirilmesi
              ve ilgili ticari ödemeler taraflar arasındaki hukuki
              ve ticari ilişki kapsamında yürütülür. Platformun
              kendi hizmetlerine ve yürürlükteki mevzuata ilişkin
              yükümlülükleri saklıdır.
            </p>
          </div>
</details>

          <details className="group mt-6 rounded-xl border border-border bg-background p-4">
  <summary className="cursor-pointer list-item font-bold text-foreground">
    Üyelik Ödemelerinin Kapsamı
  </summary>
<div className="mt-4 space-y-4 leading-7 text-muted-foreground">
            <p>
              Neye İhtiyaç Var üzerinden gerçekleştirilen ücretli
              işlemler yalnızca işletmelerin satın aldığı 12 aylık
              dijital üyelik ve platform hizmetlerine ilişkindir.
            </p>
            <p>
              Tahsil edilen bedeller; tercih edilen paket kapsamında
              dijital vitrin oluşturulması, işletme profilinin
              yönetilmesi, hizmetlerin tanıtılması ve platform
              özelliklerinden yararlanılması karşılığında alınır.
            </p>
            <p className="font-semibold text-foreground">
              Neye İhtiyaç Var&apos;ın ticari modeli, işletmelere dijital
              hizmet sunulmasına dayanır; kullanıcılar ile işletmeler
              arasındaki ürün ve hizmet satışlarının ödeme süreçlerinin
              yürütülmesine değil.
            </p>
            <p>
              Platformumuz, şeffaf fiyatlandırma, açık üyelik koşulları
              ve doğrudan iletişim ilkeleri doğrultusunda faaliyet gösterir.
            </p>
          </div>
</details>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-5 text-sm">
          <Link href="/uyelik" className="font-medium hover:underline">Paketleri Karşılaştır</Link>
          <Link href="/nasil-calisir" className="font-medium hover:underline">Nasıl Çalışır?</Link>
          <Link href="/sozlesmeler" className="font-medium hover:underline">Sözleşmeler ve Yasal Bilgiler</Link>
        </div>
      </div>
    </section>
  );
}
