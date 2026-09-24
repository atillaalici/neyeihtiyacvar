import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { notFound } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";

type LiveCatalogCategory = {
  id: string;
  slug: string;
  name: string;
  services: string[];
};

type PublicProvider = {
  id: string;
  slug: string;
  businessName: string;
  categorySlug: string;
  serviceSlug: string;
};

type CategoryPresentation = {
  image: string;
  description: string;
};

const presentation: Record<string, CategoryPresentation> = {
  "usta-tamir": {
    image: "/vitrin/usta-tamir.png",
    description: "Ev ve iş yerindeki tamir, bakım ve usta ihtiyaçların için doğru hizmeti seç.",
  },
  "ev-yasam": {
    image: "/vitrin/ev-yasam.png",
    description: "Evini daha konforlu ve düzenli hale getirecek hizmetleri keşfet.",
  },
  otomotiv: {
    image: "/vitrin/otomotiv.png",
    description: "Aracın için bakım, tamir ve teknik servis hizmetlerini keşfet.",
  },
  "nakliye-ve-hafriyat": {
    image: "/vitrin/nakliye-hafriyat-v2.png",
    description: "Nakliye, taşıma ve hafriyat ihtiyaçların için uygun hizmeti bul.",
  },
  "teknoloji-yazilim": {
    image: "/vitrin/teknoloji.png",
    description: "Teknoloji, bilgisayar, telefon ve yazılım ihtiyaçların için doğru hizmeti bul.",
  },
  organizasyon: {
    image: "/vitrin/organizasyon.png",
    description: "Özel günlerin ve etkinliklerin için ihtiyaç duyduğun hizmetleri bul.",
  },
  egitim: {
    image: "/vitrin/egitim.png",
    description: "Eğitim, özel ders ve gelişim ihtiyaçların için doğru hizmeti bul.",
  },
  "saglik-bakim": {
    image: "/vitrin/saglik-bakim.png",
    description: "Sağlık ve bakım alanındaki hizmetleri tek noktadan keşfet.",
  },
  "guzellik-kisisel-bakim": {
    image: "/vitrin/guzellik-kisisel-bakim.png",
    description: "Güzellik ve kişisel bakım ihtiyaçların için uygun hizmetleri keşfet.",
  },
  "yeme-icme": {
    image: "/vitrin/yeme-icme.png",
    description: "Yeme, içme ve hazır yemek ihtiyaçların için işletmeleri keşfet.",
  },
  "alisveris-magazalar": {
    image: "/vitrin/alisveris-magazalar.png",
    description: "Aradığın ürün ve mağazaları ihtiyaçlarına göre keşfet.",
  },
  emlak: {
    image: "/vitrin/emlak.png",
    description: "Konut, arsa, tarla ve ticari gayrimenkul ihtiyaçların için doğru hizmeti bul.",
  },
  "insaat-yapi": {
    image: "/vitrin/insaat-yapi.png",
    description: "İnşaat, yapı ve proje ihtiyaçların için uygun hizmetleri keşfet.",
  },
  "tarim-hayvancilik": {
    image: "/vitrin/tarim-hayvancilik.png",
    description: "Tarım ve hayvancılık alanındaki ürün, ekipman ve hizmetleri keşfet.",
  },
  "turizm-konaklama": {
    image: "/vitrin/turizm-konaklama.png",
    description: "Konaklama, seyahat ve turizm ihtiyaçların için seçenekleri keşfet.",
  },
  "profesyonel-hizmetler": {
    image: "/vitrin/profesyonel-hizmetler.png",
    description: "İşletmen veya kişisel ihtiyaçların için profesyonel hizmetleri keşfet.",
  },
  "spor-fitness": {
    image: "/vitrin/spor-fitness.png",
    description: "Spor, fitness ve aktif yaşam ihtiyaçların için doğru hizmeti bul.",
  },
  digerleri: {
    image: "/vitrin/diger.png",
    description: "Aradığın hizmet listede yoksa ihtiyacını kendi cümlenle yaz.",
  },
};

