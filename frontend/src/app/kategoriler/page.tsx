import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { HeroSearch } from "@/components/site/HeroSearch";
import { serverApiBaseUrl } from "@/lib/seo";

const categories = [
  {
    "title": "Alışveriş, Mağazalar ve Perakende",
    "image": "/kategori-gorselleri/alisveris-magazalar-ve-perakende.png",
    "href": "/kategoriler/alisveris-magazalar-ve-perakende"
  },
  {
    "title": "Bahçe, Peyzaj ve Dış Mekân",
    "image": "/kategori-gorselleri/bahce-peyzaj-ve-dis-mekan.png",
    "href": "/kategoriler/bahce-peyzaj-ve-dis-mekan"
  },
  {
    "title": "Eğitim, Kurs ve Özel Ders",
    "image": "/kategori-gorselleri/egitim-kurs-ve-ozel-ders.png",
    "href": "/kategoriler/egitim-kurs-ve-ozel-ders"
  },
  {
    "title": "Elektrik, Enerji ve Aydınlatma",
    "image": "/kategori-gorselleri/elektrik-enerji-ve-aydinlatma.png",
    "href": "/kategoriler/elektrik-enerji-ve-aydinlatma"
  },
  {
    "title": "Emlak, Gayrimenkul ve Konaklama",
    "image": "/kategori-gorselleri/emlak-gayrimenkul-ve-konaklama.png",
    "href": "/kategoriler/emlak-gayrimenkul-ve-konaklama"
  },
  {
    "title": "Güzellik, Kişisel Bakım ve Spor",
    "image": "/kategori-gorselleri/guzellik-kisisel-bakim-ve-spor.png",
    "href": "/kategoriler/guzellik-kisisel-bakim-ve-spor"
  },
  {
    "title": "Mobilya, Marangozluk ve Dekorasyon",
    "image": "/kategori-gorselleri/mobilya-marangozluk-ve-dekorasyon.png",
    "href": "/kategoriler/mobilya-marangozluk-ve-dekorasyon"
  },
  {
    "title": "Nakliyat, Lojistik ve Kurye",
    "image": "/kategori-gorselleri/nakliyat-lojistik-ve-kurye.png",
    "href": "/kategoriler/nakliyat-lojistik-ve-kurye"
  },
  {
    "title": "Organizasyon, Etkinlik ve Eğlence",
    "image": "/kategori-gorselleri/organizasyon-etkinlik-ve-eglence.png",
    "href": "/kategoriler/organizasyon-etkinlik-ve-eglence"
  },
  {
    "title": "Otomotiv ve Araç Hizmetleri",
    "image": "/kategori-gorselleri/otomotiv-ve-arac-hizmetleri.png",
    "href": "/kategoriler/otomotiv-ve-arac-hizmetleri"
  },
  {
    "title": "Profesyonel ve Kurumsal Hizmetler",
    "image": "/kategori-gorselleri/profesyonel-ve-kurumsal-hizmetler.png",
    "href": "/kategoriler/profesyonel-ve-kurumsal-hizmetler"
  },
  {
    "title": "Sağlık, Bakım ve Danışmanlık",
    "image": "/kategori-gorselleri/saglik-bakim-ve-danismanlik.png",
    "href": "/kategoriler/saglik-bakim-ve-danismanlik"
  },
  {
    "title": "Sanayi, Üretim ve Makine Hizmetleri",
    "image": "/kategori-gorselleri/sanayi-uretim-ve-makine-hizmetleri.png",
    "href": "/kategoriler/sanayi-uretim-ve-makine-hizmetleri"
  },
  {
    "title": "Tadilat, İnşaat ve Yapı",
    "image": "/kategori-gorselleri/tadilat-insaat-ve-yapi.png",
    "href": "/kategoriler/tadilat-insaat-ve-yapi"
  },
  {
    "title": "Tarım, Hayvancılık ve Evcil Hayvanlar",
    "image": "/kategori-gorselleri/tarim-hayvancilik-ve-evcil-hayvanlar.png",
    "href": "/kategoriler/tarim-hayvancilik-ve-evcil-hayvanlar"
  },
  {
    "title": "Teknik Servis, Bakım ve Onarım",
    "image": "/kategori-gorselleri/teknik-servis-bakim-ve-onarim.png",
    "href": "/kategoriler/teknik-servis-bakim-ve-onarim"
  },
  {
    "title": "Teknoloji, Yazılım ve Dijital Hizmetler",
    "image": "/kategori-gorselleri/teknoloji-yazilim-ve-dijital-hizmetler.png",
    "href": "/kategoriler/teknoloji-yazilim-ve-dijital-hizmetler"
  },
  {
    "title": "Temizlik, Hijyen ve İlaçlama",
    "image": "/kategori-gorselleri/temizlik-hijyen-ve-ilaclama.png",
    "href": "/kategoriler/temizlik-hijyen-ve-ilaclama"
  },
  {
    "title": "Tesisat, Isıtma, Soğutma ve İklimlendirme",
    "image": "/kategori-gorselleri/tesisat-isitma-sogutma-ve-iklimlendirme.png",
    "href": "/kategoriler/tesisat-isitma-sogutma-ve-iklimlendirme"
  },
  {
    "title": "Yeme, İçme ve Gıda",
    "image": "/kategori-gorselleri/yeme-icme-ve-gida.png",
    "href": "/kategoriler/yeme-icme-ve-gida"
  }
];

type CategoryCount = {
  slug: string;
  providerCount: number;
};

export default async function CategoriesPage() {
  let categoryCounts: Record<string, number> = {};

  try {
    const response = await fetch(
      `${serverApiBaseUrl}/api/categories/tree`,
      { cache: "no-store" },
    );

    if (response.ok) {
      const data = (await response.json()) as CategoryCount[];

      categoryCounts = Object.fromEntries(
        data.map((item) => [item.slug, item.providerCount ?? 0]),
      );
    }
  } catch {
    // API erisilemezse alfabetik siralama kullanilir.
  }

  const sortedCategories = [...categories].sort((a, b) => {
    const slugA = a.href.split("/").pop() ?? "";
    const slugB = b.href.split("/").pop() ?? "";

    return (
      (categoryCounts[slugB] ?? 0) -
        (categoryCounts[slugA] ?? 0) ||
      a.title.localeCompare(b.title, "tr")
    );
  });

  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14 lg:py-16">
        <section className="rounded-[28px] border border-orange-100 bg-gradient-to-b from-orange-50/70 to-white p-5 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
            Kategoriler
          </span>

          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Kategoriler
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Farklı alanlardaki hizmetleri incele, ihtiyacına en uygun olanı seç.
          </p>

          <div className="relative z-20 mt-6 max-w-[760px]">
            <HeroSearch searchOnly />
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-orange-100 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Tüm Hizmetler
              </h2>
            </div>

            <Link
              href="/hizmetler"
              className="text-xs font-semibold text-orange-700 transition hover:text-orange-800 sm:text-sm"
            >
              Tüm hizmetleri keşfet →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
            {sortedCategories.map((category) => (
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