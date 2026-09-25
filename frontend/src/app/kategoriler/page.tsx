import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";

const categories = [
  { title: "Usta & Tamir", image: "/vitrin/usta-tamir.png", href: "/kategoriler/usta-tamir" },
  { title: "Ev & Yaşam", image: "/vitrin/ev-yasam.png", href: "/kategoriler/ev-yasam" },
  { title: "Nakliye & Hafriyat", image: "/vitrin/nakliye-hafriyat-v2.png", href: "/kategoriler/nakliye-ve-hafriyat" },
  { title: "Teknoloji & Yazılım", image: "/vitrin/teknoloji.png", href: "/kategoriler/teknoloji-yazilim" },
  { title: "Otomotiv", image: "/vitrin/otomotiv.png", href: "/kategoriler/otomotiv" },
  { title: "Eğitim", image: "/vitrin/egitim.png", href: "/kategoriler/egitim" },
  { title: "Organizasyon", image: "/vitrin/organizasyon.png", href: "/kategoriler/organizasyon" },
  { title: "Sağlık & Bakım", image: "/vitrin/saglik-bakim.png", href: "/kategoriler/saglik-bakim" },
  { title: "Güzellik & Kişisel Bakım", image: "/vitrin/guzellik-kisisel-bakim.png", href: "/kategoriler/guzellik-kisisel-bakim" },
  { title: "Yeme & İçme", image: "/vitrin/yeme-icme.png", href: "/kategoriler/yeme-icme" },
  { title: "Alışveriş & Mağazalar", image: "/vitrin/alisveris-magazalar.png", href: "/kategoriler/alisveris-magazalar" },
  { title: "Emlak", image: "/vitrin/emlak.png", href: "/kategoriler/emlak" },
  { title: "İnşaat & Yapı", image: "/vitrin/insaat-yapi.png", href: "/kategoriler/insaat-yapi" },
  { title: "Tarım & Hayvancılık", image: "/vitrin/tarim-hayvancilik.png", href: "/kategoriler/tarim-hayvancilik" },
  { title: "Turizm & Konaklama", image: "/vitrin/turizm-konaklama.png", href: "/kategoriler/turizm-konaklama" },
  { title: "Profesyonel Hizmetler", image: "/vitrin/profesyonel-hizmetler.png", href: "/kategoriler/profesyonel-hizmetler" },
  { title: "Spor & Fitness", image: "/vitrin/spor-fitness.png", href: "/kategoriler/spor-fitness" },
  { title: "Diğer Hizmetler", image: "/vitrin/diger.png", href: "/kategoriler/digerleri" },
];

export default function CategoriesPage() {
  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14 lg:py-16">
        <section className="rounded-[28px] border border-orange-100 bg-gradient-to-b from-orange-50/70 to-white p-5 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
            Kategoriler
          </span>

          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Sık Aranan Hizmetler
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            En Çok ihtiyaÇ duyulan hizmetleri hızlıca keŞfet. AradıĞın hizmet burada yoksa ihtiyacını kendi cÜmlenle yaz.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/kesfet"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              <Search className="h-4 w-4" />
              Keşfet
            </Link>

            <Link
              href="/ihtiyac-olustur"
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-orange-700 transition hover:bg-orange-50"
            >
              İhtiyacını Yaz
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-orange-100 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                En Çok Arananlar
              </h2>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Ana sayfadaki vitrin gÖrÜnÜmÜyle aynı dÜzen.
              </p>
            </div>

            <Link
              href="/hizmetler"
              className="text-xs font-semibold text-orange-700 transition hover:text-orange-800 sm:text-sm"
            >
              TÜm hizmetleri keŞfet →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
            {categories.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="group block overflow-hidden rounded-[22px] border border-orange-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[1.16/1] w-full overflow-hidden bg-orange-50 p-1">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, 25vw"
                    className="object-contain transition duration-300 group-hover:scale-[1.01]"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}