function toServiceSlug(value: string) {
  const normalized = value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const aliases: Record<string, string> = {
    "hafriyat-isleri": "hafriyat",
  };

  return aliases[normalized] ?? normalized;
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categoryPresentation = presentation[slug];

  if (!categoryPresentation) {
    notFound();
  }

  let category: LiveCatalogCategory | null = null;
  let providers: PublicProvider[] = [];

  try {
    const [categoryResponse, providerResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" }),
      fetch(
        `${apiBaseUrl}/api/providers?kategori=${encodeURIComponent(slug)}`,
        { cache: "no-store" },
      ),
    ]);

    if (categoryResponse.ok) {
      const catalog = (await categoryResponse.json()) as LiveCatalogCategory[];
      category = catalog.find((item) => item.slug === slug) ?? null;
    }

    if (providerResponse.ok) {
      providers = (await providerResponse.json()) as PublicProvider[];
    }
  } catch {
    // Backend ulasilamazsa asagida kullaniciya uygun durum mesaji gosterilir.
  }

  if (!category) {
    return (
      <SiteLayout>
        <main className="section-shell py-10 sm:py-14 lg:py-16">
          <Link
            href="/kategoriler"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Tüm kategoriler
          </Link>

          <section className="mt-5 rounded-[28px] border border-orange-100 bg-orange-50/50 p-6 sm:p-8">
            <h1 className="font-display text-2xl font-bold">Kategori bilgisi yüklenemedi</h1>
            <p className="mt-2 text-muted-foreground">
              Backend çalışmıyor olabilir. Backend&apos;i başlatıp sayfayı yenile.
            </p>
          </section>
        </main>
      </SiteLayout>
    );
  }

  const providerCountByService = new Map<string, number>();

  for (const provider of providers) {
    providerCountByService.set(
      provider.serviceSlug,
      (providerCountByService.get(provider.serviceSlug) ?? 0) + 1,
    );
  }

  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14 lg:py-16">
        <Link
          href="/kategoriler"
          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Tüm kategoriler
        </Link>

        <section className="mt-5 overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex items-center justify-center bg-orange-50/40 p-4 sm:p-5 lg:p-6">
              <div className="relative w-full max-w-[420px] overflow-hidden rounded-[22px] border border-orange-100 bg-white shadow-sm">
                <div className="relative aspect-[1.14/1] w-full">
                  <Image
                    src={categoryPresentation.image}
                    alt={category.name}
                    fill
                    priority
                    sizes="(max-width: 1023px) 90vw, 420px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center bg-gradient-to-br from-orange-50/80 to-white p-6 sm:p-8 lg:p-10">
              <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-orange-700">
                Kategori
              </span>

              <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                {category.name}
              </h1>

              <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
                {categoryPresentation.description}
              </p>
            </div>
          </div>
        </section>

        {category.services.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Bu kategoride ne arıyorsun?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Alt kategoriyi seç; ilgili işletmeleri Keşfet ekranında listeleyelim.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {category.services.map((serviceName) => {
                const serviceSlug = toServiceSlug(serviceName);
                const providerCount =
                  providerCountByService.get(serviceSlug) ?? 0;

                return (
                  <Link
                    key={serviceName}
                    href={`/kesfet?kategori=${encodeURIComponent(slug)}&hizmet=${encodeURIComponent(serviceSlug)}`}
                    className="group flex min-h-24 items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {serviceName}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-primary">
                        {providerCount} uygun işletme
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Uygun işletmeleri gör
                      </p>
                    </div>

                    <span
                      className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"
                      aria-hidden="true"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-[26px] border border-orange-100 bg-orange-50/50 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              İhtiyacını bize anlat
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Aradığın hizmet hazır listelerde yoksa neye ihtiyacın olduğunu kendi cümlenle yaz.
            </p>
            <Link
              href="/ihtiyac-olustur"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              <Search className="h-4 w-4" />
              İhtiyacını Yaz
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </main>
    </SiteLayout>
  );
}