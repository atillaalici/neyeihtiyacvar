"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
import { getAccessToken } from "@/lib/auth";

type Category = {
  id: string;
  slug: string;
  name: string;
  services: string[];
};

type District = {
  id: string;
  slug: string;
  name: string;
};

type City = {
  id: string;
  slug: string;
  name: string;
  districts: District[];
};

type NeedResponse = {
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
  createdAtUtc: string;
};

type MatchProvider = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription: string;
  categorySlug: string;
  serviceSlug: string;
  citySlug: string;
  districtSlug: string;
  publicPhone: string | null;
  publicWhatsapp: string | null;
};

type MatchResponse = {
  requestId: string;
  matchType: string;
  count: number;
  providers: MatchProvider[];
  message?: string;
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NeedCreatePage() {
  const searchParams = useSearchParams();
  const initialNeed = searchParams.get("ihtiyac") ?? "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [description, setDescription] = useState(initialNeed);
  const [categorySlug, setCategorySlug] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<NeedResponse | null>(null);
  const [matches, setMatches] = useState<MatchResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogs() {
      try {
        const [categoryResponse, locationResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/categories`),
          fetch(`${apiBaseUrl}/api/locations`),
        ]);

        if (!categoryResponse.ok || !locationResponse.ok) {
          throw new Error("Katalog verileri alınamadı.");
        }

        const [categoryData, locationData] = await Promise.all([
          categoryResponse.json() as Promise<Category[]>,
          locationResponse.json() as Promise<City[]>,
        ]);

        if (!cancelled) {
          setCategories(categoryData);
          setCities(locationData);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Kategori ve konum bilgileri yüklenemedi. Backend'in çalıştığından emin olun.",
          );
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    void loadCatalogs();

    return () => {
      cancelled = true;
    };
  }, []);

  const services = useMemo(() => {
    return categories.find((item) => item.slug === categorySlug)?.services ?? [];
  }, [categories, categorySlug]);

  const districts = useMemo(() => {
    return cities.find((item) => item.slug === citySlug)?.districts ?? [];
  }, [cities, citySlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || success) {
      return;
    }

    setError("");
    setMatches(null);

    const cleanDescription = description.trim();

    if (!cleanDescription) {
      setError("Lütfen ihtiyacını yaz.");
      return;
    }

    if (!categorySlug) {
      setError("Lütfen kategori seç.");
      return;
    }

    if (!serviceSlug) {
      setError("Lütfen hizmet seç.");
      return;
    }

    if (!citySlug) {
      setError("Lütfen il seç.");
      return;
    }

    if (!districtSlug) {
      setError("Lütfen ilçe seç.");
      return;
    }

    const title =
      cleanDescription.length > 150
        ? `${cleanDescription.slice(0, 147)}...`
        : cleanDescription;

    const token = getAccessToken();

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}/api/needs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description: cleanDescription,
          categorySlug,
          serviceSlug,
          citySlug,
          districtSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "İhtiyaç talebi oluşturulamadı.");
        return;
      }

      const created = data as NeedResponse;
      setSuccess(created);

      const matchResponse = await fetch(
        `${apiBaseUrl}/api/needs/${created.id}/matches`,
      );

      if (matchResponse.ok) {
        setMatches((await matchResponse.json()) as MatchResponse);
      }
    } catch {
      setError(
        "Sunucuya bağlanılamadı. Backend'in çalıştığından emin olun.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <section className="section-shell py-10 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              İhtiyaç Oluştur
            </h1>

            <p className="mt-3 text-muted-foreground">
              İhtiyacını, hizmeti ve konumunu seç. Sana uygun yayındaki
              işletmeleri bulalım.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
          >
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                Neye ihtiyacın var?
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setSuccess(null);
                  setMatches(null);
                }}
                rows={5}
                maxLength={2000}
                placeholder="İhtiyacını kendi cümlenle anlat..."
                className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Kategori
                </label>

                <Select
                  value={categorySlug}
                  onValueChange={(value) => {
                    setCategorySlug(value);
                    setServiceSlug("");
                  }}
                  disabled={catalogLoading}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Kategori Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem key={item.id} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Hizmet
                </label>

                <Select
                  value={serviceSlug}
                  onValueChange={(value) => {
                    setServiceSlug(value);
                    setSuccess(null);
                    setMatches(null);
                  }}
                  disabled={!categorySlug}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Hizmet Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service} value={toSlug(service)}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">İl</label>

                <Select
                  value={citySlug}
                  onValueChange={(value) => {
                    setCitySlug(value);
                    setDistrictSlug("");
                  }}
                  disabled={catalogLoading}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="İl Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {cities.map((item) => (
                      <SelectItem key={item.id} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  İlçe
                </label>

                <Select
                  value={districtSlug}
                  onValueChange={(value) => {
                    setDistrictSlug(value);
                    setSuccess(null);
                    setMatches(null);
                  }}
                  disabled={!citySlug}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="İlçe Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {districts.map((item) => (
                      <SelectItem key={item.id} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!getAccessToken() && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Giriş yapmadan da talep oluşturabilirsin; ancak işletmelerden
                teklif almak ve teklifleri hesabında görmek için giriş yapman gerekir.
                {" "}
                <Link href="/giris" className="font-medium underline">
                  Giriş Yap
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Talebin başarıyla oluşturuldu.
                <div className="mt-1 break-all text-xs">
                  Talep ID: {success.id}
                </div>
                {getAccessToken() && (
                  <Link
                    href="/taleplerim"
                    className="mt-2 inline-block font-medium underline"
                  >
                    Taleplerime Git
                  </Link>
                )}
              </div>
            )}

            {matches && (
              <div className="rounded-2xl border border-border bg-background p-5">
                <div className="mb-4">
                  <h2 className="font-semibold">
                    Uygun işletmeler ({matches.count})
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aynı kategori, hizmet, il ve ilçedeki yayındaki işletmeler.
                  </p>
                </div>

                {matches.count === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Şu anda birebir eşleşen yayındaki işletme bulunamadı.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {matches.providers.map((provider) => (
                      <Link
                        key={provider.id}
                        href={`/isletme/${provider.slug}`}
                        className="block rounded-xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/40"
                      >
                        <div className="font-semibold">
                          {provider.businessName}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {provider.shortDescription}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading || catalogLoading || !!success}
              className="w-full"
            >
              {loading
                ? "Talep oluşturuluyor..."
                : catalogLoading
                  ? "Bilgiler yükleniyor..."
                  : success
                    ? "Talep Oluşturuldu"
                    : "Talebi Gönder"}
            </Button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}