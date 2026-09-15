import type { Metadata } from "next";

import {
  serverApiBaseUrl,
  siteUrl,
  slugToTitle,
} from "@/lib/seo";

type CategoryItem = {
  slug: string;
  name: string;
  services: string[];
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

async function getCategory(slug: string) {
  try {
    const response = await fetch(`${serverApiBaseUrl}/api/categories/`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    const categories = (await response.json()) as CategoryItem[];
    return categories.find((item) => item.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  const name = category?.name ?? slugToTitle(slug);
  const description = category
    ? `${name} kategorisindeki ${category.services.slice(0, 5).join(", ")} ve benzeri hizmetleri incele, ihtiyacına uygun işletmeleri bul.`
    : `${name} hizmetlerini ve uygun işletmeleri Neye İhtiyaç Var'da keşfet.`;

  const canonical = `/kategoriler/${slug}`;

  return {
    title: `${name} Hizmetleri`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${name} Hizmetleri | Neye İhtiyaç Var`,
      description,
      url: `${siteUrl}${canonical}`,
      type: "website",
    },
  };
}

export default function CategorySlugLayout({ children }: Props) {
  return children;
}