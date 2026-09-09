$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"

New-Item -ItemType Directory -Force "$root\src\app\kesfet" | Out-Null
New-Item -ItemType Directory -Force "$root\src\app\isletme\[slug]" | Out-Null
New-Item -ItemType Directory -Force "$root\src\components\site" | Out-Null
New-Item -ItemType Directory -Force "$root\src\lib" | Out-Null

@'
export type ProviderSummary = {
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
  publicationStatus: "published";
};

export type ProviderDetail = ProviderSummary & {
  description: string | null;
  additionalServices: string[];
  publicAddress: string | null;
  workingHours: string | null;
  experienceYears: number | null;
  emergencyService: boolean;
  onsiteService: boolean;
};

export function phoneHref(value: string | null) {
  if (!value) return undefined;

  const digits = value.replace(/[^0-9]/g, "");

  if (digits.length < 10 || digits.length > 15) {
    return undefined;
  }

  return `tel:${digits}`;
}

export function whatsappHref(value: string | null) {
  if (!value) return undefined;

  let digits = value.replace(/[^0-9]/g, "");

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `90${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) {
    return undefined;
  }

  return `https://wa.me/${digits}`;
}
'@ | Set-Content -Encoding UTF8 "$root\src\lib\providers.ts"

@'
import Link from "next/link";
import { MapPin, Phone, MessageCircle } from "lucide-react";

import type { ProviderSummary } from "@/lib/providers";
import { phoneHref, whatsappHref } from "@/lib/providers";

