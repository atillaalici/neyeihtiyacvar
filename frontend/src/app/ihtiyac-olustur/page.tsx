"use client";

import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  Check,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken, getStoredUser } from "@/lib/auth";

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

type Recommendation = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription: string;
  categorySlug: string;
  serviceSlug: string;
  additionalServices: string[];
  citySlug: string;
  districtSlug: string;
  publicPhone?: string | null;
  publicWhatsapp?: string | null;
  matchLevel: "main-service" | "additional-service" | "category-fallback";
  averageRating: number;
  reviewCount: number;
  experienceYears: number | null;
  emergencyService: boolean;
  onsiteService: boolean;
  score: number;
  reasons: string[];
};

type RecommendationResponse = {
  understanding: {
    originalText: string | null;
    source: "explicit" | "inferred" | "unmatched";
    confidence: number;
    categorySlug: string | null;
    categoryName: string | null;
    serviceSlug: string | null;
    serviceName: string | null;
    alternatives: {
      categorySlug: string;
      categoryName: string;
      serviceSlug: string;
      serviceName: string;
      score: number;
    }[];
  };
  location: {
    citySlug: string | null;
    districtSlug: string | null;
  };
  matching: {
    exactServiceMatchFound: boolean;
    usedCategoryFallback: boolean;
    exactCandidateCount: number;
    categoryCandidateCount: number;
  };
  totalCandidates: number;
  recommendations: Recommendation[];
};

