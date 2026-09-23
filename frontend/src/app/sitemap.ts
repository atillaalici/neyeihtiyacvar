import type { MetadataRoute } from "next";

import { serverApiBaseUrl } from "@/lib/seo";

const baseUrl = "https://neyeihtiyacvar.com";

type CategoryItem = { slug?: string | null };
type ProviderItem = { slug?: string | null };

type ListEnvelope<T> =
  | T[]
  | { items?: T[]; data?: T[]; results?: T[] };

function listFrom<T>(value: ListEnvelope<T> | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.results)) return value.results;
  return [];
}

async function fetchList<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${serverApiBaseUrl}${path}`, {
      next: { revalidate: 900 },
    });
    if (!response.ok) return [];
    return listFrom((await response.json()) as ListEnvelope<T>);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/kesfet`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/hizmetler`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/kategoriler`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/nasil-calisir`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/hakkimizda`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/isletme-ekle`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/sozlesmeler`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const [categories, providers] = await Promise.all([
    fetchList<CategoryItem>("/api/categories/"),
    fetchList<ProviderItem>("/api/providers"),
  ]);

  const categoryPages: MetadataRoute.Sitemap = categories
    .map((item) => item.slug?.trim())
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => ({
      url: `${baseUrl}/kategoriler/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

  // /api/providers public endpoint'i yalnızca yayındaki/aktif işletmeleri döndürür.
  // API erişilemezse sitemap statik sayfalarla çalışmaya devam eder.
  const providerPages: MetadataRoute.Sitemap = providers
    .map((item) => item.slug?.trim())
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => ({
      url: `${baseUrl}/isletme/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [...staticPages, ...categoryPages, ...providerPages];
}
