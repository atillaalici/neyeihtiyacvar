import type { Metadata } from "next";

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
  citySlug?: string | null;
  districtSlug?: string | null;
  publicPhone?: string | null;
  publicAddress?: string | null;
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

  const businessName = provider?.businessName ?? slugToTitle(slug);
  const serviceName = provider?.serviceSlug
    ? slugToTitle(provider.serviceSlug)
    : "Hizmet";
  const location = [provider?.districtSlug, provider?.citySlug]
    .filter(Boolean)
    .map((item) => slugToTitle(item!))
    .join(", ");

  const description =
    provider?.shortDescription ||
    provider?.description ||
    `${businessName} - ${serviceName}${location ? `, ${location}` : ""}. İletişim ve hizmet bilgilerini Neye İhtiyaç Var'da incele.`;

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
    return children;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: provider.businessName,
    url: `${siteUrl}/isletme/${slug}`,
    description:
      provider.shortDescription ||
      provider.description ||
      undefined,
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(jsonLd),
        }}
      />
      {children}
    </>
  );
}