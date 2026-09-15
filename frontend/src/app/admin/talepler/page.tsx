"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Search, UserRound } from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type NeedStatus = "open" | "offerreceived" | "completed" | "cancelled";
type FilterStatus = "all" | NeedStatus;

type AdminNeed = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  district: string;
  categorySlug: string | null;
  serviceSlug: string | null;
  status: NeedStatus;
  isActive: boolean;
  ownerDisplayName: string | null;
  ownerEmail: string | null;
  offerCount: number;
  pendingOfferCount: number;
  reviewCount: number;
  createdAtUtc: string;
};

const statusLabels: Record<NeedStatus, string> = {
  open: "Açık",
  offerreceived: "Teklif Alındı",
  completed: "Sonuçlandı",
  cancelled: "İptal Edildi",
};

const statusClasses: Record<NeedStatus, string> = {
  open: "border-slate-200 bg-slate-50 text-slate-700",
  offerreceived: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-green-200 bg-green-50 text-green-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

export default function AdminNeedsPage() {
  const [needs, setNeeds] = useState<AdminNeed[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadNeeds = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("isActive", "true");
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/needs?${params.toString()}`,
        { cache: "no-store" },
      );

      if (!response.ok) throw new Error();

      setNeeds((await response.json()) as AdminNeed[]);
    } catch {
      setError("İhtiyaç talepleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNeeds();
  }, [loadNeeds]);

  async function deleteNeed(need: AdminNeed) {
    if (!window.confirm(`"${need.title}" talebi kalıcı olarak silinsin mi?`)) {
      return;
    }

    if (
      !window.confirm(
        "Son onay: Bu işlem geri alınamaz. Talebi kalıcı olarak silmek istediğinize emin misiniz?",
      )
    ) {
      return;
    }

    setBusyId(need.id);
    setError("");
    setMessage("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/needs/${need.id}`,
        { method: "DELETE" },
      );

      let data: { message?: string } | null = null;

      try {
        data = (await response.json()) as { message?: string };
      } catch {
        data = null;
      }

      if (!response.ok) {
        setError(data?.message ?? "Talep silinemedi.");
        return;
      }

      setMessage(data?.message ?? "İhtiyaç talebi kalıcı olarak silindi.");
      await loadNeeds();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyId(null);
    }
  }
  const filteredNeeds = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");

    const result = needs.filter((need) =>
      !term ||
      [
        need.title,
        need.description,
        need.category,
        need.serviceSlug ?? "",
        need.city,
        need.district,
        need.ownerDisplayName ?? "",
        need.ownerEmail ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(term),
    );

    return [...result].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "tr");
      const aTime = new Date(a.createdAtUtc).getTime();
      const bTime = new Date(b.createdAtUtc).getTime();
      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [needs, search, sort]);

  async function deactivateNeed(need: AdminNeed) {
    if (!window.confirm(`"${need.title}" talebini pasife almak istiyor musunuz?`)) return;

    setBusyId(need.id);
    setError("");
    setMessage("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/needs/${need.id}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Talep pasife alınamadı.");
        return;
      }

      setMessage("İhtiyaç talebi pasife alındı.");
      await loadNeeds();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SiteLayout>
      <AdminNav />

      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <p className="text-sm font-medium text-primary">Yönetim</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            İhtiyaç Talepleri
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Aktif ihtiyaç taleplerini, teklif durumlarını ve sonuçlanan işleri merkezi olarak takip et.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Tümü"],
              ["open", "Açık"],
              ["offerreceived", "Teklif Alındı"],
              ["completed", "Sonuçlandı"],
              ["cancelled", "İptal Edildi"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value as FilterStatus)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  statusFilter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(16rem,1fr)_14rem] xl:w-[44rem]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Talep, kullanıcı, kategori veya konum ara..."
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
              <option value="title">Sıralama: Başlığa Göre</option>
            </select>
          </div>
        </div>

        {message && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-52 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : filteredNeeds.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h2 className="font-display text-xl font-semibold">Aktif talep bulunamadı</h2>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredNeeds.map((need) => (
              <article
                key={need.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold">{need.title}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses[need.status]}`}>
                        {statusLabels[need.status]}
                      </span>
                      <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        Aktif
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{need.description}</p>

                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                      <div className="flex gap-2">
                        <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <div className="font-medium text-foreground">
                            {need.ownerDisplayName ?? "Anonim / Eski Talep"}
                          </div>
                          {need.ownerEmail && <div className="mt-0.5 text-xs">{need.ownerEmail}</div>}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div className="font-medium text-foreground">
                          {need.city} / {need.district}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-foreground">{need.category}</div>
                        <div className="mt-0.5 text-xs">{need.serviceSlug ?? "-"}</div>
                      </div>

                      <div>
                        <div className="font-medium text-foreground">
                          {new Date(need.createdAtUtc).toLocaleString("tr-TR")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 space-y-3 lg:w-72">
                    <div className="grid grid-cols-3 gap-2">
                      <Metric label="Teklif" value={need.offerCount} />
                      <Metric label="Bekleyen" value={need.pendingOfferCount} />
                      <Metric label="Yorum" value={need.reviewCount} />
                    </div>

                    <div className="grid gap-2">
                      <Link
                        href={`/admin/talepler/${need.id}`}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                      >
                        Detayı Gör
                      </Link>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={busyId === need.id}
                      onClick={() => void deleteNeed(need)}
                    >
                      {busyId === need.id ? "Siliniyor..." : "Sil"}
                    </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyId === need.id}
                        onClick={() => void deactivateNeed(need)}
                      >
                        Pasife Al
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

