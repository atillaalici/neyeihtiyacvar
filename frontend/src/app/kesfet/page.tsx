"use client";

import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Store,
} from "lucide-react";
import Link from "next/link";
import {FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState, useRef} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ProviderCard } from "@/components/site/ProviderCard";
import { LocationSearch } from "@/components/site/LocationSearch";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { getAccessToken } from "@/lib/auth";
import type { ProviderSummary } from "@/lib/providers";

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
  matchLevel:
    | "main-service"
    | "additional-service"
    | "category-fallback";
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

type SortMode = "best" | "rating" | "experience";

const popularSearches = [
  "Elektrikçi",
  "Su tesisatçısı",
  "Evden eve nakliyat",
  "Klima servisi",
  "Bilgisayar servisi",
];

function formatSlug(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .split("-")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toLocaleUpperCase("tr-TR") +
        part.slice(1),
    )
    .join(" ");
}

function serviceMatchLabel(
  level: Recommendation["matchLevel"],
) {
  switch (level) {
    case "main-service":
      return "Ana hizmet eşleşmesi";
    case "additional-service":
      return "Ek hizmet eşleşmesi";
    default:
      return "Yakın alternatif";
  }
}

function reasonText(reason: string) {
  return reason
    .replace(
      "Aradığın hizmet işletmenin ek hizmetleri arasında",
      "Aradığın hizmeti sunuyor",
    )
    .replace(
      "Aradığın hizmet işletmenin ana hizmeti",
      "Aradığın hizmeti sunuyor",
    )
    .replace(
      "İhtiyacınla aynı hizmet kategorisinde",
      "İhtiyacınla aynı kategoride",
    );
}

function ExplorePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [providers, setProviders] =
    useState<ProviderSummary[]>([]);
  const [visibleProviderCount, setVisibleProviderCount] =
    useState(16);
  const [recommendationData, setRecommendationData] =
    useState<RecommendationResponse | null>(null);
  const [queryInput, setQueryInput] = useState(
    searchParams.get("q")?.trim() ?? "",
  );
  const [sortMode, setSortMode] =
    useState<SortMode>("best");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [showManualLocation, setShowManualLocation] = useState(false);

  const q = searchParams.get("q")?.trim() ?? "";
  const city = searchParams.get("il")?.trim() ?? "";
  const district =
    searchParams.get("ilce")?.trim() ?? "";
  const category =
    searchParams.get("kategori")?.trim() ?? "";
  const service =
    searchParams.get("hizmet")?.trim() ?? "";

  const smartMode = q.length > 0;


  const providerQueryString = useMemo(() => {
    const params = new URLSearchParams();

    for (const key of [
      "il",
      "ilce",
      "kategori",
      "hizmet",
    ] as const) {
      const value = searchParams.get(key);

      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }

    return params.toString();
  }, [searchParams]);

  const recommendationQueryString = useMemo(() => {
    const params = new URLSearchParams();

    for (const key of [
      "q",
      "il",
      "ilce",
      "kategori",
      "hizmet",
    ] as const) {
      const value = searchParams.get(key);

      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }

    params.set("limit", "10");

    return params.toString();
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        if (smartMode) {
          const response = await fetch(
            `${apiBaseUrl}/api/recommendations?${recommendationQueryString}`,
            { cache: "no-store" },
          );

          if (!response.ok) {
            throw new Error("Öneriler alınamadı.");
          }

          const data =
            (await response.json()) as RecommendationResponse;

          if (!active) {
            return;
          }

          setRecommendationData(data);
          setProviders([]);
        } else {
          const url = providerQueryString
            ? `${apiBaseUrl}/api/providers?${providerQueryString}`
            : `${apiBaseUrl}/api/providers`;

          const response = await fetch(url, {
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error("İşletmeler alınamadı.");
          }

          const data =
            (await response.json()) as ProviderSummary[];

          if (!active) {
            return;
          }

          setProviders(data);
          setVisibleProviderCount(16);
          setRecommendationData(null);
        }
      } catch {
        if (!active) {
          return;
        }

        setError(
          "Sonuçlar yüklenemedi. Lütfen tekrar deneyin.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [
    providerQueryString,
    recommendationQueryString,
    smartMode,
  ]);

  function buildSearchParamsWithPreferredLocation(value: string) {
    const params = new URLSearchParams();
    params.set("q", value);

    // Kesfet sayfasinda kullanicinin secmis oldugu konum varsa
    // yeni ihtiyac aramasinda ayni il/ilce korunur.
    if (city && district) {
      params.set("il", city);
      params.set("ilce", district);
      return params;
    }

    const storedUser = getStoredUser();

    if (storedUser?.citySlug && storedUser?.districtSlug) {
      params.set("il", storedUser.citySlug);
      params.set("ilce", storedUser.districtSlug);
      return params;
    }

    // Kayitli konum yoksa mevcut cihaz-konumu akisini kullan.
    params.set("yakinda", "1");

    return params;
  }
  function submitSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value = queryInput.trim();

    if (!value) {
      router.push("/kesfet");
      return;
    }

    const params = buildSearchParamsWithPreferredLocation(value);

    router.push(`/kesfet?${params.toString()}`);
  }

  function selectPopularSearch(value: string) {
    setQueryInput(value);

    const params = buildSearchParamsWithPreferredLocation(value);

    router.push(`/kesfet?${params.toString()}`);
  }

  function clearSearch() {
    setQueryInput("");
    router.push("/kesfet");
  }

  const nearbyAutoTriggeredRef = useRef(false);
  function applyLocation(value: {
    city: string;
    district: string;
  }) {
    const params = new URLSearchParams();

    if (q) {
      params.set("q", q);
    }

    if (category) {
      params.set("kategori", category);
    }

    if (service) {
      params.set("hizmet", service);
    }

    params.set("il", value.city);
    params.set("ilce", value.district);

    router.push(`/kesfet?${params.toString()}`);
  }

  function requestDeviceLocation() {
    setLocationMessage("");

    if (!("geolocation" in navigator)) {
      setLocationMessage(
        "Bu cihaz konum bilgisini desteklemiyor. İl ve ilçeni seçebilirsin.",
      );
      setShowManualLocation(true);
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const params = new URLSearchParams({
            lat: String(position.coords.latitude),
            lon: String(position.coords.longitude),
          });

          const response = await fetch(
            `${apiBaseUrl}/api/recommendations/location?${params.toString()}`,
            { cache: "no-store" },
          );

          if (!response.ok) {
            throw new Error("Konum çözümlenemedi.");
          }

          const data = (await response.json()) as {
            found: boolean;
            citySlug: string | null;
            cityName: string | null;
            districtSlug: string | null;
            districtName: string | null;
          };

          if (
            !data.found ||
            !data.citySlug ||
            !data.districtSlug
          ) {
            setLocationMessage(
              "Konumunu aldık ancak il ve ilçeyi kesinleştiremedik. Lütfen aşağıdan seç.",
            );
            setShowManualLocation(true);
            return;
          }

          setLocationMessage(
            `${data.cityName} / ${data.districtName} konumu bulundu.`,
          );

          applyLocation({
            city: data.citySlug,
            district: data.districtSlug,
          });
        } catch {
          setLocationMessage(
            "Konum bilgisi alınamadı. İl ve ilçeni manuel seçebilirsin.",
          );
          setShowManualLocation(true);
        } finally {
          setLocating(false);
        }
      },
      (geolocationError) => {
        setLocating(false);

        if (geolocationError.code === 1) {
          setLocationMessage(
            "Konum izni verilmedi. İl ve ilçeni manuel seçebilirsin.",
          );
        } else {
          setLocationMessage(
            "Cihaz konumu alınamadı. İl ve ilçeni manuel seçebilirsin.",
          );
        }

        setShowManualLocation(true);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }
  useEffect(() => {
    if (nearbyAutoTriggeredRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("yakinda") !== "1") {
      return;
    }

    nearbyAutoTriggeredRef.current = true;

    const timer = window.setTimeout(() => {
      requestDeviceLocation();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);
  const recommendations =
    recommendationData?.recommendations ?? [];

  const sortedRecommendations = useMemo(() => {
    const result = [...recommendations];

    switch (sortMode) {
      case "rating":
        return result.sort((a, b) => {
          if (b.averageRating !== a.averageRating) {
            return b.averageRating - a.averageRating;
          }

          return b.reviewCount - a.reviewCount;
        });

      case "experience":
        return result.sort(
          (a, b) =>
            (b.experienceYears ?? 0) -
            (a.experienceYears ?? 0),
        );

      default:
        return result.sort(
          (a, b) => b.score - a.score,
        );
    }
  }, [recommendations, sortMode]);

  const understoodLocation = [
    recommendationData?.location.citySlug,
    recommendationData?.location.districtSlug,
  ]
    .filter(Boolean)
    .map((item) => formatSlug(item))
    .join(" / ");

  const understoodService =
    recommendationData?.understanding.serviceName ||
    formatSlug(service) ||
    "İhtiyaç";

  const locationComplete = Boolean(
    recommendationData?.location.citySlug &&
      recommendationData?.location.districtSlug,
  );

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-8 sm:py-10">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Türkiye&apos;nin Yerel İhtiyaç Platformu
            </span>

            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Neye ihtiyaç{" "}
              <span className="text-primary">var?</span>
            </h1>

            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              İhtiyacını yaz, doğru ihtiyacı biz bulalım.
            </p>

            <form
              onSubmit={submitSearch}
              className="mx-auto mt-6 flex max-w-3xl items-center rounded-2xl border border-border bg-background p-1.5 shadow-soft"
            >
              <Search
                className="ml-3 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />

              <input
                value={queryInput}
                onChange={(event) =>
                  setQueryInput(event.target.value)
                }
                className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Örneğin: Musluk akıtıyor, Osmaniye Merkez'de tesisatçı arıyorum"
              />

              {queryInput && (
                <button
                  type="button"
                  onClick={() => setQueryInput("")}
                  className="mr-1 rounded-lg px-2 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Arama metnini temizle"
                >
                  ×
                </button>
              )}

              <button
                type="submit"
                className="h-12 shrink-0 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                İhtiyacı Bul
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="mr-1 text-xs text-muted-foreground">
                Popüler aramalar:
              </span>

              {popularSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectPopularSearch(item)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-primary"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-8 sm:py-10">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-2xl border border-border bg-card"
                />
              ),
            )}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          smartMode &&
          recommendationData && (
            <>
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Sparkles
                        className="size-4"
                        aria-hidden="true"
                      />
                      İhtiyacını anladık
                    </div>

                    <h2 className="mt-2 font-display text-3xl font-bold">
                      {understoodService}
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {locationComplete
                        ? `${understoodLocation} konumunda uygun işletmeleri senin için aradık.`
                        : sortedRecommendations.length > 0
                          ? "Konum belirtmeden ihtiyacına uygun işletmeler bulduk."
                          : "Uygun işletme bulamadık. Konumunu paylaşarak yakınındaki işletmelere bakalım."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearSearch}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                  >
                    <RotateCcw
                      className="size-4"
                      aria-hidden="true"
                    />
                    Aramayı Temizle
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BriefcaseBusiness
                        className="size-5"
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Algılanan hizmet
                      </div>
                      <div className="mt-1 font-semibold">
                        {understoodService}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {recommendationData.understanding
                          .categoryName ?? "Kategori"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MapPin
                        className="size-5"
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Konum
                      </div>
                      <div className="mt-1 font-semibold">
                        {understoodLocation ||
                          "Konum belirtilmedi"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {locationComplete
                          ? "Sonuçlar bu konuma göre sıralandı"
                          : sortedRecommendations.length > 0
                            ? "Konum belirtilmeden arandı"
                            : "Sonuç için konum gerekebilir"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Store
                        className="size-5"
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Bulunan işletme
                      </div>
                      <div className="mt-1 font-semibold">
                        {locationComplete
                          ? `${sortedRecommendations.length} uygun işletme`
                          : sortedRecommendations.length > 0
                          ? `${sortedRecommendations.length} uygun işletme`
                          : "Konum gerekebilir"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Yalnız gerçek hizmet eşleşmeleri
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {!locationComplete &&
                sortedRecommendations.length === 0 && (
                <div className="mx-auto mt-8 max-w-3xl">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center shadow-soft sm:p-8">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <MapPin
                        className="size-6"
                        aria-hidden="true"
                      />
                    </div>

                    <h3 className="mt-4 font-display text-2xl font-bold">
                      Yakınındaki işletmelere bakalım
                    </h3>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                      Seçtiğin kriterlere uygun işletme bulamadık.
                      Konumunu paylaşarak sana yakın işletmelerde tekrar arayalım.
                    </p>

                    <button
                      type="button"
                      onClick={requestDeviceLocation}
                      disabled={locating}
                      className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      <MapPin
                        className="size-4"
                        aria-hidden="true"
                      />
                      {locating
                        ? "Konumun alınıyor..."
                        : "Konumumu Kullan"}
                    </button>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setShowManualLocation((value) => !value)
                        }
                        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {showManualLocation
                          ? "Manuel konum seçimini kapat"
                          : "Konumu kendim seçmek istiyorum"}
                      </button>
                    </div>

                    {locationMessage && (
                      <p className="mx-auto mt-4 max-w-xl rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                        {locationMessage}
                      </p>
                    )}
                  </div>

                  {showManualLocation && (
                    <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
                      <div className="mb-4">
                        <h4 className="font-display text-lg font-bold">
                          İl ve ilçeni seç
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Cihaz konumunu kullanmak istemiyorsan konumunu
                          manuel olarak belirleyebilirsin.
                        </p>
                      </div>

                      <LocationSearch
                        initialCity={city}
                        initialDistrict={district}
                        onSearch={applyLocation}
                      />
                    </div>
                  )}
                </div>
              )}
              {(locationComplete ||
                sortedRecommendations.length > 0) && (
                <>
                  <div className="mt-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                      <h2 className="font-display text-2xl font-bold">
                        Sana uygun işletmeler
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {sortedRecommendations.length > 0
                          ? `İhtiyacına uygun ${sortedRecommendations.length} işletme listelendi.`
                          : `${understoodLocation} bölgesinde bu hizmeti veren uygun bir işletme bulunamadı.`}
                      </p>
                    </div>

                    {sortedRecommendations.length > 1 && (
                      <label className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          Sıralama
                        </span>

                        <div className="relative">
                          <select
                            value={sortMode}
                            onChange={(event) =>
                              setSortMode(
                                event.target
                                  .value as SortMode,
                              )
                            }
                            className="h-10 appearance-none rounded-xl border border-border bg-background py-0 pl-4 pr-10 text-sm outline-none focus:border-primary"
                          >
                            <option value="best">
                              En uygun
                            </option>
                            <option value="rating">
                              En yüksek puan
                            </option>
                            <option value="experience">
                              En deneyimli
                            </option>
                          </select>

                          <ChevronDown
                            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                      </label>
                    )}
                  </div>

                  {sortedRecommendations.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
                      <Search
                        className="mx-auto size-8 text-primary"
                        aria-hidden="true"
                      />

                      <h3 className="mt-4 font-display text-xl font-semibold">
                        Bu bölgede henüz uygun işletme yok
                      </h3>

                      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                        {understoodLocation} bölgesinde{" "}
                        <strong className="font-semibold text-foreground">
                          {understoodService}
                        </strong>{" "}
                        hizmeti veren yayınlanmış bir işletme bulunamadı.
                      </p>

                      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-primary/20 bg-primary/5 p-5">
                        <h4 className="font-display text-lg font-bold">
                          Talep oluşturalım mı?
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          İstersen bu ihtiyacı takip edelim. Uygun bir işletme
                          platforma eklendiğinde ileride sana haber verebiliriz.
                        </p>

                        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                          <Link
                            href={`/ihtiyac-olustur?${new URLSearchParams({
                              ihtiyac: q,
                              kategori:
                                recommendationData.understanding.categorySlug ??
                                category ??
                                "",
                              hizmet:
                                recommendationData.understanding.serviceSlug ??
                                service ??
                                "",
                              il:
                                recommendationData.location.citySlug ??
                                city ??
                                "",
                              ilce:
                                recommendationData.location.districtSlug ??
                                district ??
                                "",
                            }).toString()}`}
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                          >
                            Talep Oluştur
                          </Link>

                          <button
                            type="button"
                            onClick={clearSearch}
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-medium transition hover:bg-muted"
                          >
                            Şimdilik İstemiyorum
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 md:gap-2 lg:gap-3">
                      {sortedRecommendations.map(
                        (provider, index) => (
                          <article
                            key={provider.id}
                            className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
                          >
                            {/* smart-provider-image-v1 */}
                            <div className="relative h-32 overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-cream to-background">
                              <img
                                src={`${apiBaseUrl}/api/providers/${provider.id}/image`}
                                alt={`${provider.businessName} işletme görseli`}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />

                              {index === 0 && (
                                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">
                                  <BadgeCheck
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  En Uygun
                                </span>
                              )}


                              {provider.reviewCount >
                                0 && (
                                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold">
                                  <Star
                                    className="size-3.5 fill-primary text-primary"
                                    aria-hidden="true"
                                  />
                                  {provider.averageRating.toFixed(
                                    1,
                                  )}
                                  <span className="font-normal text-muted-foreground">
                                    (
                                    {
                                      provider.reviewCount
                                    }
                                    )
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="p-4">
                              <div className="text-xs font-medium text-primary">
                                {serviceMatchLabel(
                                  provider.matchLevel,
                                )}
                              </div>

                              <h3 className="mt-1 font-display text-lg font-bold">
                                {provider.businessName}
                              </h3>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin
                                  className="size-3.5 text-primary"
                                  aria-hidden="true"
                                />
                                {formatSlug(
                                  provider.citySlug,
                                )}{" "}
                                /{" "}
                                {formatSlug(
                                  provider.districtSlug,
                                )}
                              </div>

                              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                {
                                  provider.shortDescription
                                }
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                  {understoodService}
                                </span>

                                {provider.experienceYears !==
                                  null &&
                                  provider.experienceYears >
                                    0 && (
                                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                      {
                                        provider.experienceYears
                                      }
                                      + yıl deneyim
                                    </span>
                                  )}

                                {provider.onsiteService && (
                                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                    Yerinde servis
                                  </span>
                                )}

                                {provider.emergencyService && (
                                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                    Acil servis
                                  </span>
                                )}
                              </div>

                              {provider.reasons.length >
                                0 && (
                                <div className="mt-4 rounded-xl bg-primary/5 p-3">
                                  <div className="text-xs font-semibold text-primary">
                                    Neden bu işletme?
                                  </div>

                                  <div className="mt-2 space-y-1.5">
                                    {provider.reasons
                                      .slice(0, 4)
                                      .map(
                                        (reason) => (
                                          <div
                                            key={
                                              reason
                                            }
                                            className="flex items-start gap-2 text-xs text-muted-foreground"
                                          >
                                            <Check
                                              className="mt-0.5 size-3.5 shrink-0 text-green-600"
                                              aria-hidden="true"
                                            />
                                            <span>
                                              {reasonText(
                                                reason,
                                              )}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                  </div>
                                </div>
                              )}

                              <div className="mt-3 grid grid-cols-2 gap-1.5">
                                <Link
                                  href={`/isletme/${provider.slug}`}
                                  className="inline-flex min-w-0 h-9 items-center justify-center rounded-lg border border-border bg-background px-2 text-xs font-medium transition hover:bg-muted"
                                >
                                  Detayları Gör
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const contactParams =
                                      new URLSearchParams({
                                        contact: "1",
                                      });

                                    const trackedNeedId =
                                      searchParams.get("needId");
                                    const searchText =
                                      searchParams.get("q");

                                    if (trackedNeedId) {
                                      contactParams.set(
                                        "needId",
                                        trackedNeedId,
                                      );
                                    }

                                    if (searchText) {
                                      contactParams.set(
                                        "q",
                                        searchText,
                                      );
                                    }

                                    const providerUrl =
                                      `/isletme/${provider.slug}?${contactParams.toString()}`;

                                    if (getAccessToken()) {
                                      router.push(providerUrl);
                                      return;
                                    }

                                    router.push(
                                      `/giris?returnUrl=${encodeURIComponent(
                                        providerUrl,
                                      )}`,
                                    );
                                  }}
                                  className="inline-flex min-w-0 h-9 items-center justify-center gap-1 rounded-lg bg-primary px-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                                >
                                  İletişime Geç
                                  <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                </button>
                              </div>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

        {!loading &&
          !error &&
          !smartMode &&
          providers.length === 0 && (
            <div className="space-y-4">
              {(city || district) && (
                <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-soft sm:p-6">
                  <div className="mb-4">
                    <h2 className="font-display text-2xl font-bold">
                      Yakınımda kim var?
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                      İl ve ilçeni seç, bölgedeki hizmet verenleri listeleyelim.
                    </p>
                  </div>

                  <LocationSearch
                    initialCity={city}
                    initialDistrict={district}
                    onSearch={applyLocation}
                  />
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
                <Search
                  className="mx-auto size-8 text-primary"
                  aria-hidden="true"
                />

                <h2 className="mt-4 font-display text-xl font-semibold">
                  Bir ihtiyacını yaz
                </h2>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                  Yukarıdaki arama alanına ihtiyacını kendi
                  cümlelerinle yaz. Sana uygun hizmeti ve
                  işletmeleri bulalım.
                </p>
              </div>
            </div>
          )}

        {!loading &&
          !error &&
          !smartMode &&
          providers.length > 0 && (
            <>
              <div className="mb-5">
                <h2 className="font-display text-2xl font-semibold">
                  İşletmeler
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {providers.length} işletme bulundu
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 md:gap-2 lg:gap-3">
                {providers
                  .slice(0, visibleProviderCount)
                  .map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                    />
                  ))}
              </div>

              <div className="mt-7 flex justify-center">
                {providers.length > visibleProviderCount ? (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleProviderCount((count) => count + 16)
                    }
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-200 bg-white px-6 py-2.5 text-sm font-bold text-orange-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
                  >
                    Diğer İşletmeler
                  </button>
                ) : providers.length > 16 ? (
                  <button
                    type="button"
                    onClick={() => setVisibleProviderCount(16)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-6 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                  >
                    İlk 16 İşletmeye Dön
                  </button>
                ) : null}
              </div>
            </>
          )}
      </section>
    </SiteLayout>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <section className="section-shell py-10 sm:py-14">
            <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
          </section>
        </SiteLayout>
      }
    >
      <ExplorePageContent />
    </Suspense>
  );
}