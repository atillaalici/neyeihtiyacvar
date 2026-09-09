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

$isletmeEkle = @'
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

type ApplicationResponse = {
  id: string;
  status: "pending";
  createdAtUtc: string;
};

export default function ProviderApplicationPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cities, setCities] = useState<CityDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ApplicationResponse | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === categorySlug) ?? null,
    [categories, categorySlug],
  );

  const selectedCity = useMemo(
    () => cities.find((item) => item.slug === citySlug) ?? null,
    [cities, citySlug],
  );

  const serviceOptions = selectedCategory?.services ?? [];
  const districtOptions = selectedCity?.districts ?? [];

  useEffect(() => {
    let active = true;

    async function loadCatalogs() {
      setCatalogLoading(true);
      setError("");

      try {
        const [categoriesResponse, locationsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/api/locations`, { cache: "no-store" }),
        ]);

        if (!categoriesResponse.ok || !locationsResponse.ok) {
          throw new Error("Katalog verileri alınamadı.");
        }

        const categoryData = (await categoriesResponse.json()) as CategoryDto[];
        const locationData = (await locationsResponse.json()) as CityDto[];

        if (!active) {
          return;
        }

        setCategories(categoryData);
        setCities(locationData);
      } catch {
        if (active) {
          setError("Kategori ve konum bilgileri yüklenemedi.");
        }
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }
    }

    void loadCatalogs();

    return () => {
      active = false;
    };
  }, []);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(null);

    if (
      !businessName.trim() ||
      !shortDescription.trim() ||
      !categorySlug ||
      !serviceSlug ||
      !citySlug ||
      !districtSlug ||
      !applicantName.trim() ||
      !phone.trim()
    ) {
      setError("Lütfen zorunlu alanların tamamını doldur.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/provider-applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          shortDescription: shortDescription.trim(),
          categorySlug,
          serviceSlug,
          citySlug,
          districtSlug,
          applicantName: applicantName.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || null,
          note: note.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Başvuru gönderilemedi.");
        return;
      }

      setSuccess(data as ApplicationResponse);
    } catch {
      setError("Sunucuya bağlanılamadı. Backend bağlantısını kontrol et.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Hizmet Verenler</p>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              İşletmeni Neye İhtiyaç Var'a ekle
            </h1>
            <p className="mt-3 leading-7 text-muted-foreground">
              İşletme bilgilerini gönder. Başvurun incelendikten sonra profilin hazırlanıp
              yayına alınabilir.
            </p>
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="businessName" className="mb-2 block text-sm font-medium">
                İşletme adı *
              </label>
              <input
                id="businessName"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                maxLength={200}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="Örn: Teknonet Yazılım Bilgisayar"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="shortDescription" className="mb-2 block text-sm font-medium">
                Kısa açıklama *
              </label>
              <textarea
                id="shortDescription"
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                maxLength={300}
                rows={3}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="İşletmenin sunduğu hizmeti kısaca anlat."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Kategori *</label>
              <Select
                value={categorySlug}
                onValueChange={(value: string) => {
                  setCategorySlug(value);
                  setServiceSlug("");
                }}
                disabled={catalogLoading}
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
              <label className="mb-2 block text-sm font-medium">Ana hizmet *</label>
              <Select
                value={serviceSlug}
                onValueChange={setServiceSlug}
                disabled={!selectedCategory}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Hizmet seç" />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service} value={toSlug(service)}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">İl *</label>
              <Select
                value={citySlug}
                onValueChange={(value: string) => {
                  setCitySlug(value);
                  setDistrictSlug("");
                }}
                disabled={catalogLoading}
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
              <label className="mb-2 block text-sm font-medium">İlçe *</label>
              <Select
                value={districtSlug}
                onValueChange={setDistrictSlug}
                disabled={!selectedCity}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="İlçe seç" />
                </SelectTrigger>
                <SelectContent>
                  {districtOptions.map((district) => (
                    <SelectItem key={district.id} value={district.slug}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="applicantName" className="mb-2 block text-sm font-medium">
                Yetkili adı *
              </label>
              <input
                id="applicantName"
                value={applicantName}
                onChange={(event) => setApplicantName(event.target.value)}
                maxLength={150}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium">
                Telefon *
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={30}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="05xx xxx xx xx"
              />
            </div>

            <div>
              <label htmlFor="whatsapp" className="mb-2 block text-sm font-medium">
                WhatsApp
              </label>
              <input
                id="whatsapp"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                maxLength={30}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="05xx xxx xx xx"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="note" className="mb-2 block text-sm font-medium">
                Başvuru notu
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                rows={4}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="Eklemek istediğin bir bilgi varsa yaz."
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
              <strong>Başvurun alındı.</strong>
              <div className="mt-1">Durum: İnceleme bekliyor</div>
              <div className="mt-1 break-all text-xs">Başvuru ID: {success.id}</div>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || catalogLoading}
          >
            {submitting ? "Başvuru gönderiliyor..." : "İşletme Başvurusunu Gönder"}
          </Button>
        </form>
      </section>
    </SiteLayout>
  );
}
'@

$adminBasvurular = @'
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
'@

Write-Utf8NoBom "$root\src\app\isletme-ekle\page.tsx" $isletmeEkle
Write-Utf8NoBom "$root\src\app\admin\basvurular\page.tsx" $adminBasvurular

Write-Host ""
Write-Host "Isletme basvuru formu ve admin basvurular ekrani hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Olusturulan dosyalar:" -ForegroundColor Cyan
Write-Host "  src\app\isletme-ekle\page.tsx"
Write-Host "  src\app\admin\basvurular\page.tsx"
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
