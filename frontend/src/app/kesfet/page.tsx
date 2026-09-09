"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { ProviderCard } from "@/components/site/ProviderCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import type { ProviderSummary } from "@/lib/providers";

export default function ExplorePage() {
  const searchParams = useSearchParams();

  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    for (const key of ["q", "il", "ilce", "kategori", "hizmet"] as const) {
      const value = searchParams.get(key);

      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }

    return params.toString();
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadProviders() {
      setLoading(true);
      setError("");

      try {
        const url = queryString
          ? `${apiBaseUrl}/api/providers?${queryString}`
          : `${apiBaseUrl}/api/providers`;

        const response = await fetch(url, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("İşletmeler alınamadı.");
        }

        const data = (await response.json()) as ProviderSummary[];

        if (!active) {
          return;
        }

        setProviders(data);
      } catch {
        if (!active) {
          return;
        }

        setError("İşletmeler yüklenemedi. Backend bağlantısını kontrol et.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProviders();

    return () => {
      active = false;
    };
  }, [queryString]);

  const q = searchParams.get("q");
  const city = searchParams.get("il");
  const district = searchParams.get("ilce");

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-primary">
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              Keşfet
            </span>

            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Sana uygun işletmeleri keşfet
            </h1>

            <p className="max-w-2xl text-muted-foreground">
              Yayındaki işletmeleri ihtiyacına ve konumuna göre listeliyoruz.
            </p>

            {(q || city || district) && (
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {q && (
                  <span className="rounded-full border border-border bg-surface px-3 py-1.5">
                    Arama: {q}
                  </span>
                )}

                {city && (
                  <span className="rounded-full border border-border bg-surface px-3 py-1.5">
                    İl: {city}
                  </span>
                )}

                {district && (
                  <span className="rounded-full border border-border bg-surface px-3 py-1.5">
                    İlçe: {district}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && providers.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <Search className="mx-auto size-8 text-primary" aria-hidden="true" />

            <h2 className="mt-4 font-display text-xl font-semibold">
              Uygun işletme bulunamadı
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Bu filtrelerle henüz yayınlanmış bir işletme yok. Aramanı değiştirerek tekrar deneyebilirsin.
            </p>
          </div>
        )}

        {!loading && !error && providers.length > 0 && (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {providers.length} işletme bulundu
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
