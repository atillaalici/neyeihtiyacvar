$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"

function Write-Utf8NoBom([string]$path, [string]$content) {
    $directory = [System.IO.Path]::GetDirectoryName($path)

    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    }

    [System.IO.File]::WriteAllText(
        $path,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

$adminList = @'
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
'@

$adminDetail = @'
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiBaseUrl } from "@/lib/api";
import type { CategoryDto } from "@/lib/categories";

type PublicationStatus = "draft" | "published" | "unpublished";

type DistrictDto = {
  id: string;
  slug: string;
  name: string;
};

type CityDto = {
  id: string;
  slug: string;
  name: string;
  districts: DistrictDto[];
};

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

type FormState = {
  businessName: string;
  shortDescription: string;
  description: string;
  categorySlug: string;
  serviceSlug: string;
  additionalServices: string;
  citySlug: string;
  districtSlug: string;
  publicPhone: string;
  publicWhatsapp: string;
  publicAddress: string;
  workingHours: string;
  experienceYears: string;
  emergencyService: boolean;
  onsiteService: boolean;
};

const emptyForm: FormState = {
  businessName: "",
  shortDescription: "",
  description: "",
  categorySlug: "",
  serviceSlug: "",
  additionalServices: "",
  citySlug: "",
  districtSlug: "",
  publicPhone: "",
  publicWhatsapp: "",
  publicAddress: "",
  workingHours: "",
  experienceYears: "",
  emergencyService: false,
  onsiteService: false,
};

function formFromProvider(provider: AdminProvider): FormState {
  return {
    businessName: provider.businessName,
    shortDescription: provider.shortDescription,
    description: provider.description ?? "",
    categorySlug: provider.categorySlug,
    serviceSlug: provider.serviceSlug,
    additionalServices: provider.additionalServices.join("\n"),
    citySlug: provider.citySlug,
    districtSlug: provider.districtSlug,
    publicPhone: provider.publicPhone ?? "",
    publicWhatsapp: provider.publicWhatsapp ?? "",
    publicAddress: provider.publicAddress ?? "",
    workingHours: provider.workingHours ?? "",
    experienceYears:
      provider.experienceYears === null ? "" : String(provider.experienceYears),
    emergencyService: provider.emergencyService,
    onsiteService: provider.onsiteService,
  };
}

function toSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [provider, setProvider] = useState<AdminProvider | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cities, setCities] = useState<CityDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === form.categorySlug) ?? null,
    [categories, form.categorySlug],
  );

  const selectedCity = useMemo(
    () => cities.find((item) => item.slug === form.citySlug) ?? null,
    [cities, form.citySlug],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [providersResponse, categoriesResponse, locationsResponse] =
        await Promise.all([
          fetch(`${apiBaseUrl}/api/admin/providers`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/api/locations`, { cache: "no-store" }),
        ]);

      if (
        !providersResponse.ok ||
        !categoriesResponse.ok ||
        !locationsResponse.ok
      ) {
        throw new Error("Veriler alınamadı.");
      }

      const providers = (await providersResponse.json()) as AdminProvider[];
      const categoryData = (await categoriesResponse.json()) as CategoryDto[];
      const locationData = (await locationsResponse.json()) as CityDto[];

      const current = providers.find((item) => item.id === id);

      if (!current) {
        setProvider(null);
        setError("İşletme profili bulunamadı.");
        return;
      }

      setProvider(current);
      setForm(formFromProvider(current));
      setCategories(categoryData);
      setCities(locationData);
    } catch {
      setError("İşletme bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!provider) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const experienceYears = form.experienceYears.trim()
        ? Number(form.experienceYears)
        : null;

      if (
        experienceYears !== null &&
        (!Number.isInteger(experienceYears) || experienceYears < 0)
      ) {
        setError("Deneyim yılı sıfır veya pozitif tam sayı olmalıdır.");
        return;
      }

      const response = await fetch(
        `${apiBaseUrl}/api/admin/providers/${provider.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expectedVersion: provider.version,
            businessName: form.businessName.trim(),
            shortDescription: form.shortDescription.trim(),
            description: form.description.trim() || null,
            categorySlug: form.categorySlug,
            serviceSlug: form.serviceSlug,
            additionalServices: form.additionalServices
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
            citySlug: form.citySlug,
            districtSlug: form.districtSlug,
            publicPhone: form.publicPhone.trim() || null,
            publicWhatsapp: form.publicWhatsapp.trim() || null,
            publicAddress: form.publicAddress.trim() || null,
            workingHours: form.workingHours.trim() || null,
            experienceYears,
            emergencyService: form.emergencyService,
            onsiteService: form.onsiteService,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Profil kaydedilemedi.");
        return;
      }

      const updated = data as AdminProvider;
      setProvider(updated);
      setForm(formFromProvider(updated));
      setMessage("İşletme profili kaydedildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function publicationAction(action: "publish" | "unpublish") {
    if (!provider) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/providers/${provider.id}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expectedVersion: provider.version,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "İşlem tamamlanamadı.");
        return;
      }

      const updated = data as AdminProvider;
      setProvider(updated);
      setForm(formFromProvider(updated));
      setMessage(
        action === "publish"
          ? "İşletme profili yayına alındı."
          : "İşletme profili yayından kaldırıldı.",
      );
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
        </section>
      </SiteLayout>
    );
  }

  if (!provider) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h1 className="font-display text-2xl font-bold">
              İşletme bulunamadı
            </h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Link
              href="/admin/isletmeler"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              İşletmelere Dön
            </Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const editable = provider.publicationStatus !== "published";

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <Link
            href="/admin/isletmeler"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← İşletmelere dön
          </Link>

          <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">
                {provider.businessName}
              </h1>
              <p className="mt-2 text-muted-foreground">
                Slug: {provider.slug}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {provider.publicationStatus === "published" ? (
                <>
                  <Link
                    href={`/isletme/${provider.slug}`}
                    target="_blank"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    Yayındaki Profili Gör
                  </Link>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void publicationAction("unpublish")}
                  >
                    Yayından Kaldır
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void publicationAction("publish")}
                >
                  Yayınla
                </Button>
              )}
            </div>
          </div>
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

        {!editable && (
          <div className="mb-5 rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            Bu profil yayında. Düzenlemek için önce yayından kaldır.
          </div>
        )}

        <form
          onSubmit={save}
          className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                İşletme adı
              </label>
              <input
                value={form.businessName}
                onChange={(event) => update("businessName", event.target.value)}
                disabled={!editable}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Kısa açıklama
              </label>
              <textarea
                value={form.shortDescription}
                onChange={(event) =>
                  update("shortDescription", event.target.value)
                }
                disabled={!editable}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Detaylı açıklama
              </label>
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                disabled={!editable}
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Kategori</label>
              <Select
                value={form.categorySlug}
                onValueChange={(value: string) => {
                  update("categorySlug", value);
                  update("serviceSlug", "");
                }}
                disabled={!editable}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Kategori seç" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Ana hizmet</label>
              <Select
                value={form.serviceSlug}
                onValueChange={(value: string) => update("serviceSlug", value)}
                disabled={!editable || !selectedCategory}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Hizmet seç" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedCategory?.services ?? []).map((service) => (
                    <SelectItem key={service} value={toSlug(service)}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">İl</label>
              <Select
                value={form.citySlug}
                onValueChange={(value: string) => {
                  update("citySlug", value);
                  update("districtSlug", "");
                }}
                disabled={!editable}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="İl seç" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.slug}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">İlçe</label>
              <Select
                value={form.districtSlug}
                onValueChange={(value: string) => update("districtSlug", value)}
                disabled={!editable || !selectedCity}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="İlçe seç" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedCity?.districts ?? []).map((district) => (
                    <SelectItem key={district.id} value={district.slug}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Ek hizmetler
              </label>
              <textarea
                value={form.additionalServices}
                onChange={(event) =>
                  update("additionalServices", event.target.value)
                }
                disabled={!editable}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm disabled:opacity-60"
                placeholder={"Her satıra bir hizmet yaz.\nÖrn: Bilgisayar tamiri"}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Telefon</label>
              <input
                value={form.publicPhone}
                onChange={(event) => update("publicPhone", event.target.value)}
                disabled={!editable}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">WhatsApp</label>
              <input
                value={form.publicWhatsapp}
                onChange={(event) =>
                  update("publicWhatsapp", event.target.value)
                }
                disabled={!editable}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Adres</label>
              <textarea
                value={form.publicAddress}
                onChange={(event) => update("publicAddress", event.target.value)}
                disabled={!editable}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Çalışma saatleri
              </label>
              <input
                value={form.workingHours}
                onChange={(event) => update("workingHours", event.target.value)}
                disabled={!editable}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                placeholder="Pzt-Cts 09:00 - 18:00"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Deneyim yılı
              </label>
              <input
                type="number"
                min={0}
                value={form.experienceYears}
                onChange={(event) =>
                  update("experienceYears", event.target.value)
                }
                disabled={!editable}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.emergencyService}
                onChange={(event) =>
                  update("emergencyService", event.target.checked)
                }
                disabled={!editable}
              />
              Acil servis mevcut
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.onsiteService}
                onChange={(event) =>
                  update("onsiteService", event.target.checked)
                }
                disabled={!editable}
              />
              Yerinde hizmet mevcut
            </label>
          </div>

          {editable && (
            <div className="flex flex-wrap gap-3 border-t border-border pt-6">
              <Button type="submit" disabled={busy}>
                {busy ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.refresh()}
                disabled={busy}
              >
                Sayfayı Yenile
              </Button>
            </div>
          )}
        </form>
      </section>
    </SiteLayout>
  );
}
'@

Write-Utf8NoBom "$root\src\app\admin\isletmeler\page.tsx" $adminList
Write-Utf8NoBom "$root\src\app\admin\isletmeler\[id]\page.tsx" $adminDetail

Write-Host ""
Write-Host "Admin isletme yonetimi hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Olusturulan dosyalar:" -ForegroundColor Cyan
Write-Host "  src\app\admin\isletmeler\page.tsx"
Write-Host "  src\app\admin\isletmeler\[id]\page.tsx"
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
