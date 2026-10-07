import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  safeJsonLd,
  serverApiBaseUrl,
  siteUrl,
  slugToTitle,
} from "@/lib/seo";

type ProviderSeo = {
  slug: string;
  businessName: string;
  shortDescription?: string | null;
  description?: string | null;
  categorySlug?: string | null;
  serviceSlug?: string | null;
  additionalServices?: string[];
  citySlug?: string | null;
  districtSlug?: string | null;
  publicPhone?: string | null;
  publicAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

async function getProvider(slug: string) {
  try {
    const response = await fetch(
      `${serverApiBaseUrl}/api/providers/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 900 },
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ProviderSeo;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProvider(slug);

  if (!provider) {
    return {
      title: "İşletme Bulunamadı",
    };
  }

  const businessName = provider.businessName;
  const serviceName = provider.serviceSlug
    ? slugToTitle(provider.serviceSlug)
    : "Hizmet";
  const location = [provider?.districtSlug, provider?.citySlug]
    .filter(Boolean)
    .map((item) => slugToTitle(item!))
    .join(", ");

  const description = `${businessName}${location ? `, ${location} konumunda` : ""} ${serviceName} hizmeti sunan işletmedir. Hizmet bilgilerini ve işletme profilini Neye İhtiyaç Var'da incele.`;

  const canonical = `/isletme/${slug}`;

  return {
    title: `${businessName} | ${serviceName}`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${businessName} | Neye İhtiyaç Var`,
      description,
      url: `${siteUrl}${canonical}`,
      type: "website",
      images: [
        {
          url: "/brand/neyeihtiyacvar-og.png",
          width: 1200,
          height: 630,
          alt: "Neye İhtiyaç Var - İhtiyacını Yaz, Doğru Hizmeti Bul",
        },
      ],
    },
  };
}

export default async function ProviderSlugLayout({
  children,
  params,
}: Props) {
  const { slug } = await params;
  const provider = await getProvider(slug);

  if (!provider) {
    notFound();
  }

  const serviceName = provider.serviceSlug
    ? slugToTitle(provider.serviceSlug)
    : "Hizmet";

  const location = [provider.districtSlug, provider.citySlug]
    .filter(Boolean)
    .map((item) => slugToTitle(item!))
    .join(", ");

  const seoDescription = `${provider.businessName}${location ? `, ${location} konumunda` : ""} ${serviceName} hizmeti sunan işletmedir. Hizmet bilgilerini ve işletme profilini Neye İhtiyaç Var'da incele.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: provider.businessName,
    url: `${siteUrl}/isletme/${slug}`,
    description: seoDescription,
    telephone: provider.publicPhone || undefined,
    address: provider.publicAddress
      ? {
          "@type": "PostalAddress",
          streetAddress: provider.publicAddress,
          addressLocality: provider.districtSlug
            ? slugToTitle(provider.districtSlug)
            : undefined,
          addressRegion: provider.citySlug
            ? slugToTitle(provider.citySlug)
            : undefined,
          addressCountry: "TR",
        }
      : undefined,
    geo:
      provider.latitude != null && provider.longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude: provider.latitude,
            longitude: provider.longitude,
          }
        : undefined,
    knowsAbout: [
      provider.serviceSlug,
      ...(provider.additionalServices ?? []),
    ]
      .filter(Boolean)
      .map((service) => slugToTitle(service!)),
  };

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
        name: serviceName,
        item:
          provider.citySlug && provider.serviceSlug
            ? `${siteUrl}/${provider.citySlug}/${provider.serviceSlug}`
            : provider.serviceSlug
              ? `${siteUrl}/hizmet/${provider.serviceSlug}`
              : `${siteUrl}/hizmetler`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: provider.businessName,
        item: `${siteUrl}/isletme/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(jsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(breadcrumbJsonLd),
        }}
      />
      {children}
    </>
  );
}