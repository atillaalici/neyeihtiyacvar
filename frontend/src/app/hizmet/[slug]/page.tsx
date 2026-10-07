import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin, Store } from "lucide-react";
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
  citySlug?: string | null;
  districtSlug?: string | null;
};

type ServiceMatch = {
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
};

type Props = {
  params: Promise<{ slug: string }>;
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
  service: ServiceMatch,
): Promise<PublicProvider[]> {
  try {
    const response = await fetch(
      `${serverApiBaseUrl}/api/providers?kategori=${encodeURIComponent(
        service.categorySlug,
      )}`,
      {
        next: { revalidate: 900 },
      },
    );

    if (!response.ok) return [];

    const providers = (await response.json()) as PublicProvider[];

    return providers.filter((provider) => {
      const serviceSlugs = new Set([
        provider.serviceSlug,
        ...(provider.additionalServices ?? []),
      ]);

      return serviceSlugs.has(service.slug);
    });
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service) {
    return {
      title: "Hizmet Bulunamadı",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonical = `/hizmet/${service.slug}`;
  const title = `${service.name} Hizmeti`;
  const description =
    `${service.name} hizmeti veren işletmeleri keşfet. ` +
    `${service.categoryName} kategorisindeki uygun işletmeleri incele ve iletişime geç.`;

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
      title: `${service.name} | Neye İhtiyaç Var`,
      description,
    },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service) {
    notFound();
  }

  const providers = await getProviders(service);

  const serviceCities = Array.from(
    new Set(
      providers
        .map((provider) => provider.citySlug)
        .filter((citySlug): citySlug is string => Boolean(citySlug)),
    ),
  ).sort((a, b) =>
    slugToTitle(a).localeCompare(slugToTitle(b), "tr"),
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
        name: "Hizmetler",
        item: `${siteUrl}/hizmetler`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: service.categoryName,
        item: `${siteUrl}/kategoriler/${service.categorySlug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: service.name,
        item: `${siteUrl}/hizmet/${service.slug}`,
      },
    ],
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: service.name,
    url: `${siteUrl}/hizmet/${service.slug}`,
    areaServed: {
      "@type": "Country",
      name: "Türkiye",
    },
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

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(serviceJsonLd),
          }}
        />

        <nav
          aria-label="İçerik yolu"
          className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-primary">
            Ana Sayfa
          </Link>
          <span>/</span>
          <Link href="/hizmetler" className="hover:text-primary">
            Hizmetler
          </Link>
          <span>/</span>
          <Link
            href={`/kategoriler/${service.categorySlug}`}
            className="hover:text-primary"
          >
            {service.categoryName}
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">
            {service.name}
          </span>
        </nav>

        <section className="mt-6 rounded-[28px] border border-orange-100 bg-gradient-to-b from-orange-50/70 to-white p-6 shadow-sm sm:p-8 lg:p-10">
          <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-orange-700">
            {service.categoryName}
          </span>

          <h1 className="mt-4 max-w-4xl font-display text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {service.name}
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            {service.name} hizmetine mi ihtiyacın var? Neye İhtiyaç Var
            üzerinden bu hizmeti sunan işletmeleri inceleyebilir, bulunduğun
            bölgeye göre uygun hizmet verenlere ulaşabilirsin.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/kesfet?kategori=${encodeURIComponent(
                service.categorySlug,
              )}&hizmet=${encodeURIComponent(service.slug)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              Uygun işletmeleri bul
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href={`/kategoriler/${service.categorySlug}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-bold text-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              {service.categoryName}
            </Link>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                {service.name} hizmeti veren işletmeler
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Şu anda bu hizmetle eşleşen {providers.length} işletme bulunuyor.
              </p>
            </div>
          </div>

          {providers.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {providers.map((provider) => {
                const location = [
                  provider.districtSlug
                    ? slugToTitle(provider.districtSlug)
                    : null,
                  provider.citySlug
                    ? slugToTitle(provider.citySlug)
                    : null,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
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

                        {location ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {location}
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
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-6">
              <h3 className="font-bold text-slate-950">
                Bu hizmette henüz listelenen işletme bulunmuyor.
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Keşfet ekranından konumuna göre arama yapabilir veya ihtiyacını
                kendi cümlenle yazabilirsin.
              </p>
            </div>
          )}
        </section>

        {serviceCities.length > 0 ? (
          <section className="mt-10 rounded-[24px] border border-border bg-card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              Şehirlere göre {service.name}
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Bu hizmeti sunan işletmelerin bulunduğu şehirleri inceleyebilirsin.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {serviceCities.map((citySlug) => (
                <Link
                  key={citySlug}
                  href={`/${citySlug}/${service.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition hover:border-orange-200 hover:text-primary"
                >
                  <MapPin className="h-4 w-4" />
                  {slugToTitle(citySlug)} {service.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10 rounded-[24px] border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold">
            {service.name} nasıl bulunur?
          </h2>

          <p className="mt-3 max-w-4xl leading-7 text-muted-foreground">
            İhtiyacını ve bulunduğun konumu belirterek {service.name} hizmeti
            sunan işletmeleri karşılaştırabilirsin. İşletme profillerindeki
            hizmet, iletişim ve diğer bilgileri inceleyerek sana uygun
            işletmeye doğrudan ulaşabilirsin.
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
