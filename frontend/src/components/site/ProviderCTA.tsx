"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Crown, Sparkles, Check } from "lucide-react";
import { apiBaseUrl } from "@/lib/api";

type Plan = {
  id: string;
  code: string;
  annualPrice: number;
  monthlyEquivalent: number;
  serviceLimit: number;
  isRecommended: boolean;
};

const defaults: Plan[] = [
  { id: "kobi", code: "kobi", annualPrice: 1200, monthlyEquivalent: 100, serviceLimit: 2, isRecommended: false },
  { id: "avantaj", code: "avantaj", annualPrice: 2400, monthlyEquivalent: 200, serviceLimit: 5, isRecommended: true },
  { id: "profesyonel", code: "profesyonel", annualPrice: 5000, monthlyEquivalent: 416.67, serviceLimit: 12, isRecommended: false },
];

const names: Record<string, string> = {
  kobi: "KOBİ Paket",
  avantaj: "Avantaj Paket",
  profesyonel: "Profesyonel Paket",
};

const regularPrices: Record<string, number> = {
  kobi: 2400,
  avantaj: 5000,
  profesyonel: 12000,
};

const formatMoney = (n: number) => n.toLocaleString("tr-TR", {
  maximumFractionDigits: 0,
});

export function ProviderCTA() {
  const [plans, setPlans] = useState<Plan[]>(defaults);

  useEffect(() => {
    let active = true;
    fetch(`${apiBaseUrl}/api/membership-plans`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Paketler yüklenemedi");
        return res.json();
      })
      .then((data: Plan[]) => {
        if (active && Array.isArray(data) && data.length) {
          setPlans(data);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const ordered = ["kobi", "avantaj", "profesyonel"]
    .map((code) => plans.find((p) => p.code === code))
    .filter((p): p is Plan => Boolean(p));

  return (
    <section className="home-cta section-shell py-6 sm:py-8 lg:py-10">
      <div className="rounded-2xl border border-primary/25 bg-accent px-4 py-10 sm:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            İşini büyütmek ister misin?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            İşletmeni dijital dünyada tanıt, hizmetlerini sergile
            ve bölgende seni arayan müşterilere ulaş.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-5">
          {ordered.map((plan) => {
            const professional = plan.code === "profesyonel";
            const recommended = plan.code === "avantaj";
            const kobi = plan.code === "kobi";

            return (
              <article
                key={plan.code}
                className={[
                  "relative flex h-full min-w-0 flex-col self-stretch rounded-[18px] border bg-card p-2.5 shadow-sm transition-all duration-300 sm:rounded-[22px] sm:p-4 xl:p-5",

                  professional
                    ? "col-span-2 w-full md:col-span-1"
                    : "",
                  recommended
                    ? "border-orange-400 ring-2 ring-orange-200/70"
                    : "border-border",
                ].join(" ")}
              >
                {recommended && (
                  <span className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-1 text-[9px] font-bold text-white sm:text-xs">
                    ÖNERİLEN
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <div className={[
                    "grid size-11 shrink-0 place-items-center rounded-xl sm:size-14",
                    recommended
                      ? "bg-orange-100 text-orange-600"
                      : professional
                        ? "bg-violet-100 text-violet-700"
                        : "bg-sky-100 text-sky-700",
                  ].join(" ")}>
                    {recommended ? <Crown /> : professional ? <Sparkles /> : <Building2 />}
                  </div>
                  <h3 className="font-display text-base font-extrabold sm:text-xl">
                    {names[plan.code]}
                  </h3>
                </div>

                <div className={[
                  "mt-5 rounded-xl border p-3",
                  recommended
                    ? "border-orange-200 bg-orange-50/60"
                    : professional
                      ? "border-violet-200 bg-violet-50/60"
                      : "border-sky-200 bg-sky-50/60",
                ].join(" ")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      Birinci Yıla Özel
                    </span>
                    <span className="text-sm font-bold text-slate-600 line-through sm:text-lg">
                      {formatMoney(regularPrices[plan.code])} TL
                    </span>
                  </div>
                  <div className={[
                    "mt-2 text-2xl font-black sm:text-3xl",
                    recommended ? "text-orange-600" : professional ? "text-violet-700" : "text-sky-700",
                  ].join(" ")}>
                    {formatMoney(plan.annualPrice)} TL
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    KDV dahil / yıl
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aylık yaklaşık {formatMoney(plan.monthlyEquivalent)} TL
                  </p>
                </div>

                <div className="mt-3 rounded-xl bg-muted/50 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Hizmet kapasitesi
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    {plan.serviceLimit} kategori
                  </p>
                </div>

                <div className="mt-4 flex-1 space-y-3">
                  {[
                    "Dijital vitrin",
                    "İşletme paneline tam erişim",
                    "12 aylık platform üyeliği",
                  ].map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-xs sm:text-sm">
                      <Check className="size-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/kayit?hesap=isletme&paket=${plan.code}`}
                  className={[
                    "mt-6 flex h-11 items-center justify-center rounded-xl px-2 text-center text-xs font-bold transition sm:text-sm",
                    recommended
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : kobi
                        ? "border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-violet-600 text-white hover:bg-violet-700",
                  ].join(" ")}
                >
                  Kayıt Ol / Satın Al
                </Link>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-muted-foreground">
          Tüm paketler satın alma tarihinden itibaren 12 ay geçerlidir.
          Otomatik yenileme ve otomatik kart tahsilatı yapılmaz.
          Süre sonunda işletmeler üyeliklerini yeniden satın alarak yenileyebilir.
        </p>

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