function formatSlug(value: string | null | undefined) {
  if (!value) return "";
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function phoneHref(value: string | null | undefined) {
  if (!value) return null;
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

function NeedCreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedUser = getStoredUser();

  const [query, setQuery] = useState(
    searchParams.get("q")?.trim() ??
      searchParams.get("ihtiyac")?.trim() ??
      "",
  );
  const [detail, setDetail] = useState("");
  const [citySlug, setCitySlug] = useState(
    searchParams.get("il")?.trim() ?? storedUser?.citySlug ?? "",
  );
  const [districtSlug, setDistrictSlug] = useState(
    searchParams.get("ilce")?.trim() ?? storedUser?.districtSlug ?? "",
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [recommendationData, setRecommendationData] =
    useState<RecommendationResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [searching, setSearching] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState("");
  const [trackingSuccess, setTrackingSuccess] = useState("");

  const selectedCity = useMemo(
    () => cities.find((item) => item.slug === citySlug) ?? null,
    [cities, citySlug],
  );
  const districts = selectedCity?.districts ?? [];

  const understoodCategory =
    recommendationData?.understanding.categorySlug ?? "";
  const understoodService =
    recommendationData?.understanding.serviceSlug ?? "";

  const selectedCategoryName =
    recommendationData?.understanding.categoryName ??
    categories.find((item) => item.slug === understoodCategory)?.name ??
    formatSlug(understoodCategory);

  const selectedServiceName =
    recommendationData?.understanding.serviceName ??
    formatSlug(understoodService);

  const recommendations = useMemo(() => {
    return [...(recommendationData?.recommendations ?? [])]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.reviewCount - a.reviewCount;
      })
      .slice(0, 5);
  }, [recommendationData]);

  useEffect(() => {
    let active = true;

    async function loadCatalogs() {
      try {
        const [categoryResponse, locationResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/api/locations`, { cache: "no-store" }),
        ]);

        if (!categoryResponse.ok || !locationResponse.ok) {
          throw new Error();
        }

        const [categoryData, locationData] = await Promise.all([
          categoryResponse.json() as Promise<Category[]>,
          locationResponse.json() as Promise<City[]>,
        ]);

        if (!active) return;
        setCategories(categoryData);
        setCities(locationData);
      } catch {
        if (active) setError("Kategori ve konum bilgileri yüklenemedi.");
      } finally {
        if (active) setLoadingCatalog(false);
      }
    }

    void loadCatalogs();

    return () => {
      active = false;
    };
  }, []);

  async function runSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const cleanQuery = query.trim();

    if (cleanQuery.length < 3) {
      setError("İhtiyacını en az 3 karakterle yaz.");
      return;
    }

    if (!citySlug || !districtSlug) {
      setError("İl ve ilçe bilgisi gerekli.");
      return;
    }

    setSearching(true);
    setError("");
    setTrackingSuccess("");

    try {
      const params = new URLSearchParams({
        q: cleanQuery,
        il: citySlug,
        ilce: districtSlug,
        limit: "5",
      });

      const response = await fetch(
        `${apiBaseUrl}/api/recommendations?${params.toString()}`,
        { cache: "no-store" },
      );

      if (!response.ok) throw new Error();

      setRecommendationData(
        (await response.json()) as RecommendationResponse,
      );
    } catch {
      setError("İhtiyaca uygun işletmeler alınamadı. Lütfen tekrar deneyin.");
    } finally {
      setSearching(false);
    }
  }

  async function createTrackingNeed() {
    const cleanQuery = query.trim();

    if (
      !cleanQuery ||
      !understoodCategory ||
      !understoodService ||
      !citySlug ||
      !districtSlug
    ) {
      setError("Talep oluşturmak için önce ihtiyacını arat ve konumunu seç.");
      return;
    }

    const token = getAccessToken();

    if (!token) {
      const params = new URLSearchParams({
        q: cleanQuery,
        il: citySlug,
        ilce: districtSlug,
        kategori: understoodCategory,
        hizmet: understoodService,
      });

      router.push(
        `/giris?returnUrl=${encodeURIComponent(
          `/ihtiyac-olustur?${params.toString()}`,
        )}`,
      );
      return;
    }

    setTracking(true);
    setError("");

    try {
      const description = detail.trim()
        ? `${cleanQuery}\n\n${detail.trim()}`
        : cleanQuery;

      const response = await fetch(`${apiBaseUrl}/api/needs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: cleanQuery,
          description,
          categorySlug: understoodCategory,
          serviceSlug: understoodService,
          citySlug,
          districtSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Talep oluşturulamadı.");
        return;
      }

      setTrackingSuccess(
        "Talebin oluşturuldu. Uygun yeni bir işletme eklendiğinde sana bildirim göndereceğiz.",
      );
    } catch {
      setError("Talep oluşturulamadı.");
    } finally {
      setTracking(false);
    }
  }

  function providerContactHref(provider: Recommendation) {
    const params = new URLSearchParams({
      contact: "1",
      q: query.trim(),
    });
    return `/isletme/${provider.slug}?${params.toString()}`;
  }

  const showResults =
    Boolean(recommendationData) && query.trim().length > 0;

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-8 sm:py-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <h1 className="font-display text-3xl font-bold sm:text-4xl">
                  Neye İhtiyaç <span className="text-primary">Var?</span>
                </h1>

                <div className="hidden text-right text-sm italic text-muted-foreground md:block">
                  İhtiyaçlar birleşir,
                  <br />
                  çözümler burada buluşur.
                </div>
              </div>

              <form
                onSubmit={runSearch}
                className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5"
              >
                <div className="flex items-center gap-2 rounded-xl border border-input bg-background p-1.5">
                  <Search className="ml-3 size-5 shrink-0 text-primary" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setRecommendationData(null);
                      setTrackingSuccess("");
                    }}
                    placeholder="Örneğin: musluk su akıtıyor"
                    className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {searching ? "Aranıyor..." : "İhtiyacı Bul"}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label>
                    <span className="mb-2 block text-sm font-medium">İl</span>
                    <Select
                      value={citySlug}
                      onValueChange={(value) => {
                        setCitySlug(value);
                        setDistrictSlug("");
                        setRecommendationData(null);
                      }}
                      disabled={loadingCatalog}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="İl seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((item) => (
                          <SelectItem key={item.id} value={item.slug}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium">İlçe</span>
                    <Select
                      value={districtSlug}
                      onValueChange={(value) => {
                        setDistrictSlug(value);
                        setRecommendationData(null);
                      }}
                      disabled={!citySlug || loadingCatalog}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="İlçe seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((item) => (
                          <SelectItem key={item.id} value={item.slug}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <div>
                    <span className="mb-2 block text-sm font-medium">
                      Kategori
                    </span>
                    <div className="flex h-11 items-center rounded-xl border border-input bg-muted/30 px-3 text-sm">
                      {selectedCategoryName || "Otomatik belirlenecek"}
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-medium">
                      Hizmet
                    </span>
                    <div className="flex h-11 items-center rounded-xl border border-input bg-muted/30 px-3 text-sm">
                      {selectedServiceName || "Otomatik belirlenecek"}
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Detaylı Açıklama{" "}
                    <span className="font-normal text-muted-foreground">
                      (Opsiyonel)
                    </span>
                  </span>
                  <textarea
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="İşin detayını, uygun zamanı, beklentini veya işletmenin bilmesi gereken bilgileri yazabilirsin..."
                    className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="mt-1 text-right text-xs text-muted-foreground">
                    {detail.length}/2000
                  </div>
                </label>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </form>

              {showResults && (
                <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold">
                        Sana En Uygun İşletmeler
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        “{query.trim()}” ihtiyacın için {formatSlug(citySlug)} /{" "}
                        {formatSlug(districtSlug)} bölgesindeki en uygun
                        işletmeleri sıraladık.
                      </p>
                    </div>
                    <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      İlk {recommendations.length} sonuç
                    </div>
                  </div>

                  {recommendations.length > 0 ? (
                    <>
                      <div className="mt-5 space-y-3">
                        {recommendations.map((provider, index) => {
                          const phone = phoneHref(provider.publicPhone);

                          return (
                            <article
                              key={provider.id}
                              className="rounded-2xl border border-border p-4"
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                      {index + 1}
                                    </span>
                                    <h3 className="font-display text-lg font-bold">
                                      {provider.businessName}
                                    </h3>
                                    <BadgeCheck className="size-4 text-primary" />
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                      <Star className="size-4 fill-amber-400 text-amber-400" />
                                      {provider.averageRating.toLocaleString(
                                        "tr-TR",
                                        {
                                          minimumFractionDigits: 1,
                                          maximumFractionDigits: 1,
                                        },
                                      )}{" "}
                                      ({provider.reviewCount} değerlendirme)
                                    </span>

                                    <span className="inline-flex items-center gap-1">
                                      <MapPin className="size-4 text-primary" />
                                      {formatSlug(provider.citySlug)} /{" "}
                                      {formatSlug(provider.districtSlug)}
                                    </span>
                                  </div>

                                  <div className="mt-2 text-sm text-muted-foreground">
                                    {formatSlug(provider.serviceSlug)}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Link
                                    href={`/isletme/${provider.slug}`}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-semibold hover:bg-accent"
                                  >
                                    İşletmeyi İncele
                                  </Link>

                                  {phone ? (
                                    <a
                                      href={phone}
                                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/40 px-4 text-sm font-semibold text-primary hover:bg-primary/5"
                                    >
                                      <Phone className="size-4" />
                                      Ara
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold opacity-50"
                                    >
                                      <Phone className="size-4" />
                                      Ara
                                    </button>
                                  )}

                                  <Link
                                    href={providerContactHref(provider)}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                                  >
                                    Teklif İste
                                  </Link>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <Link
                        href={`/kesfet?${new URLSearchParams({
                          q: query.trim(),
                          il: citySlug,
                          ilce: districtSlug,
                        }).toString()}`}
                        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary text-sm font-semibold text-primary hover:bg-primary/5"
                      >
                        <BriefcaseBusiness className="size-4" />
                        Diğer İşletmeleri Gör
                        <ArrowRight className="size-4" />
                      </Link>
                    </>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-border p-7 text-center">
                      <BellRing className="mx-auto size-8 text-primary" />
                      <h3 className="mt-3 font-display text-xl font-bold">
                        Şimdilik uygun işletme bulamadık
                      </h3>
                      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                        Talebini takibe alabiliriz. Uygun bir işletme
                        eklendiğinde sana bildirim göndeririz.
                      </p>

                      <button
                        type="button"
                        onClick={() => void createTrackingNeed()}
                        disabled={tracking}
                        className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        {tracking
                          ? "Talep oluşturuluyor..."
                          : "Talep Oluştur ve Takip Et"}
                      </button>
                    </div>
                  )}

                  {trackingSuccess && (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {trackingSuccess}
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h2 className="font-display text-lg font-bold">
                  Araman nasıl çalışır?
                </h2>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    "İhtiyacını yaz ve konumunu seç.",
                    "Kategori ve hizmet otomatik belirlenir.",
                    "En uygun işletmeler puanlanarak sıralanır.",
                    "Uygun işletme yoksa talebini takibe alırız.",
                  ].map((item, index) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span className="pt-1 text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex gap-3">
                  <ShieldCheck className="size-6 shrink-0 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-950">
                      Güvenli ve Ücretsiz
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-green-800">
                      Arama yapmak ücretsizdir. Kişisel bilgilerin yalnızca
                      sen onayladığında seçtiğin işletmeyle paylaşılır.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h3 className="font-display text-lg font-bold">
                  Daha iyi sonuçlar için
                </h3>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {[
                    "İhtiyacını kısa ve net yaz.",
                    "İl ve ilçenin doğru olduğundan emin ol.",
                    "Gerekirse detaylı açıklama ekle.",
                    "Acil durum varsa açıklamada belirt.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
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
          <section className="section-shell py-10">
            <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
          </section>
        </SiteLayout>
      }
    >
      <NeedCreatePageContent />
    </Suspense>
  );
}
