"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";

type PublicationStatus = "draft" | "published" | "unpublished";

type AdminProvider = {
  id: string;
  sourceApplicationId: string | null;
  slug: string;
  businessName: string;
  shortDescription: string;
  description: string | null;
  categorySlug: string;
  serviceSlug: string;
  additionalServices: string[];
  citySlug: string;
  districtSlug: string;
  publicPhone: string | null;
  publicWhatsapp: string | null;
  publicAddress: string | null;
  workingHours: string | null;
  experienceYears: number | null;
  emergencyService: boolean;
  onsiteService: boolean;
  publicationStatus: PublicationStatus;
  publishedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  version: number;
};

const statusLabels: Record<PublicationStatus, string> = {
  draft: "Taslak",
  published: "Yayında",
  unpublished: "Yayından Kaldırıldı",
};

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [status, setStatus] = useState<"all" | PublicationStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const url =
        status === "all"
          ? `${apiBaseUrl}/api/admin/providers`
          : `${apiBaseUrl}/api/admin/providers?status=${encodeURIComponent(status)}`;

      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("İşletmeler alınamadı.");
      }

      const data = (await response.json()) as AdminProvider[];
      setProviders(data);
    } catch {
      setError(
        "İşletmeler yüklenemedi. Backend Development ortamında çalışıyor olmalı.",
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const counts = useMemo(() => {
    return {
      all: providers.length,
      draft: providers.filter((item) => item.publicationStatus === "draft").length,
      published: providers.filter((item) => item.publicationStatus === "published").length,
      unpublished: providers.filter((item) => item.publicationStatus === "unpublished").length,
    };
  }, [providers]);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <p className="text-sm font-medium text-primary">Yönetim</p>

          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">
                İşletmeler
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Taslak, yayındaki ve yayından kaldırılmış işletme profillerini yönet.
              </p>
            </div>

            <Link
              href="/admin/basvurular"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              Başvurulara Git
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["all", "Tümü"],
            ["draft", "Taslak"],
            ["published", "Yayında"],
            ["unpublished", "Yayından Kaldırıldı"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value as typeof status)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                status === value
                  ? "border-primary bg-accent text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        )}

        {!loading && providers.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h2 className="font-display text-xl font-semibold">
              Bu durumda işletme yok
            </h2>
          </div>
        )}

        {!loading && providers.length > 0 && (
          <div className="space-y-4">
            {providers.map((provider) => (
              <article
                key={provider.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold">
                        {provider.businessName}
                      </h2>
                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium">
                        {statusLabels[provider.publicationStatus]}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {provider.shortDescription}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span>
                        <strong className="text-foreground">Kategori:</strong>{" "}
                        {provider.categorySlug}
                      </span>
                      <span>
                        <strong className="text-foreground">Hizmet:</strong>{" "}
                        {provider.serviceSlug}
                      </span>
                      <span>
                        <strong className="text-foreground">Konum:</strong>{" "}
                        {provider.citySlug} / {provider.districtSlug}
                      </span>
                      <span>
                        <strong className="text-foreground">Sürüm:</strong>{" "}
                        {provider.version}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/admin/isletmeler/${provider.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Düzenle
                    </Link>

                    {provider.publicationStatus === "published" && (
                      <Link
                        href={`/isletme/${provider.slug}`}
                        target="_blank"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
                      >
                        Profili Gör
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Yüklü kayıt sayısı: {counts.all}
        </p>
      </section>
    </SiteLayout>
  );
}