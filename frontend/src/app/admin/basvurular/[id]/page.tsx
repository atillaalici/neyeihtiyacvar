"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import ProviderProfileView, {
  type GalleryPhoto,
  type Provider,
} from "@/components/provider/ProviderProfileView";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type ProviderApplication = {
  id: string;
  providerId?: string | null;
  providerSlug?: string | null;
  businessName: string;
  shortDescription: string;
  categorySlug: string;
  serviceSlug: string;
  citySlug: string;
  districtSlug: string;
  publicAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  applicantName: string;
  phone: string;
  whatsapp: string | null;
  note: string | null;
  email: string | null;
  additionalServices: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  status: "pending" | "approved" | "rejected";
  createdAtUtc: string;
  version: number;
};

type ApproveResponse = {
  id: string;
  status: "approved";
  providerId: string | null;
  providerSlug: string | null;
  providerStatus?: string;
};

type AdminProvider = {
  id: string;
  version: number;
};

export default function AdminApplicationReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [application, setApplication] =
    useState<ProviderApplication | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/provider-applications?status=pending`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error();
      }

      const items = (await response.json()) as ProviderApplication[];
      const current = items.find((item) => item.id === id) ?? null;

      setApplication(current);

      if (!current) {
        setProvider(null);
        setGallery([]);
        setError("Bekleyen işletme başvurusu bulunamadı.");
        return;
      }

      if (!current.providerId) {
        setProvider(null);
        setGallery([]);
        setError("Başvuruya bağlı işletme profili bulunamadı.");
        return;
      }

      const providerResponse = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${current.providerId}`,
        { cache: "no-store" },
      );

      if (!providerResponse.ok) {
        setProvider(null);
        setGallery([]);
        setError("İşletme profili yüklenemedi.");
        return;
      }

      const providerData = (await providerResponse.json()) as Provider;
      setProvider(providerData);

      const galleryResponse = await fetch(
        `${apiBaseUrl}/api/providers/${current.providerId}/images`,
        { cache: "no-store" },
      );

      if (galleryResponse.ok) {
        const galleryData = (await galleryResponse.json()) as GalleryPhoto[];
        setGallery(Array.isArray(galleryData) ? galleryData : []);
      } else {
        setGallery([]);
      }
    } catch {
      setError("İşletme başvurusu yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function approveAndPublish() {
    if (!application || busy) return;

    const confirmed = window.confirm(
      `${application.businessName} başvurusunu onaylayıp yayına almak istiyor musunuz?`,
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      const approveResponse = await adminFetch(
        `${apiBaseUrl}/api/admin/provider-applications/${application.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewNote: null }),
        },
      );

      const approved = (await approveResponse.json()) as
        | ApproveResponse
        | { message?: string };

      if (!approveResponse.ok) {
        setError(
          "message" in approved && approved.message
            ? approved.message
            : "Başvuru onaylanamadı.",
        );
        return;
      }

      const result = approved as ApproveResponse;

      if (!result.providerId) {
        setError("İşletme profili oluşturulamadı.");
        return;
      }

      const providersResponse = await adminFetch(
        `${apiBaseUrl}/api/admin/providers`,
        { cache: "no-store" },
      );

      if (!providersResponse.ok) {
        setError(
          "Başvuru onaylandı ancak yayın için işletme bilgisi alınamadı.",
        );
        return;
      }

      const providers = (await providersResponse.json()) as AdminProvider[];
      const provider = providers.find((item) => item.id === result.providerId);

      if (!provider) {
        setError(
          "Başvuru onaylandı ancak oluşturulan işletme profili bulunamadı.",
        );
        return;
      }

      const publishResponse = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${provider.id}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedVersion: provider.version }),
        },
      );

      const published = await publishResponse.json();

      if (!publishResponse.ok) {
        setError(
          published?.message ??
            "Başvuru onaylandı ancak işletme yayına alınamadı.",
        );
        return;
      }

      router.push("/admin/basvurular");
      router.refresh();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SiteLayout>
        <AdminNav />
        <main className="section-shell py-10">
          <div className="h-[620px] animate-pulse rounded-3xl bg-muted" />
        </main>
      </SiteLayout>
    );
  }

  if (!application) {
    return (
      <SiteLayout>
        <AdminNav />
        <main className="section-shell py-10">
          <div className="rounded-2xl border bg-card p-8 text-center">
            <h1 className="text-2xl font-bold">Başvuru bulunamadı</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button asChild className="mt-5">
              <Link href="/admin/basvurular">Başvurulara Dön</Link>
            </Button>
          </div>
        </main>
      </SiteLayout>
    );
  }

  if (!provider) {
    return (
      <SiteLayout>
        <AdminNav />
        <main className="section-shell py-10">
          <div className="rounded-2xl border bg-card p-8 text-center">
            <h1 className="text-2xl font-bold">
              İşletme profili bulunamadı
            </h1>
            <p className="mt-2 text-muted-foreground">
              {error || "Başvuruya bağlı işletme profili yüklenemedi."}
            </p>
            <Button asChild className="mt-5">
              <Link href="/admin/basvurular">Başvurulara Dön</Link>
            </Button>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <AdminNav />

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <Link
            href="/admin/basvurular"
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← İşletme Başvurularına Dön
          </Link>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Admin önizlemesi:</strong>{" "}
            Bu işletme henüz yayında değil. Aşağıda başvuru sahibinin hesap
            bilgileri ve kullanıcının göreceği gerçek Dijital Vitrin
            gösterilmektedir.
          </div>

          <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Hesap Bilgileri
                </h2>
                <p className="text-sm text-slate-500">
                  İşletme başvurusunu yapan kullanıcı hesabı
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  application.emailVerified
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {application.emailVerified
                  ? "E-posta Doğrulandı"
                  : "E-posta Doğrulanmadı"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ad Soyad
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {application.applicantName || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  E-posta
                </div>
                <div className="mt-1 break-all font-semibold text-slate-900">
                  {application.email || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Telefon
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {application.phone || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  WhatsApp
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {application.whatsapp || application.phone || "-"}
                </div>
              </div>
            </div>

          </div>

          <div className="mt-5">
            <h2 className="text-lg font-bold text-slate-900">
              Dijital Vitrin Önizlemesi
            </h2>
            <p className="text-sm text-slate-500">
              İşletmenin ziyaretçilere görünecek profili
            </p>
          </div>
        </div>
      </section>

      <ProviderProfileView
        providerOverride={provider}
        galleryOverride={gallery}
        forceAuthenticated
        embedded
      />

      <section className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            disabled={busy}
            onClick={() => void approveAndPublish()}
            className="w-full sm:w-auto"
          >
            {busy ? "İşlem Yapılıyor..." : "Onayla ve Yayınla"}
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
