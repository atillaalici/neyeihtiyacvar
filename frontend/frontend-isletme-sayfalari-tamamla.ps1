$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
$routeDir = Join-Path $root "src\app\isletme\[slug]"
$pagePath = Join-Path $routeDir "page.tsx"

[System.IO.Directory]::CreateDirectory($routeDir) | Out-Null

$content = @'
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
'@

[System.IO.File]::WriteAllText(
    $pagePath,
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Eksik isletme detay sayfasi tamamlandi." -ForegroundColor Green
Write-Host "Dosya: $pagePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
