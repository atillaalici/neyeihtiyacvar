import type { MetadataRoute } from "next";

import { serverApiBaseUrl } from "@/lib/seo";

const baseUrl = "https://neyeihtiyacvar.com";

type CategoryItem = {
  slug?: string | null;
  services?: string[];
};
type ProviderItem = {
  slug?: string | null;
  citySlug?: string | null;
  serviceSlug?: string | null;
  additionalServices?: string[];
};

type ListEnvelope<T> =
  | T[]
  | { items?: T[]; data?: T[]; results?: T[] };

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
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/hizmetler`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/kategoriler`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/nasil-calisir`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/hakkimizda`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/iletisim`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/uyelik`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/sozlesmeler`, changeFrequency: "monthly", priority: 0.3 },
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
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const serviceSlugs = new Set<string>();

  for (const category of categories) {
    for (const serviceName of category.services ?? []) {
      const slug = toServiceSlug(serviceName);

      if (slug) {
        serviceSlugs.add(slug);
      }
    }
  }

  const servicePages: MetadataRoute.Sitemap = Array.from(serviceSlugs).map(
    (slug) => ({
      url: `${baseUrl}/hizmet/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

  const localServiceKeys = new Set<string>();

  for (const provider of providers) {
    const citySlug = provider.citySlug?.trim();
    const services = [
      provider.serviceSlug,
      ...(provider.additionalServices ?? []),
    ];

    if (!citySlug) continue;

    for (const rawServiceSlug of services) {
      const rawSlug = rawServiceSlug?.trim();

      if (!rawSlug) continue;

      const serviceSlug = toServiceSlug(rawSlug);

      if (!serviceSlug || !serviceSlugs.has(serviceSlug)) continue;

      localServiceKeys.add(`${citySlug}/${serviceSlug}`);
    }
  }

  const localServicePages: MetadataRoute.Sitemap = Array.from(
    localServiceKeys,
  ).map((key) => ({
    url: `${baseUrl}/${key
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  return [
    ...staticPages,
    ...categoryPages,
    ...servicePages,
    ...localServicePages,
    ...providerPages,
  ];
}
