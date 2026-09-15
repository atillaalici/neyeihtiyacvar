"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
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
  isActive: boolean;
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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageSize = 10;

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const url =
        status === "all"
          ? `${apiBaseUrl}/api/admin/providers?isActive=true`
          : `${apiBaseUrl}/api/admin/providers?status=${encodeURIComponent(status)}&isActive=true`;

      const response = await adminFetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error();
      }

      setProviders((await response.json()) as AdminProvider[]);
    } catch {
      setError("İşletmeler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProviders();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProviders]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");

    const result = providers.filter((provider) => {
      return (
        !needle ||
        provider.businessName.toLocaleLowerCase("tr-TR").includes(needle) ||
        provider.categorySlug.toLocaleLowerCase("tr-TR").includes(needle) ||
        provider.serviceSlug.toLocaleLowerCase("tr-TR").includes(needle) ||
        provider.citySlug.toLocaleLowerCase("tr-TR").includes(needle) ||
        provider.districtSlug.toLocaleLowerCase("tr-TR").includes(needle)
      );
    });

    return [...result].sort((a, b) => {
      if (sort === "name") {
        return a.businessName.localeCompare(b.businessName, "tr");
      }

      const aTime = new Date(a.updatedAtUtc).getTime();
      const bTime = new Date(b.updatedAtUtc).getTime();

      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [providers, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [query, sort, status]);

  async function publishProvider(provider: AdminProvider) {
    if (
      !window.confirm(
        `${provider.businessName} işletmesini yayına almak istiyor musunuz?`,
      )
    ) {
      return;
    }

    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${provider.id}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedVersion: provider.version }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ??
            "İşletme yayına alınamadı. E-posta ve telefon doğrulamalarını kontrol edin.",
        );
        return;
      }

      await loadProviders();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    }
  }

  async function passivateProvider(provider: AdminProvider) {
    if (!window.confirm(
      `${provider.businessName} işletmesini pasife almak istiyor musunuz?`,
    )) {
      return;
    }

    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${provider.id}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "İşletme pasife alınamadı.");
        return;
      }

      await loadProviders();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    }
  }

  async function deleteProvider(provider: AdminProvider) {
    if (!window.confirm(
      `${provider.businessName} işletmesini silmek istiyor musunuz?`,
    )) {
      return;
    }

    if (!window.confirm("Son onay: Bu işlem geri alınamaz.")) {
      return;
    }

    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${provider.id}`,
        { method: "DELETE" },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.detail ? `${data.message} ${data.detail}` : (data?.message ?? "İşletme silinemedi."));
        return;
      }

      await loadProviders();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    }
  }

  return (
    <SiteLayout>
      <AdminNav />

      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-medium text-primary">Yönetim</p>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                İşletmeler
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Aktif işletme profillerini yönet. Pasife alınan işletmeler
                Pasifler bölümüne taşınır.
              </p>
            </div>

            <Link
              href="/admin/isletmeler/yeni"
              className="inline-flex h-11 items-center justify-center rounded-md border border-primary bg-background px-5 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              + Yeni İşletme Ekle
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
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
                className={[
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  status === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(16rem,1fr)_14rem] xl:w-[42rem]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="İşletme adı, kategori veya konum ile ara..."
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </label>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="newest">Sıralama: Yeniden Eskiye</option>
              <option value="oldest">Sıralama: Eskiden Yeniye</option>
              <option value="name">Sıralama: Ada Göre</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
            İşletme bulunamadı.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visible.map((provider) => (
              <article
                key={provider.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
              >
                <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
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
                      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                    >
                      Düzenle
                    </Link>

                    {provider.publicationStatus !== "published" && (
                      <Button
                        type="button"
                        onClick={() => void publishProvider(provider)}
                      >
                        Yayına Al
                      </Button>
                    )}

                    {provider.publicationStatus === "published" && (
                      <Link
                        href={`/isletme/${provider.slug}`}
                        target="_blank"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
                      >
                        Profili Gör
                      </Link>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void passivateProvider(provider)}
                    >
                      Pasife Al
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => void deleteProvider(provider)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-muted-foreground">
              Toplam {filtered.length} işletmeden{" "}
              {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filtered.length)} arası gösteriliyor.
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                ‹
              </Button>
              <div className="grid size-10 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                {page}
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
              >
                ›
              </Button>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}