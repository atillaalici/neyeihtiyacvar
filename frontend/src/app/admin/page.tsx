"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  MessageSquareText,
  Star,
  Store,
  Users,
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

type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected";

type DashboardData = {
  totalNeeds: number;
  openNeeds: number;
  offerReceivedNeeds: number;
  completedNeeds: number;
  cancelledNeeds: number;
  pendingApplications: number;
  approvedApplications: number;
  totalUsers: number;
  activeUsers: number;
  totalProviders: number;
  publishedProviders: number;
  totalOffers: number;
  pendingOffers: number;
  totalReviews: number;
  recentNeeds: Array<{
    id: string;
    title: string;
    city: string;
    district: string;
    status: NeedStatus;
    createdAtUtc: string;
  }>;
  recentApplications: Array<{
    id: string;
    businessName: string;
    citySlug: string;
    districtSlug: string;
    status: ApplicationStatus;
    createdAtUtc: string;
  }>;
};

const needStatusLabels: Record<NeedStatus, string> = {
  open: "Açık",
  offerreceived: "Teklif Alındı",
  completed: "Sonuçlandı",
  cancelled: "İptal Edildi",
};

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await adminFetch(
          `${apiBaseUrl}/api/admin/dashboard`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Yönetim özeti alınamadı.");
        }

        if (active) {
          setData((await response.json()) as DashboardData);
        }
      } catch {
        if (active) {
          setError(
            "Yönetim paneli yüklenemedi. Backend Development ortamında çalışıyor olmalı.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SiteLayout>
      <AdminNav />

      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <p className="text-sm font-medium text-primary">
            Yönetim
          </p>

          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Genel Bakış
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            İhtiyaç taleplerini, işletme başvurularını,
            işletmeleri ve teklif hareketlerini tek ekrandan takip et.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading || !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Toplam Kullanıcı"
                value={data.totalUsers}
                icon={<Users className="size-5 text-violet-600" />}
                href="/admin/kullanicilar"
              />
              <StatCard
                label="Aktif Kullanıcı"
                value={data.activeUsers}
                icon={<Users className="size-5 text-emerald-600" />}
                href="/admin/kullanicilar"
              />
              <StatCard
                label="Toplam İşletme"
                value={data.totalProviders}
                icon={<Building2 className="size-5 text-sky-600" />}
                href="/admin/isletmeler"
              />
              <StatCard
                label="Yayındaki İşletme"
                value={data.publishedProviders}
                icon={<Store className="size-5 text-blue-600" />}
                href="/admin/isletmeler"
              />
              <StatCard
                label="Toplam Talep"
                value={data.totalNeeds}
                icon={<ClipboardList className="size-5 text-primary" />}
                href="/admin/talepler"
              />
              <StatCard
                label="Açık Talep"
                value={data.openNeeds}
                icon={<Clock3 className="size-5 text-slate-600" />}
                href="/admin/talepler"
              />
              <StatCard
                label="Sonuçlanan"
                value={data.completedNeeds}
                icon={<CheckCircle2 className="size-5 text-green-600" />}
                href="/admin/talepler"
              />
              <StatCard
                label="İptal Edilen"
                value={data.cancelledNeeds}
                icon={<XCircle className="size-5 text-red-600" />}
                href="/admin/talepler"
              />
              <StatCard
                label="Bekleyen Başvuru"
                value={data.pendingApplications}
                icon={<Building2 className="size-5 text-amber-600" />}
                href="/admin/basvurular"
              />
              <StatCard
                label="Yayındaki İşletme"
                value={data.publishedProviders}
                icon={<Store className="size-5 text-blue-600" />}
                href="/admin/isletmeler"
              />
              <StatCard
                label="Toplam Teklif"
                value={data.totalOffers}
                icon={<CircleDollarSign className="size-5 text-primary" />}
                href="/admin/talepler"
              />
              <StatCard
                label="Değerlendirme"
                value={data.totalReviews}
                icon={<Star className="size-5 text-amber-500" />}
                href="/admin/talepler"
              />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      Son İhtiyaç Talepleri
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sisteme en son eklenen talepler.
                    </p>
                  </div>

                  <Link
                    href="/admin/talepler"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Tümünü Gör
                  </Link>
                </div>

                <div className="mt-5 space-y-3">
                  {data.recentNeeds.map((need) => (
                    <Link
                      key={need.id}
                      href={`/admin/talepler/${need.id}`}
                      className="block rounded-xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {need.title}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {need.city} / {need.district}
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs">
                          {needStatusLabels[need.status]}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        {new Date(need.createdAtUtc).toLocaleString("tr-TR")}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      Son İşletme Başvuruları
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      En son gelen işletme başvuruları.
                    </p>
                  </div>

                  <Link
                    href="/admin/basvurular"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Tümünü Gör
                  </Link>
                </div>

                <div className="mt-5 space-y-3">
                  {data.recentApplications.map((application) => (
                    <Link
                      key={application.id}
                      href="/admin/basvurular"
                      className="block rounded-xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {application.businessName}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {application.citySlug} / {application.districtSlug}
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs">
                          {applicationStatusLabels[application.status]}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        {new Date(application.createdAtUtc).toLocaleString("tr-TR")}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-5">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span>
                  Teklif alan talepler:{" "}
                  <strong className="text-foreground">
                    {data.offerReceivedNeeds}
                  </strong>
                </span>
                <span>
                  Bekleyen teklifler:{" "}
                  <strong className="text-foreground">
                    {data.pendingOffers}
                  </strong>
                </span>
                <span>
                  Toplam işletme:{" "}
                  <strong className="text-foreground">
                    {data.totalProviders}
                  </strong>
                </span>
                <span>
                  Onaylanan başvurular:{" "}
                  <strong className="text-foreground">
                    {data.approvedApplications}
                  </strong>
                </span>
              </div>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/40 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-bold">
            {value}
          </div>
        </div>

        <div className="grid size-11 place-items-center rounded-xl bg-muted/60">
          {icon}
        </div>
      </div>
    </Link>
  );
}