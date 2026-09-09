"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageSquareText,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type NeedStatus =
  | "open"
  | "offerreceived"
  | "completed"
  | "cancelled";

type AdminNeed = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  district: string;
  categorySlug: string | null;
  serviceSlug: string | null;
  citySlug: string | null;
  districtSlug: string | null;
  status: NeedStatus;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  ownerEmail: string | null;
  offerCount: number;
  acceptedOfferCount: number;
  pendingOfferCount: number;
  reviewCount: number;
  createdAtUtc: string;
  updatedAtUtc: string;
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

type FilterStatus = "all" | NeedStatus;

export default function AdminNeedsPage() {
  const [needs, setNeeds] = useState<AdminNeed[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNeeds = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query =
        statusFilter === "all"
          ? ""
          : `?status=${encodeURIComponent(statusFilter)}`;

      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/needs${query}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Talepler alınamadı.");
      }

      setNeeds((await response.json()) as AdminNeed[]);
    } catch {
      setError(
        "Admin talepleri yüklenemedi. Backend Development ortamında çalışıyor olmalı.",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadNeeds();
  }, [loadNeeds]);

  const filteredNeeds = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");

    if (!term) return needs;

    return needs.filter((need) =>
      [
        need.title,
        need.description,
        need.category,
        need.categorySlug ?? "",
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
  }, [needs, search]);

  const counts = useMemo(
    () => ({
      total: needs.length,
      open: needs.filter((x) => x.status === "open").length,
      offerreceived: needs.filter(
        (x) => x.status === "offerreceived",
      ).length,
      completed: needs.filter(
        (x) => x.status === "completed",
      ).length,
      cancelled: needs.filter(
        (x) => x.status === "cancelled",
      ).length,
    }),
    [needs],
  );

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
            Kullanıcıların oluşturduğu ihtiyaçları, teklif durumlarını
            ve sonuçlanan işleri merkezi olarak takip et.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Toplam" value={counts.total} icon={<FileText className="size-5 text-primary" />} />
          <SummaryCard label="Açık" value={counts.open} icon={<Clock3 className="size-5 text-slate-600" />} />
          <SummaryCard label="Teklif Alındı" value={counts.offerreceived} icon={<MessageSquareText className="size-5 text-blue-600" />} />
          <SummaryCard label="Sonuçlandı" value={counts.completed} icon={<CheckCircle2 className="size-5 text-green-600" />} />
          <SummaryCard label="İptal" value={counts.cancelled} icon={<XCircle className="size-5 text-red-600" />} />
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Talep, kullanıcı, kategori veya konum ara..."
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as FilterStatus)
            }
            className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="open">Açık</option>
            <option value="offerreceived">Teklif Alındı</option>
            <option value="completed">Sonuçlandı</option>
            <option value="cancelled">İptal Edildi</option>
          </select>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : filteredNeeds.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h2 className="font-display text-xl font-semibold">
              Talep bulunamadı
            </h2>
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
                      <h2 className="font-display text-xl font-semibold">
                        {need.title}
                      </h2>

                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses[need.status]}`}>
                        {statusLabels[need.status]}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {need.description}
                    </p>

                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                      <div className="flex gap-2">
                        <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <div className="font-medium text-foreground">
                            {need.ownerDisplayName ?? "Anonim / Eski Talep"}
                          </div>
                          {need.ownerEmail && (
                            <div className="mt-0.5 text-xs">
                              {need.ownerEmail}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <div className="font-medium text-foreground">
                            {need.city} / {need.district}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-foreground">
                          {need.category}
                        </div>
                        <div className="mt-0.5 text-xs">
                          {need.serviceSlug ?? "-"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-foreground">
                          {new Date(need.createdAtUtc).toLocaleString("tr-TR")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 space-y-3 lg:w-64">
                    <div className="grid grid-cols-3 gap-2">
                      <Metric label="Teklif" value={need.offerCount} />
                      <Metric label="Bekleyen" value={need.pendingOfferCount} />
                      <Metric label="Yorum" value={need.reviewCount} />
                    </div>

                    <Link
                      href={`/admin/talepler/${need.id}`}
                      className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Detayı Gör
                    </Link>
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

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}