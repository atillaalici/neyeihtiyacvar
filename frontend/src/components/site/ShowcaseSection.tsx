"use client";

import { apiBaseUrl } from "@/lib/api";

import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const categories = [
  { title: "Usta & Tamir", image: "/vitrin/usta-tamir.png", href: "/kategoriler/usta-tamir" },
  { title: "Ev & Yaşam", image: "/vitrin/ev-yasam.png", href: "/kategoriler/ev-yasam" },
  { title: "Nakliye & Taşıma", image: "/vitrin/nakliye-tasima.png", href: "/kategoriler/nakliye-tasima" },
  { title: "Teknoloji", image: "/vitrin/teknoloji.png", href: "/kategoriler/teknoloji" },
  { title: "Otomotiv", image: "/vitrin/otomotiv.png", href: "/kategoriler/otomotiv" },
  { title: "Eğitim", image: "/vitrin/egitim.png", href: "/kategoriler/egitim" },
  { title: "Organizasyon", image: "/vitrin/organizasyon.png", href: "/kategoriler/organizasyon" },
  { title: "Diğer", image: "/vitrin/diger.png", href: "/kategoriler" },
];

type FeaturedProvider = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription: string;
  categorySlug: string;
  serviceSlug: string;
  citySlug: string;
  districtSlug: string;
  experienceYears: number | null;
  emergencyService: boolean;
  onsiteService: boolean;
  publishedAtUtc: string | null;
  reviewCount: number;
  averageRating: number | null;
};

