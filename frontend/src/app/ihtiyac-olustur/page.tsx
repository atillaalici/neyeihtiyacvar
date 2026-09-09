"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BellRing, CheckCircle2 } from "lucide-react";

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

function NeedCreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialNeed =
    searchParams.get("ihtiyac") ??
    searchParams.get("q") ??
    "";

  const initialCategory =
    searchParams.get("kategori") ?? "";
  const initialService =
    searchParams.get("hizmet") ?? "";
  const initialCity =
    searchParams.get("il") ?? "";
  const initialDistrict =
    searchParams.get("ilce") ?? "";

  const returnUrl = `/ihtiyac-olustur${
    searchParams.toString()
      ? `?${searchParams.toString()}`
      : ""
  }`;
  const fromSearch =
    Boolean(initialNeed) &&
    Boolean(initialCategory) &&
    Boolean(initialService) &&
    Boolean(initialCity) &&
    Boolean(initialDistrict);

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const [description, setDescription] =
    useState(initialNeed);
  const [categorySlug, setCategorySlug] =
    useState(initialCategory);
  const [serviceSlug, setServiceSlug] =
    useState(initialService);
  const [citySlug, setCitySlug] =
    useState(initialCity);
  const [districtSlug, setDistrictSlug] =
    useState(initialDistrict);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] =
    useState<NeedResponse | null>(null);
  const [matches, setMatches] =
    useState<MatchResponse | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setAuthenticated(Boolean(getAccessToken()));
    setAuthReady(true);
  }, []);

  useEffect(() => {
    setDescription(initialNeed);
    setCategorySlug(initialCategory);
    setServiceSlug(initialService);
    setCitySlug(initialCity);
    setDistrictSlug(initialDistrict);
    setSuccess(null);
    setMatches(null);
  }, [
    initialNeed,
    initialCategory,
    initialService,
    initialCity,
    initialDistrict,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogs() {
      try {
        const [categoryResponse, locationResponse] =
          await Promise.all([
            fetch(`${apiBaseUrl}/api/categories`, {
              cache: "no-store",
            }),
            fetch(`${apiBaseUrl}/api/locations`, {
              cache: "no-store",
            }),
          ]);

        if (
          !categoryResponse.ok ||
          !locationResponse.ok
        ) {
          throw new Error(
            "Katalog verileri alınamadı.",
          );
        }

        const [categoryData, locationData] =
          await Promise.all([
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
            "Kategori ve konum bilgileri yüklenemedi.",
          );
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }

    void loadCatalogs();

    return () => {
      cancelled = true;
    };
  }, []);

  const services = useMemo(() => {
    return (
      categories.find(
        (item) => item.slug === categorySlug,
      )?.services ?? []
    );
  }, [categories, categorySlug]);

  const districts = useMemo(() => {
    return (
      cities.find(
        (item) => item.slug === citySlug,
      )?.districts ?? []
    );
  }, [cities, citySlug]);

  const selectedCategoryName =
    categories.find(
      (item) => item.slug === categorySlug,
    )?.name ?? categorySlug;

  const selectedServiceName =
    services.find(
      (item) => toSlug(item) === serviceSlug,
    ) ?? serviceSlug;

  const selectedCityName =
    cities.find(
      (item) => item.slug === citySlug,
    )?.name ?? citySlug;

  const selectedDistrictName =
    districts.find(
      (item) => item.slug === districtSlug,
    )?.name ?? districtSlug;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
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

    if (!token) {
      router.push(
        `/giris?returnUrl=${encodeURIComponent(returnUrl)}`,
      );
      return;
    }

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      headers.Authorization = `Bearer ${token}`;

      const response = await fetch(
        `${apiBaseUrl}/api/needs`,
        {
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
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ??
            "İhtiyaç talebi oluşturulamadı.",
        );
        return;
      }

      const created = data as NeedResponse;
      setSuccess(created);

      const matchResponse = await fetch(
        `${apiBaseUrl}/api/needs/${created.id}/matches`,
        { cache: "no-store" },
      );

      if (matchResponse.ok) {
        setMatches(
          (await matchResponse.json()) as MatchResponse,
        );
      }
    } catch {
      setError(
        "Sunucuya bağlanılamadı. Lütfen tekrar deneyin.",
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
              Talep Oluştur
            </h1>

            <p className="mt-3 text-muted-foreground">
              {fromSearch
                ? "Arama bilgilerini senin için hazırladık. Kontrol edip talebi oluşturabilirsin."
                : "İhtiyacını, hizmeti ve konumunu belirle. Uygun işletme platforma geldiğinde bu talep üzerinden takip edebiliriz."}
            </p>
          </div>

          {fromSearch && (
            <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <BellRing
                    className="size-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">
                    İstersen bu ihtiyacı takip edelim
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Şu an uygun işletme bulunamadı. Talebi
                    oluşturursan uygun bir işletme platforma
                    eklendiğinde ileride sana haber verebileceğiz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!authReady ? (
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          ) : !authenticated ? (
            <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-soft sm:p-8">
              <h2 className="font-display text-2xl font-bold">
                Talep oluşturmak için hesabına giriş yap
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Talebini 7 gün takip edebilmemiz ve uygun bir işletme
                bulunduğunda sana haber verebilmemiz için talebin hesabına
                bağlı olmalı. Arama bilgilerin korunacak; giriş veya kayıt
                sonrası kaldığın yerden devam edeceksin.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href={`/giris?returnUrl=${encodeURIComponent(returnUrl)}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Giriş Yap
                </Link>

                <Link
                  href={`/kayit?returnUrl=${encodeURIComponent(returnUrl)}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold transition hover:bg-muted"
                >
                  Üye Ol
                </Link>
              </div>
            </div>
          ) : (
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
                rows={4}
                maxLength={2000}
                placeholder="İhtiyacını kendi cümlenle anlat..."
                className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            {fromSearch && !catalogLoading && (
              <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Hizmet
                  </div>
                  <div className="mt-1 font-medium">
                    {selectedServiceName || "—"}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {selectedCategoryName}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    Konum
                  </div>
                  <div className="mt-1 font-medium">
                    {selectedCityName} /{" "}
                    {selectedDistrictName}
                  </div>
                </div>
              </div>
            )}

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
                    setSuccess(null);
                    setMatches(null);
                  }}
                  disabled={catalogLoading}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Kategori Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={item.slug}
                      >
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
                  disabled={!categorySlug || catalogLoading}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Hizmet Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {services.map((serviceItem) => (
                      <SelectItem
                        key={serviceItem}
                        value={toSlug(serviceItem)}
                      >
                        {serviceItem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  İl
                </label>

                <Select
                  value={citySlug}
                  onValueChange={(value) => {
                    setCitySlug(value);
                    setDistrictSlug("");
                    setSuccess(null);
                    setMatches(null);
                  }}
                  disabled={catalogLoading}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="İl Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {cities.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={item.slug}
                      >
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
                  disabled={!citySlug || catalogLoading}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="İlçe Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {districts.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={item.slug}
                      >
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2
                    className="size-4"
                    aria-hidden="true"
                  />
                  Talebin başarıyla oluşturuldu.
                </div>

                <p className="mt-2 text-sm">
                  Talebin açık kaldığı sürece uygun işletmelerle
                  eşleştirilebilir.
                </p>

                {getAccessToken() && (
                  <Link
                    href="/taleplerim"
                    className="mt-3 inline-block font-medium underline"
                  >
                    Taleplerime Git
                  </Link>
                )}
              </div>
            )}

            {matches && matches.count > 0 && (
              <div className="rounded-2xl border border-border bg-background p-5">
                <div className="mb-4">
                  <h2 className="font-semibold">
                    Uygun işletmeler ({matches.count})
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Talebi oluştururken yeni bir eşleşme bulundu.
                  </p>
                </div>

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
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={
                loading ||
                catalogLoading ||
                Boolean(success)
              }
              className="w-full"
            >
              {loading
                ? "Talep oluşturuluyor..."
                : catalogLoading
                  ? "Bilgiler yükleniyor..."
                  : success
                    ? "Talep Oluşturuldu"
                    : "Talebi Oluştur ve Takip Et"}
            </Button>
          </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

export default function NeedCreatePage() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <section className="section-shell py-10 sm:py-16">
            <div className="mx-auto max-w-2xl">
              <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
            </div>
          </section>
        </SiteLayout>
      }
    >
      <NeedCreatePageContent />
    </Suspense>
  );
}