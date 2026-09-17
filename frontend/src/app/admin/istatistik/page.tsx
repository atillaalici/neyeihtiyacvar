"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";

import { apiBaseUrl } from "@/lib/api";
import {
  clearAuth,
  getAccessToken,
} from "@/lib/auth";

type Period = "weekly" | "monthly" | "yearly" | "total";

type AnalyticsResponse = {
  period: Period;
  startUtc: string | null;
  endUtc: string;
  generatedAtUtc: string;
  totals: {
    searches: number;
    profileViews: number;
    phoneClicks: number;
    whatsappClicks: number;
    totalContactClicks: number;
  };
  topSearches: {
    term: string;
    count: number;
  }[];
  topProviders: {
    providerId: string;
    businessName: string;
    slug: string | null;
    profileViews: number;
    phoneClicks: number;
    whatsappClicks: number;
    totalContactClicks: number;
  }[];
};

const periodOptions: {
  key: Period;
  label: string;
}[] = [
  { key: "weekly", label: "Haftalık" },
  { key: "monthly", label: "Aylık" },
  { key: "yearly", label: "Yıllık" },
  { key: "total", label: "Toplam" },
];

function number(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const token = getAccessToken();

      if (!token) {
        window.location.href = "/giris";
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/admin/analytics?period=${period}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          clearAuth();
          window.location.href = "/giris";
          return;
        }

        if (response.status === 403) {
          setError("Bu raporu görüntülemek için admin yetkisi gerekli.");
          return;
        }

        if (!response.ok) {
          throw new Error();
        }

        const result = (await response.json()) as AnalyticsResponse;

        if (active) {
          setData(result);
        }
      } catch {
        if (active) {
          setError("İstatistik verileri alınamadı.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [period]);

  const maxSearchCount = useMemo(
    () => Math.max(1, ...(data?.topSearches.map((x) => x.count) ?? [1])),
    [data],
  );

  return (
    <SiteLayout>
      <AdminNav />
      <div className="section-shell py-8 sm:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-primary">
            Yönetim
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">
            Platform İstatistikleri
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Arama, işletme görüntülenme, telefon ve WhatsApp hareketlerini
            merkezi olarak takip et.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {periodOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key)}
              className={`h-10 rounded-xl border px-4 text-sm font-semibold transition ${
                period === item.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Aramalar", data.totals.searches],
              ["Profil Görüntülenme", data.totals.profileViews],
              ["Telefon", data.totals.phoneClicks],
              ["WhatsApp", data.totals.whatsappClicks],
              ["Toplam İletişim", data.totals.totalContactClicks],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="text-sm font-medium text-muted-foreground">
                  {label}
                </div>
                <div className="mt-3 font-display text-3xl font-bold">
                  {number(Number(value))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">
                    En Çok Arananlar
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Seçili dönemdeki ilk 10 arama.
                  </p>
                </div>
              </div>

              {data.topSearches.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Bu dönem için arama kaydı yok.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {data.topSearches.map((item, index) => (
                    <div key={`${item.term}-${index}`}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="min-w-0 truncate font-medium">
                          {index + 1}. {item.term}
                        </span>
                        <strong>{number(item.count)}</strong>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.max(
                              5,
                              Math.round((item.count / maxSearchCount) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
              <h2 className="font-display text-xl font-bold">
                En Çok İletişim Alan İşletmeler
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Telefon + WhatsApp toplamına göre ilk 10 işletme.
              </p>

              {data.topProviders.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Bu dönem için işletme etkileşimi yok.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {data.topProviders.map((item, index) => (
                    <div
                      key={item.providerId}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold">
                            {index + 1}. {item.businessName}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Görüntülenme {number(item.profileViews)} · Telefon{" "}
                            {number(item.phoneClicks)} · WhatsApp{" "}
                            {number(item.whatsappClicks)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">
                              İletişim
                            </div>
                            <div className="font-display text-xl font-bold">
                              {number(item.totalContactClicks)}
                            </div>
                          </div>

                          {item.slug && (
                            <Link
                              href={`/isletme/${item.slug}`}
                              target="_blank"
                              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold hover:bg-accent"
                            >
                              Gör
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            Son güncelleme:{" "}
            {new Date(data.generatedAtUtc).toLocaleString("tr-TR")}
          </div>
        </>
      ) : null}
      </div>
    </SiteLayout>
  );
}
