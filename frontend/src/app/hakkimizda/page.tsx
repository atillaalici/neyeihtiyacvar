import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  MapPinned,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";

const principles = [
  {
    icon: Search,
    title: "İhtiyacı Anla",
    description:
      "Kullanıcının ne aradığını sade biçimde anlayıp doğru hizmet kategorisine yönlendiren bir deneyim.",
  },
  {
    icon: Users,
    title: "Doğru İşletmeyle Buluştur",
    description:
      "Konum, hizmet ve gerçek kullanıcı deneyimleriyle ihtiyaca uygun işletmeleri görünür hale getiren yapı.",
  },
  {
    icon: ShieldCheck,
    title: "Güveni Koruyarak Büyü",
    description:
      "Şeffaf işletme profilleri, gerçek değerlendirmeler ve kullanıcı güvenini merkeze alan yaklaşım.",
  },
];

const values = [
  "Doğru bilgi ve şeffaf iletişim",
  "Gerçek ihtiyaç ile doğru işletmenin eşleşmesi",
  "Yerel işletmelerin dijitalde güçlenmesi",
  "Kullanıcı verilerinin ve güvenliğinin korunması",
  "Sade, hızlı ve erişilebilir kullanıcı deneyimi",
  "Türkiye genelinde ölçeklenebilir teknoloji altyapısı",
];