export function ProviderCard({
  provider,
}: {
  provider: ProviderSummary;
}) {
  const phone = phoneHref(provider.publicPhone);
  const whatsapp = whatsappHref(provider.publicWhatsapp);

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift">
      <div className="flex flex-col gap-4">
        <div>
          <Link
            href={`/isletme/${provider.slug}`}
            className="font-display text-xl font-semibold tracking-tight hover:text-primary"
          >
            {provider.businessName}
          </Link>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {provider.shortDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            {provider.citySlug} / {provider.districtSlug}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/isletme/${provider.slug}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Profili Gör
          </Link>

          {phone && (
            <a
              href={phone}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Phone className="size-4" aria-hidden="true" />
              Ara
            </a>
          )}

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
'@ | Set-Content -Encoding UTF8 "$root\src\components\site\ProviderCard.tsx"

@'
"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { ProviderCard } from "@/components/site/ProviderCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import type { ProviderSummary } from "@/lib/providers";

export default function ExplorePage() {
  const searchParams = useSearchParams();

  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    for (const key of ["q", "il", "ilce", "kategori", "hizmet"] as const) {
      const value = searchParams.get(key);

      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }

    return params.toString();
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadProviders() {
      setLoading(true);
      setError("");

      try {
        const url = queryString
          ? `${apiBaseUrl}/api/providers?${queryString}`
          : `${apiBaseUrl}/api/providers`;

        const response = await fetch(url, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("İşletmeler alınamadı.");
        }

        const data = (await response.json()) as ProviderSummary[];

        if (!active) {
          return;
        }

        setProviders(data);
      } catch {
        if (!active) {
          return;
        }

        setError("İşletmeler yüklenemedi. Backend bağlantısını kontrol et.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProviders();

    return () => {
      active = false;
    };
  }, [queryString]);

  const q = searchParams.get("q");
  const city = searchParams.get("il");
  const district = searchParams.get("ilce");

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-primary">
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              Keşfet
            </span>

            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Sana uygun işletmeleri keşfet
            </h1>

            <p className="max-w-2xl text-muted-foreground">
              Yayındaki işletmeleri ihtiyacına ve konumuna göre listeliyoruz.
            </p>

            {(q || city || district) && (
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {q && (
                  <span className="rounded-full border border-border bg-surface px-3 py-1.5">
                    Arama: {q}
                  </span>
                )}

                {city && (
                  <span className="rounded-full border border-border bg-surface px-3 py-1.5">
                    İl: {city}
                  </span>
                )}

                {district && (
                  <span className="rounded-full border border-border bg-surface px-3 py-1.5">
                    İlçe: {district}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && providers.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <Search className="mx-auto size-8 text-primary" aria-hidden="true" />

            <h2 className="mt-4 font-display text-xl font-semibold">
              Uygun işletme bulunamadı
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Bu filtrelerle henüz yayınlanmış bir işletme yok. Aramanı değiştirerek tekrar deneyebilirsin.
            </p>
          </div>
        )}

        {!loading && !error && providers.length > 0 && (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {providers.length} işletme bulundu
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
'@ | Set-Content -Encoding UTF8 "$root\src\app\kesfet\page.tsx"

@'
"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useParams } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import {
  phoneHref,
  type ProviderDetail,
  whatsappHref,
} from "@/lib/providers";

export default function ProviderDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      return;
    }

    let active = true;

    async function loadProvider() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/providers/${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
          },
        );

        if (response.status === 404) {
          if (active) {
            setProvider(null);
            setError("İşletme profili bulunamadı.");
          }

          return;
        }

        if (!response.ok) {
          throw new Error("İşletme profili alınamadı.");
        }

        const data = (await response.json()) as ProviderDetail;

        if (active) {
          setProvider(data);
        }
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

    void loadProvider();

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
        </section>
      </SiteLayout>
    );
  }

  if (error || !provider) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h1 className="font-display text-2xl font-bold">
              İşletme bulunamadı
            </h1>

            <p className="mt-2 text-muted-foreground">
              {error || "Bu işletme profiline ulaşılamıyor."}
            </p>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const phone = phoneHref(provider.publicPhone);
  const whatsapp = whatsappHref(provider.publicWhatsapp);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-primary">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              Yayındaki İşletme
            </span>

            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              {provider.businessName}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {provider.shortDescription}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                {provider.citySlug} / {provider.districtSlug}
              </span>

              {provider.experienceYears !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="size-4 text-primary" aria-hidden="true" />
                  {provider.experienceYears} yıl deneyim
                </span>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {phone && (
                <a
                  href={phone}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  Telefon Et
                </a>
              )}

              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            {provider.description && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <h2 className="font-display text-xl font-semibold">
                  İşletme Hakkında
                </h2>

                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {provider.description}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-xl font-semibold">
                Hizmetler
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground">
                  <Wrench className="size-3.5" aria-hidden="true" />
                  {provider.serviceSlug}
                </span>

                {provider.additionalServices.map((service) => (
                  <span
                    key={service}
                    className="rounded-full border border-border px-3 py-1.5 text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-base font-semibold">
                İşletme Bilgileri
              </h2>

              <div className="mt-4 space-y-4 text-sm">
                {provider.publicAddress && (
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="leading-6 text-muted-foreground">
                      {provider.publicAddress}
                    </span>
                  </div>
                )}

                {provider.workingHours && (
                  <div className="flex gap-3">
                    <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="leading-6 text-muted-foreground">
                      {provider.workingHours}
                    </span>
                  </div>
                )}

                {provider.emergencyService && (
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-muted-foreground">
                      Acil servis mevcut
                    </span>
                  </div>
                )}

                {provider.onsiteService && (
                  <div className="flex gap-3">
                    <BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-muted-foreground">
                      Yerinde hizmet mevcut
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
'@ | Set-Content -Encoding UTF8 "$root\src\app\isletme\[slug]\page.tsx"

Write-Host ""
Write-Host "Kesfet ve isletme detay sayfalari olusturuldu." -ForegroundColor Green
Write-Host ""
Write-Host "Olusturulan dosyalar:" -ForegroundColor Cyan
Write-Host "  src\lib\providers.ts"
Write-Host "  src\components\site\ProviderCard.tsx"
Write-Host "  src\app\kesfet\page.tsx"
Write-Host "  src\app\isletme\[slug]\page.tsx"
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
