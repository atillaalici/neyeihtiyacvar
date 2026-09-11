"use client";

import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";

type RawRecord = Record<string, unknown>;

type CatalogService = {
  slug: string;
  name: string;
};

type CatalogCategory = {
  slug: string;
  name: string;
  services: CatalogService[];
};

const CATALOG_ROUTE = "/api/categories";

function pickString(
  source: RawRecord,
  keys: string[],
): string {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function toRecordArray(value: unknown): RawRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is RawRecord =>
      typeof item === "object" &&
      item !== null &&
      !Array.isArray(item),
  );
}

function normalizeCatalog(payload: unknown): CatalogCategory[] {
  let roots: RawRecord[] = [];

  if (Array.isArray(payload)) {
    roots = toRecordArray(payload);
  } else if (
    typeof payload === "object" &&
    payload !== null
  ) {
    const root = payload as RawRecord;

    for (const key of [
      "categories",
      "items",
      "data",
      "catalog",
    ]) {
      const candidate = toRecordArray(root[key]);

      if (candidate.length > 0) {
        roots = candidate;
        break;
      }
    }
  }

  return roots
    .map((category) => {
      const slug = pickString(category, [
        "slug",
        "categorySlug",
        "key",
        "code",
      ]);

      const name = pickString(category, [
        "name",
        "categoryName",
        "title",
        "label",
      ]);

      let serviceRecords: RawRecord[] = [];

      for (const key of [
        "services",
        "children",
        "items",
        "serviceItems",
      ]) {
        const candidate = toRecordArray(category[key]);

        if (candidate.length > 0) {
          serviceRecords = candidate;
          break;
        }
      }

      const rawServices = Array.isArray(category.services)
        ? category.services
        : [];

      const services = rawServices
        .map((service) => {
          if (typeof service === "string") {
            return {
              slug: service,
              name: service,
            };
          }

          if (
            typeof service === "object" &&
            service !== null &&
            !Array.isArray(service)
          ) {
            const record = service as RawRecord;

            return {
              slug: pickString(record, [
                "slug",
                "serviceSlug",
                "key",
                "code",
                "name",
                "serviceName",
              ]),
              name: pickString(record, [
                "name",
                "serviceName",
                "title",
                "label",
                "slug",
              ]),
            };
          }

          return {
            slug: "",
            name: "",
          };
        })
        .filter(
          (service) =>
            service.slug.length > 0 &&
            service.name.length > 0,
        );

      return {
        slug,
        name,
        services,
      };
    })
    .filter(
      (category) =>
        category.slug.length > 0 &&
        category.name.length > 0,
    );
}

export default function ServicesPage() {
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${apiBaseUrl}${CATALOG_ROUTE}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload: unknown = await response.json();
        const normalized = normalizeCatalog(payload);

        if (!active) {
          return;
        }

        if (normalized.length === 0) {
          setError(
            "Katalog verisi geldi ancak kategori yapısı okunamadı.",
          );
          return;
        }

        setCatalog(normalized);
      } catch (catalogError) {
        console.error("Katalog yüklenemedi:", catalogError);

        if (active) {
          setError(
            "Hizmet kataloğu şu anda yüklenemedi. Lütfen tekrar deneyin.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  const filteredCatalog = useMemo(() => {
    const value = query
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!value) {
      return catalog;
    }

    return catalog
      .map((category) => {
        const categoryMatch = category.name
          .toLocaleLowerCase("tr-TR")
          .includes(value);

        if (categoryMatch) {
          return category;
        }

        return {
          ...category,
          services: category.services.filter((service) =>
            service.name
              .toLocaleLowerCase("tr-TR")
              .includes(value),
          ),
        };
      })
      .filter(
        (category) =>
          category.name
            .toLocaleLowerCase("tr-TR")
            .includes(value) ||
          category.services.length > 0,
      );
  }, [catalog, query]);

  const totalServices = catalog.reduce(
    (sum, category) => sum + category.services.length,
    0,
  );

  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14 lg:py-16">
        <section className="rounded-[30px] border border-orange-100 bg-gradient-to-b from-orange-50/70 to-white p-5 shadow-sm sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-orange-700">
            <Sparkles className="h-3.5 w-3.5" />
            Hizmet Kataloğu
          </span>

          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Tüm hizmetleri keşfet
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Gerçek hizmet kataloğumuzdan ihtiyacını seç. Hizmete tıkladığında o hizmeti veren işletmeleri listeleyelim.
          </p>

          <div className="relative mt-6 max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-orange-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hizmet ara... Örn: elektrikçi, bilgisayar, nakliye"
              className="h-12 w-full rounded-2xl border border-orange-100 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {!loading && !error ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {catalog.length} kategori • {totalServices} hizmet
            </p>
          ) : null}
        </section>

        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-3xl border border-orange-100 bg-orange-50/50"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm">
            <Search className="mx-auto h-8 w-8 text-orange-500" />
            <h2 className="mt-3 font-bold">Hizmet bulunamadı</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Farklı bir kelimeyle tekrar arayabilirsin.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCatalog.map((category) => (
              <section
                key={category.slug}
                className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm"
              >
                <div className="border-b border-orange-100 bg-orange-50/60 px-5 py-4">
                  <h2 className="font-display text-xl font-bold">
                    {category.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {category.services.length} hizmet
                  </p>
                </div>

                <div className="p-3">
                  {category.services.length > 0 ? (
                    <div className="space-y-1">
                      {category.services.map((service) => (
                        <Link
                          key={`${category.slug}-${service.slug}`}
                          href={`/kesfet?${new URLSearchParams({
                            kategori: category.slug,
                            hizmet: service.slug,
                          }).toString()}`}
                          className="group flex items-center justify-between rounded-xl px-3 py-3 text-sm transition hover:bg-orange-50"
                        >
                          <span className="font-medium text-slate-800">
                            {service.name}
                          </span>

                          <ArrowRight className="h-4 w-4 text-orange-400 transition group-hover:translate-x-0.5 group-hover:text-orange-600" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      href={`/kesfet?kategori=${encodeURIComponent(category.slug)}`}
                      className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-orange-50"
                    >
                      Bu kategorideki işletmeleri gör
                      <ArrowRight className="h-4 w-4 text-orange-500" />
                    </Link>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </SiteLayout>
  );
}