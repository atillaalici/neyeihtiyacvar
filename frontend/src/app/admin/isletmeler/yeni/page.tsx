"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch } from "@/lib/admin-api";
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

export default function NewAdminProviderPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cities, setCities] = useState<CityDto[]>([]);

  const [categorySlug, setCategorySlug] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [additionalServices, setAdditionalServices] = useState<string[]>([]);
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === categorySlug) ?? null,
    [categories, categorySlug],
  );

  const selectedCity = useMemo(
    () => cities.find((item) => item.slug === citySlug) ?? null,
    [cities, citySlug],
  );

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const [categoriesResponse, locationsResponse] = await Promise.all([
          adminFetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" }),
          adminFetch(`${apiBaseUrl}/api/locations`, { cache: "no-store" }),
        ]);

        if (!categoriesResponse.ok || !locationsResponse.ok) {
          throw new Error();
        }

        const categoryData =
          (await categoriesResponse.json()) as CategoryDto[];
        const locationData =
          (await locationsResponse.json()) as CityDto[];

        if (!active) return;

        setCategories(categoryData);
        setCities(locationData);
      } catch {
        if (active) {
          setError("Kategori ve konum bilgileri yüklenemedi.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  function toggleAdditionalService(slug: string) {
    setAdditionalServices((current) => {
      if (current.includes(slug)) {
        return current.filter((item) => item !== slug);
      }

      if (current.length >= 3) {
        setError("En fazla 1 ek hizmet seçebilirsiniz.");
        return current;
      }

      setError("");
      return [...current, slug];
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    setBusy(true);
    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: String(form.get("businessName") ?? ""),
            shortDescription: String(form.get("shortDescription") ?? ""),
            description: String(form.get("description") ?? ""),
            categorySlug,
            serviceSlug,
            additionalServices,
            citySlug,
            districtSlug,
            publicPhone: String(form.get("publicPhone") ?? ""),
            publicWhatsapp: String(form.get("publicWhatsapp") ?? ""),
            publicAddress: String(form.get("publicAddress") ?? ""),
            workingHours: String(form.get("workingHours") ?? ""),
            experienceYears: form.get("experienceYears")
              ? Number(form.get("experienceYears"))
              : null,
            emergencyService: form.get("emergencyService") === "on",
            onsiteService: form.get("onsiteService") === "on",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "İşletme oluşturulamadı.");
        return;
      }

      router.push(`/admin/isletmeler/${data.id}`);
      router.refresh();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <AdminNav />
      <section className="section-shell py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-bold">
            Yeni İşletme Ekle
          </h1>

          {loading ? (
            <div className="mt-6 h-72 animate-pulse rounded-2xl border border-border bg-card" />
          ) : (
            <form
              onSubmit={submit}
              className="mt-6 grid gap-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:grid-cols-2"
            >
              <Field label="İşletme Adı" name="businessName" />
              <Field label="Kısa Açıklama" name="shortDescription" />

              <label>
                <span className="text-sm font-medium">Kategori</span>
                <Select
                  value={categorySlug}
                  onValueChange={(value) => {
                    setCategorySlug(value);
                    setServiceSlug("");
                    setAdditionalServices([]);
                  }}
                >
                  <SelectTrigger className="mt-2 h-11 w-full">
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
              </label>

              <label>
                <span className="text-sm font-medium">Ana Hizmet</span>
                <Select
                  value={serviceSlug}
                  onValueChange={(value) => {
                    setServiceSlug(value);
                    setAdditionalServices((current) =>
                      current.filter((item) => item !== value),
                    );
                  }}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger className="mt-2 h-11 w-full">
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
              </label>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Ek Hizmetler</span>
                  <span className="text-xs text-muted-foreground">
                    {additionalServices.length}/1 seçildi
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(selectedCategory?.services ?? [])
                    .filter((service) => toSlug(service) !== serviceSlug)
                    .map((service) => {
                      const slug = toSlug(service);
                      const checked = additionalServices.includes(slug);
                      const disabled =
                        !checked && additionalServices.length >= 1;

                      return (
                        <label
                          key={service}
                          className={[
                            "flex items-center gap-3 rounded-xl border p-3 text-sm",
                            checked
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-background",
                            disabled ? "opacity-60" : "cursor-pointer",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleAdditionalService(slug)}
                          />
                          <span>{service}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <label>
                <span className="text-sm font-medium">İl</span>
                <Select
                  value={citySlug}
                  onValueChange={(value) => {
                    setCitySlug(value);
                    setDistrictSlug("");
                  }}
                >
                  <SelectTrigger className="mt-2 h-11 w-full">
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
              </label>

              <label>
                <span className="text-sm font-medium">İlçe</span>
                <Select
                  value={districtSlug}
                  onValueChange={setDistrictSlug}
                  disabled={!selectedCity}
                >
                  <SelectTrigger className="mt-2 h-11 w-full">
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
              </label>

              <Field label="Telefon" name="publicPhone" />
              <Field label="WhatsApp" name="publicWhatsapp" />
              <Field label="Adres" name="publicAddress" />
              <Field label="Çalışma Saatleri" name="workingHours" />
              <Field
                label="Deneyim Yılı"
                name="experienceYears"
                type="number"
              />

              <label className="sm:col-span-2">
                <span className="text-sm font-medium">Açıklama</span>
                <textarea
                  name="description"
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
                />
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" name="emergencyService" />
                <span className="text-sm">Acil servis</span>
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" name="onsiteService" />
                <span className="text-sm">Yerinde hizmet</span>
              </label>

              {error && (
                <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/isletmeler")}
                >
                  Vazgeç
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Oluşturuluyor..." : "İşletmeyi Oluştur"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label>
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}