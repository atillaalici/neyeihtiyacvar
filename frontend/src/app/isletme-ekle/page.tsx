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