export default function AboutPage() {
  return (
    <SiteLayout>
      <main>
      <section className="border-b border-orange-100 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_36%),linear-gradient(to_bottom,#fffaf5,#ffffff)]">
        <div className="section-shell py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-600 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Neye İhtiyaç Var?
            </div>

            <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              İhtiyacın varsa, doğru adresi bulmanın bir yolu olmalı.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              Neye İhtiyaç Var; insanların günlük hayatta ihtiyaç duydukları ürün,
              hizmet ve işletmelere daha kolay ulaşmasını sağlamak amacıyla
              geliştirilen yeni nesil ihtiyaç ve işletme bulma platformudur.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/kesfet"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
              >
                İhtiyacını Bul
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/isletme-ekle"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:border-orange-300 hover:bg-orange-50"
              >
                İşletmeni Ekle
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
              Hikâyemiz
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              “Bildiğin iyi bir yer var mı?” sorusundan doğdu.
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
              <p>
                Bir elektrikçiye, bilgisayar servisine, nakliyeciye, ustaya,
                teknik servise veya herhangi bir alanda hizmet veren güvenilir
                bir işletmeye ihtiyaç duyduğumuzda çoğu zaman ilk yaptığımız şey
                çevremize sormaktır.
              </p>
              <p>
                Neye İhtiyaç Var fikri tam olarak bu ihtiyaçtan doğdu. Amacımız,
                insanların ihtiyaçlarını doğru şekilde anlayan ve onları bu
                ihtiyacı karşılayabilecek uygun işletmelerle buluşturan güvenilir,
                kolay ve güçlü bir dijital köprü oluşturmaktır.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-600 text-white">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-orange-600">
                  Temel yaklaşım
                </p>
                <h3 className="mt-1 font-display text-2xl font-black text-slate-950">
                  İhtiyacını anlat, doğru işletmeyi bul.
                </h3>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600">
              Neye İhtiyaç Var klasik bir işletme rehberi olmanın ötesinde
              tasarlanmıştır. Kullanıcı uzun işletme listeleri arasında kaybolmak
              yerine ihtiyacını anlatır; sistem doğru hizmeti ve uygun işletmeleri
              bulmaya yardımcı olur.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/70">
        <div className="section-shell py-14 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
                Nasıl düşünüyoruz?
              </p>
              <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Teknolojiyi gerçek ihtiyaçların çözümü için kullanıyoruz.
              </h2>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {principles.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-black text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="font-display text-2xl font-black text-slate-950">
                İşletmeler için yeni müşterilere ulaşmanın yeni yolu
              </h2>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600">
              Neye İhtiyaç Var yalnızca ihtiyaç sahipleri için değil; esnaf,
              ustalar, teknik servisler, profesyoneller ve farklı sektörlerde
              faaliyet gösteren işletmeler için de geliştirilmektedir.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Hedefimiz işletmelerin sadece internette bulunmasını değil, gerçekten
              sundukları hizmete ihtiyaç duyan insanlarla buluşmasını sağlamaktır.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <h2 className="font-display text-2xl font-black text-slate-950">
                Güven bizim için bir özellik değil, temel ilkedir.
              </h2>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600">
              Doğru bilgi, gerçek işletmeler, şeffaf değerlendirmeler, kişisel
              verilerin korunması ve kullanıcı güvenliği Neye İhtiyaç Var&apos;ın
              temel prensipleri arasındadır.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Platformu geliştirirken yalnızca teknolojiye değil; güven,
              şeffaflık, kullanıcı deneyimi ve sürdürülebilirliğe de önem veriyoruz.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-orange-100 bg-orange-50/50">
        <div className="section-shell py-14 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-3xl border border-orange-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <MapPinned className="h-6 w-6 text-orange-600" />
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-600">
                  Osmaniye&apos;den Türkiye&apos;ye
                </p>
              </div>
              <h2 className="mt-4 font-display text-3xl font-black tracking-tight text-slate-950">
                Yerelde doğdu, Türkiye için tasarlanıyor.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Neye İhtiyaç Var, Osmaniye&apos;de doğan bir teknoloji girişimidir.
                Hedefimiz bulunduğumuz şehirle sınırlı kalmadan Türkiye&apos;nin farklı
                şehirlerindeki kullanıcı ve işletmeleri aynı sistem altında
                buluşturmaktır.
              </p>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
                Vizyonumuz
              </p>
              <h3 className="mt-3 font-display text-2xl font-black text-slate-950">
                İnsanların bir ürüne, hizmete veya işletmeye ihtiyaç duyduklarında
                ilk akıllarına gelen dijital adreslerden biri olmak.
              </h3>

              <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
                Misyonumuz
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                İhtiyaç sahipleri ile doğru işletmeleri teknoloji aracılığıyla
                hızlı, kolay, güvenilir ve şeffaf biçimde buluşturmak; yerel
                işletmelerin dijital dünyada büyümelerine katkı sağlamak.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-14 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
                Değerlerimiz
              </p>
              <h2 className="mt-3 font-display text-3xl font-black text-slate-950">
                Büyürken koruyacağımız ilkeler
              </h2>

              <div className="mt-6 grid gap-3">
                {values.map((value) => (
                  <div
                    key={value}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-600">
                      ✓
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-7 text-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
                Teknolojinin arkasında gerçek bir işletme var.
              </p>
              <h2 className="mt-4 font-display text-3xl font-black">
                Teknonet Yazılım
              </h2>

              <p className="mt-5 text-sm leading-7 text-slate-300">
                Neye İhtiyaç Var, bağımsız ve sahipsiz bir internet projesi
                değildir. Platform Teknonet Yazılım
                tarafından geliştirilmekte ve işletilmektedir.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                Teknoloji, yazılım, bilgisayar ve teknik hizmetler alanındaki
                tecrübemizi; insanların gerçek hayattaki ihtiyaçlarını çözebilecek
                yeni nesil bir dijital platform oluşturmak için kullanıyoruz.
              </p>

              <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300">
                <strong className="text-white">Merkez:</strong>
                <br />
                Ahmet Yesevi Mahallesi, 16723 Sokak No:10
                <br />
                Merkez / Osmaniye
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="section-shell py-12">
          <div className="mx-auto max-w-5xl rounded-3xl border border-orange-200 bg-white p-7 text-center shadow-sm sm:p-9">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
              Marka sözümüz
            </p>
            <h2 className="mt-3 font-display text-3xl font-black text-slate-950 sm:text-4xl">
              Aradığın her şey burada.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Sen ihtiyacını söyle. Doğru ihtiyacı birlikte bulalım.
            </p>
          </div>
        </div>
      </section>
    </main>
    </SiteLayout>
  );
}
