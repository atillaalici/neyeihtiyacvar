import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Store } from "lucide-react";
import { notFound } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { safeJsonLd, serverApiBaseUrl, siteUrl } from "@/lib/seo";

type CatalogCategory = {
  slug: string;
  name: string;
  services: string[];
};

type PublicProvider = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription?: string | null;
  categorySlug: string;
  serviceSlug: string;
  additionalServices?: string[];
  citySlug: string;
  districtSlug: string;
};

type ServiceMatch = {
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
};

type Props = {
  params: Promise<{
    il: string;
    hizmet: string;
  }>;
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

function slugToTitle(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1),
    )
    .join(" ");
}

async function getCatalog(): Promise<CatalogCategory[]> {
  try {
    const response = await fetch(`${serverApiBaseUrl}/api/categories`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    return (await response.json()) as CatalogCategory[];
  } catch {
    return [];
  }
}

async function getService(slug: string): Promise<ServiceMatch | null> {
  const catalog = await getCatalog();

  for (const category of catalog) {
    for (const serviceName of category.services ?? []) {
      const serviceSlug = toServiceSlug(serviceName);

      if (serviceSlug === slug) {
        return {
          name: serviceName,
          slug: serviceSlug,
          categorySlug: category.slug,
          categoryName: category.name,
        };
      }
    }
  }

  return null;
}

async function getProviders(
  citySlug: string,
  serviceSlug: string,
): Promise<PublicProvider[]> {
  try {
    const params = new URLSearchParams({
      il: citySlug,
      hizmet: serviceSlug,
    });

    const response = await fetch(
      `${serverApiBaseUrl}/api/providers?${params.toString()}`,
      {
        next: { revalidate: 900 },
      },
    );

    if (!response.ok) return [];

    return (await response.json()) as PublicProvider[];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { il, hizmet } = await params;

  const service = await getService(hizmet);

  if (!service) {
    return {
      title: "Hizmet Bulunamadı",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const providers = await getProviders(il, service.slug);
  const cityName = slugToTitle(il);

  if (providers.length === 0) {
    return {
      title: `${cityName} ${service.name}`,
      description:
        `${cityName} bölgesinde ${service.name} hizmeti veren işletmeleri ` +
        "Neye İhtiyaç Var üzerinden keşfet.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const canonical = `/${il}/${service.slug}`;
  const title = `${cityName} ${service.name}`;
  const description =
    `${cityName} ${service.name} hizmeti veren işletmeleri keşfet. ` +
    `${providers.length} uygun işletmeyi incele ve doğrudan iletişime geç.`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      images: [
        {
          url: "/brand/neyeihtiyacvar-og.png",
          width: 1200,
          height: 630,
          alt: "Neye İhtiyaç Var - İhtiyacını Yaz, Doğru Hizmeti Bul",
        },
      ],
      url: `${siteUrl}${canonical}`,
      title: `${title} | Neye İhtiyaç Var`,
      description,
    },
  };
}

export default async function LocalServicePage({ params }: Props) {
  const { il, hizmet } = await params;

  const service = await getService(hizmet);

  if (!service) {
    notFound();
  }

  const providers = await getProviders(il, service.slug);
  const cityName = slugToTitle(il);

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
        name: service.name,
        item: `${siteUrl}/hizmet/${service.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${cityName} ${service.name}`,
        item: `${siteUrl}/${il}/${service.slug}`,
      },
    ],
  };

  const itemListJsonLd =
    providers.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${cityName} ${service.name} hizmeti veren işletmeler`,
          numberOfItems: providers.length,
          itemListElement: providers.map((provider, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: provider.businessName,
            url: `${siteUrl}/isletme/${provider.slug}`,
          })),
        }
      : null;

  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14 lg:py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(breadcrumbJsonLd),
          }}
        />

        {itemListJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLd(itemListJsonLd),
            }}
          />
        ) : null}

        <nav
          aria-label="İçerik yolu"
          className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-primary">
            Ana Sayfa
          </Link>
          <span>/</span>
          <Link
            href={`/hizmet/${service.slug}`}
            className="hover:text-primary"
          >
            {service.name}
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">
            {cityName}
          </span>
        </nav>

        <section className="mt-6 rounded-[28px] border border-orange-100 bg-gradient-to-b from-orange-50/70 to-white p-6 shadow-sm sm:p-8 lg:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-orange-700">
            <MapPin className="h-3.5 w-3.5" />
            {cityName}
          </span>

          <h1 className="mt-4 max-w-4xl font-display text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {cityName} {service.name}
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            {cityName} bölgesinde {service.name} hizmetine ihtiyacın varsa
            yayınlanan işletmeleri inceleyebilir, işletme profillerinden
            hizmet bilgilerine ulaşabilir ve sana uygun işletmeyi
            seçebilirsin.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/kesfet?${new URLSearchParams({
                il,
                kategori: service.categorySlug,
                hizmet: service.slug,
              }).toString()}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              {cityName} işletmelerini keşfet
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href={`/hizmet/${service.slug}`}
              className="inline-flex items-center rounded-xl border border-border bg-white px-5 py-3 text-sm font-bold text-foreground transition hover:bg-muted"
            >
              Tüm {service.name} işletmeleri
            </Link>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
            {cityName} {service.name} hizmeti veren işletmeler
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {providers.length > 0
              ? `${cityName} bölgesinde bu hizmetle eşleşen ${providers.length} işletme bulunuyor.`
              : `${cityName} bölgesinde bu hizmet için henüz yayında işletme bulunmuyor.`}
          </p>

          {providers.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {providers.map((provider) => (
                <article
                  key={provider.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Store className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold">
                        <Link
                          href={`/isletme/${provider.slug}`}
                          className="hover:text-primary"
                        >
                          {provider.businessName}
                        </Link>
                      </h3>

                      {provider.districtSlug ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {slugToTitle(provider.districtSlug)}, {cityName}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {provider.shortDescription ? (
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {provider.shortDescription}
                    </p>
                  ) : null}

                  <Link
                    href={`/isletme/${provider.slug}`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary"
                  >
                    İşletmeyi incele
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-6">
              <h3 className="font-bold text-slate-950">
                Henüz yayınlanan işletme bulunmuyor.
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Keşfet ekranından farklı bir konum seçebilir veya ihtiyacını
                kendi cümlenle arayabilirsin.
              </p>
            </div>
          )}
        </section>

        <section className="mt-10 rounded-[24px] border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold">
            {cityName}&apos;de {service.name} nasıl bulunur?
          </h2>

          <p className="mt-3 max-w-4xl leading-7 text-muted-foreground">
            Neye İhtiyaç Var üzerinden {cityName} bölgesinde {service.name}
            hizmeti sunan işletmeleri inceleyebilirsin. İşletmelerin hizmet
            bilgilerini ve dijital vitrinlerini karşılaştırarak ihtiyacına
            uygun işletmeye ulaşabilirsin.
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
