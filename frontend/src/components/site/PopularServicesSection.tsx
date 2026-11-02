"use client";

import { useEffect, useMemo, useState } from "react";
import { LivePlatformStats } from "./LivePlatformStats";
import Image from "next/image";
import Link from "next/link";
import { Building2, MapPin, ShieldCheck, Users } from "lucide-react";

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

export function PopularServicesSection() {
  const [categoryCounts, setCategoryCounts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategoryCounts() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5155"}/api/categories/tree`,
          {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as CategoryCount[];

        if (controller.signal.aborted) return;

        setCategoryCounts(
          Object.fromEntries(
            data.map((item) => [
              item.slug,
              item.providerCount ?? 0,
            ]),
          ),
        );
      } catch {
        // API kullanilamiyorsa mevcut alfabetik sira korunur.
      }
    }

    void loadCategoryCounts();

    return () => controller.abort();
  }, []);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const slugA = a.href.split("/").pop() ?? "";
        const slugB = b.href.split("/").pop() ?? "";

        return (
          (categoryCounts[slugB] ?? 0) -
            (categoryCounts[slugA] ?? 0) ||
          a.title.localeCompare(b.title, "tr")
        );
      }),
    [categoryCounts],
  );

  return (
    <section className="section-shell py-7 sm:py-6 lg:py-9">
      <div className="rounded-[28px] border border-orange-100 bg-gradient-to-b from-orange-50/70 to-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700 sm:text-xs">
              Vitrin
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Sık Aranan Hizmetler
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
              En çok ihtiyaç duyulan hizmetleri keşfet, sana uygun olanı seç.
            </p>
          </div>

          <Link
            href="/hizmetler"
            className="text-xs font-semibold text-orange-700 transition hover:text-orange-800 sm:text-sm"
          >
            Tüm hizmetleri keşfet →
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          {sortedCategories.slice(0, 8).map((category) => (
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


      </div>
      <div className="mt-6 grid overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm [&>*]:min-w-0 home-stats-grid grid-cols-2 sm:grid-cols-4">
        <div className="flex items-center gap-3 p-4 sm:p-5 lg:border-r lg:border-orange-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 whitespace-nowrap text-base font-extrabold sm:text-lg">
              <LivePlatformStats type="users" />
              <span>Kullanıcı</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-l border-orange-100 p-4 sm:p-5 lg:border-r">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 whitespace-nowrap text-base font-extrabold sm:text-lg">
              <LivePlatformStats type="providers" />
              <span>İşletme</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-orange-100 p-4 sm:p-5 lg:border-r lg:border-t-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-extrabold sm:text-xl">Güvenli ve Şeffaf</p>
            <p className="text-xs text-muted-foreground sm:text-sm">Doğrulanmış süreç</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-l border-t border-orange-100 p-4 sm:p-5 lg:border-t-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-extrabold sm:text-2xl">81 İl</p>
            <p className="text-xs text-muted-foreground sm:text-sm">Türkiye genelinde</p>
          </div>
        </div>
      </div>
    </section>
  );
}