type FeaturedProvidersResponse = {
  count: number;
  totalEligible: number;
  rotationActive: boolean;
  providers: FeaturedProvider[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ??
  "http://localhost:5155";

function humanizeSlug(value: string) {
  if (!value) return "";

  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

export function ShowcaseSection() {
  const [featured, setFeatured] = useState<FeaturedProvidersResponse | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFeaturedProviders() {
      try {
        setLoadingProviders(true);
        setProviderError(null);

        const response = await fetch(`${API_BASE}/api/featured-providers`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as FeaturedProvidersResponse;
        setFeatured(data);
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Vitrin isletmeleri yuklenemedi:", error);
        setProviderError("İşletmeler şu anda yüklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setLoadingProviders(false);
        }
      }
    }

    void loadFeaturedProviders();

    return () => controller.abort();
  }, []);

  const providers = featured?.providers ?? [];

  const providerSubtitle = useMemo(() => {
    if (!featured) return "Yayındaki işletmeleri keşfet.";

    if (featured.totalEligible === 0) {
      return "Yayına alınan işletmeler burada görünecek.";
    }

    if (featured.rotationActive) {
      return `${featured.totalEligible} uygun işletme arasından güven sinyali güçlü işletmeler vitrinde.`;
    }

    return `${featured.totalEligible} uygun işletme vitrinde.`;
  }, [featured]);

  return (
    <section className="section-shell py-7 sm:py-6 sm:py-8 lg:py-10 lg:py-9">
      <div className="rounded-[28px] border border-orange-100 bg-gradient-to-b from-orange-50/70 to-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700 sm:text-xs">
              Vitrin
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Sık Aranan Hizmetler
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
              En çok ihtiyaç duyulan hizmetleri keşfet, sana uygun olanı seç.
            </p>
          </div>

          <Link
            href="/hizmetler"
            className="text-xs font-semibold text-orange-700 transition hover:text-orange-800 sm:text-sm"
          >
            Tüm hizmetleri keşfet →
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:gap-4">
          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="group block overflow-hidden rounded-[22px] border border-orange-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[1.16/1] w-full overflow-hidden bg-orange-50 p-1">
                <Image
                  src={category.image}
                  alt={category.title}
                  fill
                  sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, 25vw"
                  className="object-contain transition duration-300 group-hover:scale-[1.01]"
                />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Öne Çıkan İşletmeler
            </h2>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {providerSubtitle}
            </p>
          </div>

          <Link
            href="/kesfet"
            className="text-xs font-semibold text-orange-700 transition hover:text-orange-800 sm:text-sm"
          >
            Tüm işletmeleri gör →
          </Link>
        </div>

        {loadingProviders ? (
          <div className="mt-5 flex min-h-40 items-center justify-center rounded-2xl border border-orange-100 bg-white/70">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              İşletmeler yükleniyor...
            </div>
          </div>
        ) : providerError ? (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
            {providerError}
          </div>
        ) : providers.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-orange-200 bg-white/70 p-8 text-center">
            <Building2 className="mx-auto h-9 w-9 text-orange-500" />
            <h3 className="mt-3 font-bold">Vitrin hazırlanıyor</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aktif ve yayındaki ilk işletmeler burada otomatik olarak görünecek.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:gap-4">
            {providers.map((business, index) => (
              <article
                key={business.id}
                className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
              {/* showcase-provider-image-v6 */}
              <div className="relative h-28 w-full overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-cream to-background">
                <img
                  src={`${apiBaseUrl}/api/providers/${business.id}/image`}
                  alt={`${business.businessName} işletme görseli`}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />

                  <span className="absolute left-2 top-2 z-20 rounded-full bg-white/95 px-2 py-1 text-[10px] font-extrabold text-orange-700 shadow-sm">
                    #{index + 1} Vitrin
                  </span></div>


                <div className="p-3 sm:p-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
                      {business.businessName}
                    </h3>

                    <p className="mt-0.5 truncate text-xs font-medium text-orange-700 sm:text-sm">
                      {humanizeSlug(business.serviceSlug)}
                    </p>
                  </div>

                  {business.reviewCount > 0 && business.averageRating !== null ? (
                    <div className="mt-3 border-y border-amber-100 py-2.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <div
                          className="flex items-center gap-0.5 text-amber-500"
                          aria-label={`${business.averageRating.toLocaleString("tr-TR")} puan`}
                        >
                          {Array.from({ length: 5 }).map((_, starIndex) => (
                            <Star
                              key={starIndex}
                              className={`h-4 w-4 ${
                                starIndex < Math.round(business.averageRating ?? 0)
                                  ? "fill-current"
                                  : "text-amber-200"
                              }`}
                            />
                          ))}
                        </div>

                        <strong className="text-base font-extrabold leading-none text-slate-900">
                          {business.averageRating.toLocaleString("tr-TR", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </strong>
                      </div>

                      <p className="mt-1 text-[11px] font-semibold text-amber-800 sm:text-xs">
                        {business.reviewCount} gerçek değerlendirme
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 border-y border-orange-100 py-2.5">
                      <div className="flex items-center gap-1 text-orange-300">
                        {Array.from({ length: 5 }).map((_, starIndex) => (
                          <Star key={starIndex} className="h-4 w-4" />
                        ))}
                      </div>

                      <p className="mt-1 text-[11px] font-semibold text-orange-700 sm:text-xs">
                        Henüz değerlendirme yok
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {humanizeSlug(business.citySlug)}
                      {business.districtSlug
                        ? ` / ${humanizeSlug(business.districtSlug)}`
                        : ""}
                    </span>
                  </div>

                  {business.shortDescription ? (
                    <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
                      {business.shortDescription}
                    </p>
                  ) : null}

                  <Link
                    href={`/isletme/${business.slug}`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600 sm:text-sm"
                  >
                    İşletmeyi İncele
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm [&>*]:min-w-0 home-stats-grid grid-cols-2 sm:grid-cols-4">
        <div className="flex items-center gap-3 p-4 sm:p-5 lg:border-r lg:border-orange-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-extrabold sm:text-xl">10.000+</p>
            <p className="text-xs text-muted-foreground sm:text-sm">Kullanıcı</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-l border-orange-100 p-4 sm:p-5 lg:border-r">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-extrabold sm:text-xl">2.500+</p>
            <p className="text-xs text-muted-foreground sm:text-sm">İşletme</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-orange-100 p-4 sm:p-5 lg:border-r lg:border-t-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold sm:text-base">GÜvenli ve Şeffaf</p>
            <p className="text-xs text-muted-foreground sm:text-sm">Doğrulanmış süreç</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-l border-t border-orange-100 p-4 sm:p-5 lg:border-t-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-extrabold sm:text-xl">81 İl</p>
            <p className="text-xs text-muted-foreground sm:text-sm">Türkiye genelinde</p>
          </div>
        </div>
      </div>
    </section>
  );
}
