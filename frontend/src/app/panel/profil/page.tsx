"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
} from "@/lib/auth";

type ProviderProfile = {
  id: string;
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
  publicationStatus: "draft" | "published" | "unpublished";
  publishedAtUtc: string | null;
  version: number;
  matchedNeedCount: number;
};

type FormState = {
  description: string;
  additionalServices: string;
  publicPhone: string;
  publicWhatsapp: string;
  publicAddress: string;
  workingHours: string;
  experienceYears: string;
  emergencyService: boolean;
  onsiteService: boolean;
};

const emptyForm: FormState = {
  description: "",
  additionalServices: "",
  publicPhone: "",
  publicWhatsapp: "",
  publicAddress: "",
  workingHours: "",
  experienceYears: "",
  emergencyService: false,
  onsiteService: false,
};

function formFromProfile(profile: ProviderProfile): FormState {
  return {
    description: profile.description ?? "",
    additionalServices: profile.additionalServices.join("\n"),
    publicPhone: profile.publicPhone ?? "",
    publicWhatsapp: profile.publicWhatsapp ?? "",
    publicAddress: profile.publicAddress ?? "",
    workingHours: profile.workingHours ?? "",
    experienceYears:
      profile.experienceYears === null
        ? ""
        : String(profile.experienceYears),
    emergencyService: profile.emergencyService,
    onsiteService: profile.onsiteService,
  };
}

export default function ProviderProfileEditPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const token = getAccessToken();
      const user = getStoredUser();

      if (!token || !user) {
        router.replace("/giris");
        return;
      }

      if (user.role !== "provider") {
        router.replace("/hesabim");
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/provider-panel/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          clearAuth();
          router.replace("/giris");
          return;
        }

        if (!response.ok) {
          throw new Error("Profil alınamadı.");
        }

        const data = (await response.json()) as ProviderProfile;

        if (!active) {
          return;
        }

        setProfile(data);
        setForm(formFromProfile(data));
      } catch {
        if (active) {
          setError("İşletme profili yüklenemedi.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setError("");
    setMessage("");

    const experienceYears = form.experienceYears.trim()
      ? Number(form.experienceYears)
      : null;

    if (
      experienceYears !== null &&
      (!Number.isInteger(experienceYears) ||
        experienceYears < 0 ||
        experienceYears > 100)
    ) {
      setError("Deneyim yılı 0 ile 100 arasında tam sayı olmalıdır.");
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/me`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expectedVersion: profile.version,
            description: form.description.trim() || null,
            additionalServices: form.additionalServices
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
            publicPhone: form.publicPhone.trim() || null,
            publicWhatsapp:
              form.publicWhatsapp.trim() || null,
            publicAddress: form.publicAddress.trim() || null,
            workingHours: form.workingHours.trim() || null,
            experienceYears,
            emergencyService: form.emergencyService,
            onsiteService: form.onsiteService,
          }),
        },
      );

      if (response.status === 401) {
        clearAuth();
        router.replace("/giris");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ??
            "İşletme profili kaydedilemedi.",
        );
        return;
      }

      const updated = data as ProviderProfile;

      setProfile(updated);
      setForm(formFromProfile(updated));
      setMessage("İşletme profilin başarıyla güncellendi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
        </section>
      </SiteLayout>
    );
  }

  if (!profile) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h1 className="font-display text-2xl font-bold">
              Profil açılamadı
            </h1>
            <p className="mt-3 text-muted-foreground">
              {error || "İşletme profiline ulaşılamadı."}
            </p>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <Link
            href="/panel"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← İşletme Paneline Dön
          </Link>

          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            İşletme Profilini Düzenle
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            İletişim ve hizmet bilgilerini güncelle. İşletme adı,
            kategori, ana hizmet, konum ve yayın durumu admin
            kontrolündedir.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-xl border border-border bg-muted/40 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    İşletme
                  </div>
                  <div className="mt-1 font-medium">
                    {profile.businessName}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    Konum
                  </div>
                  <div className="mt-1 font-medium">
                    {profile.citySlug} / {profile.districtSlug}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    Kategori
                  </div>
                  <div className="mt-1 font-medium">
                    {profile.categorySlug}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    Ana hizmet
                  </div>
                  <div className="mt-1 font-medium">
                    {profile.serviceSlug}
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Detaylı açıklama
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  update("description", event.target.value)
                }
                rows={6}
                maxLength={4000}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="İşletmeni, uzmanlıklarını ve hizmet anlayışını anlat."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Ek hizmetler
              </label>

              <textarea
                value={form.additionalServices}
                onChange={(event) =>
                  update(
                    "additionalServices",
                    event.target.value,
                  )
                }
                rows={4}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder={"Her satıra bir hizmet yaz.\nÖrn: Bilgisayar tamiri"}
              />

              <p className="mt-2 text-xs text-muted-foreground">
                En fazla 30 ek hizmet yazabilirsin.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Telefon
              </label>

              <input
                value={form.publicPhone}
                onChange={(event) =>
                  update("publicPhone", event.target.value)
                }
                maxLength={30}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                WhatsApp
              </label>

              <input
                value={form.publicWhatsapp}
                onChange={(event) =>
                  update("publicWhatsapp", event.target.value)
                }
                maxLength={30}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Açık adres
              </label>

              <textarea
                value={form.publicAddress}
                onChange={(event) =>
                  update("publicAddress", event.target.value)
                }
                rows={3}
                maxLength={500}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Çalışma saatleri
              </label>

              <input
                value={form.workingHours}
                onChange={(event) =>
                  update("workingHours", event.target.value)
                }
                maxLength={500}
                placeholder="Pzt-Cts 09:00 - 18:00"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Deneyim yılı
              </label>

              <input
                type="number"
                min={0}
                max={100}
                value={form.experienceYears}
                onChange={(event) =>
                  update(
                    "experienceYears",
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm">
              <input
                type="checkbox"
                checked={form.emergencyService}
                onChange={(event) =>
                  update(
                    "emergencyService",
                    event.target.checked,
                  )
                }
              />
              Acil servis hizmeti veriyorum
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm">
              <input
                type="checkbox"
                checked={form.onsiteService}
                onChange={(event) =>
                  update(
                    "onsiteService",
                    event.target.checked,
                  )
                }
              />
              Yerinde hizmet veriyorum
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-border pt-6">
            <Button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Kaydediliyor..."
                : "Değişiklikleri Kaydet"}
            </Button>

            <Link
              href="/panel"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              İptal
            </Link>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}