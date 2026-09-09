"use client";

import { useCallback, useEffect, useState } from "react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";

type ApplicationStatus = "pending" | "approved" | "rejected";

type ProviderApplication = {
  id: string;
  businessName: string;
  shortDescription: string;
  categorySlug: string;
  serviceSlug: string;
  citySlug: string;
  districtSlug: string;
  applicantName: string;
  phone: string;
  whatsapp: string | null;
  note: string | null;
  status: ApplicationStatus;
  reviewNote: string | null;
  reviewedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  version: number;
};

type ApproveResponse = {
  id: string;
  status: "approved";
  providerId: string | null;
  providerSlug: string | null;
  providerStatus?: string;
};

const statusLabels: Record<ApplicationStatus, string> = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/provider-applications`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Başvurular alınamadı.");
      }

      const data = (await response.json()) as ProviderApplication[];
      setApplications(data);
    } catch {
      setError(
        "Admin başvuruları yüklenemedi. Backend Development ortamında çalışıyor olmalı.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  async function review(
    application: ProviderApplication,
    action: "approve" | "reject",
  ) {
    const reviewNote =
      window.prompt(
        action === "approve"
          ? "Onay notu (isteğe bağlı)"
          : "Red nedeni / notu (isteğe bağlı)",
        "",
      ) ?? "";

    setBusyId(application.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/provider-applications/${application.id}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reviewNote: reviewNote.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "İşlem tamamlanamadı.");
        return;
      }

      if (action === "approve") {
        const approved = data as ApproveResponse;

        setMessage(
          approved.providerSlug
            ? `Başvuru onaylandı. Taslak işletme profili oluşturuldu: ${approved.providerSlug}`
            : "Başvuru onaylandı.",
        );
      } else {
        setMessage("Başvuru reddedildi.");
      }

      await loadApplications();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <p className="text-sm font-medium text-primary">Yönetim</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            İşletme Başvuruları
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Yeni işletme başvurularını incele, onayla veya reddet.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Bu ekran şu aşamada yalnızca Development backend ile kullanılmalıdır.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

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
                className="h-52 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        )}

        {!loading && applications.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h2 className="font-display text-xl font-semibold">
              Henüz işletme başvurusu yok
            </h2>
          </div>
        )}

        {!loading && applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((application) => (
              <article
                key={application.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold">
                        {application.businessName}
                      </h2>
                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium">
                        {statusLabels[application.status]}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {application.shortDescription}
                    </p>

                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <strong className="text-foreground">Kategori:</strong>{" "}
                        {application.categorySlug}
                      </div>
                      <div>
                        <strong className="text-foreground">Hizmet:</strong>{" "}
                        {application.serviceSlug}
                      </div>
                      <div>
                        <strong className="text-foreground">Konum:</strong>{" "}
                        {application.citySlug} / {application.districtSlug}
                      </div>
                      <div>
                        <strong className="text-foreground">Yetkili:</strong>{" "}
                        {application.applicantName}
                      </div>
                      <div>
                        <strong className="text-foreground">Telefon:</strong>{" "}
                        {application.phone}
                      </div>
                      <div>
                        <strong className="text-foreground">Tarih:</strong>{" "}
                        {new Date(application.createdAtUtc).toLocaleString("tr-TR")}
                      </div>
                    </div>

                    {application.note && (
                      <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm leading-6">
                        {application.note}
                      </p>
                    )}

                    {application.reviewNote && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        <strong className="text-foreground">İnceleme notu:</strong>{" "}
                        {application.reviewNote}
                      </p>
                    )}
                  </div>

                  {application.status === "pending" && (
                    <div className="flex shrink-0 flex-row gap-2 lg:flex-col">
                      <Button
                        type="button"
                        disabled={busyId === application.id}
                        onClick={() => void review(application, "approve")}
                      >
                        Onayla
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyId === application.id}
                        onClick={() => void review(application, "reject")}
                      >
                        Reddet
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}