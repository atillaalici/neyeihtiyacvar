import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { notFound } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { safeJsonLd, serverApiBaseUrl, siteUrl } from "@/lib/seo";

type LiveCatalogCategory = {
  id: string;
  slug: string;
  name: string;
  services: {
    id: string;
    name: string;
    works: { id: string; name: string }[];
  }[];
};

type PublicProvider = {
  id: string;
  slug: string;
  businessName: string;
  categorySlug: string;
  serviceSlug: string;
  additionalServices: string[];
};

type CategoryPresentation = {
  image: string;
  description: string;
};

function getCategoryPresentation(slug: string): CategoryPresentation {
  return {
    image: `/kategori-gorselleri/${slug}.png`,
    description: "Bu kategoriye ait alt kategorileri inceleyerek aradığın hizmete ulaş.",
  };
}

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
  const categoryPresentation = getCategoryPresentation(slug);

  let category: LiveCatalogCategory | null = null;
  let providers: PublicProvider[] = [];

  try {
    const [categoryResponse, providerResponse] = await Promise.all([
      fetch(`${serverApiBaseUrl}/api/categories/tree`, { cache: "no-store" }),
      fetch(
        `${serverApiBaseUrl}/api/providers?kategori=${encodeURIComponent(slug)}`,
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

  const providerCounts = new Map<string, number>();

  await Promise.all(
    category.services.map(async (service) => {
      try {
        const response = await fetch(
          `${serverApiBaseUrl}/api/providers?categoryServiceId=${service.id}`,
          { cache: "no-store" },
        );
        if (response.ok) {
          const matches = (await response.json()) as PublicProvider[];
          providerCounts.set(
            service.id,
            new Set(matches.map((provider) => provider.id)).size,
          );
        }
      } catch {
        // İşletme servisine erişilemiyorsa sayı sıfır kalır.
      }
    }),
  );

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Kategoriler",
        item: `${siteUrl}/kategoriler`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `${siteUrl}/kategoriler/${category.slug}`,
      },
    ],
  };

  const serviceListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} hizmetleri`,
    numberOfItems: category.services.length,
    itemListElement: category.services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: service.name,
      url: `${siteUrl}/alt-kategori/${service.id}`,
    })),
  };

  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14 lg:py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(breadcrumbJsonLd),
          }}
        />

        {category.services.length > 0 ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLd(serviceListJsonLd),
            }}
          />
        ) : null}
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
              Alt Kategoriler
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              İhtiyacına uygun alt kategoriyi seçerek hizmetleri incele.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[...category.services]
                .sort((a, b) =>
                  (providerCounts.get(b.id) ?? 0) -
                    (providerCounts.get(a.id) ?? 0) ||
                  a.name.localeCompare(b.name, "tr")
                )
                .map((service) => {
                const providerCount = providerCounts.get(service.id) ?? 0;

                return (
                  <Link
                    key={service.id}
                    href={`/alt-kategori/${service.id}`}
                    className="group flex min-h-24 items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {service.name}
                      </h3>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {providerCount} işletme
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