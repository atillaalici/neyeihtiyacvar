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

$panelPage = @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock3,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";

type ProviderPanelProfile = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription: string;
  description: string | null;
  categorySlug: string;
  serviceSlug: string;
  additionalServices: string[];
  citySlug: string;
  districtSlug: string;
  publicPhone: string | null;
  publicWhatsapp: string | null;
  publicAddress: string | null;
  workingHours: string | null;
  experienceYears: number | null;
  emergencyService: boolean;
  onsiteService: boolean;
  publicationStatus: "draft" | "published" | "unpublished";
  publishedAtUtc: string | null;
  version: number;
  matchedNeedCount: number;
};

type ProviderNeed = {
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

export default function ProviderPanelPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProviderPanelProfile | null>(null);
  const [needs, setNeeds] = useState<ProviderNeed[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPanel() {
      const token = getAccessToken();
      const storedUser = getStoredUser();

      if (!token || !storedUser) {
        router.replace("/giris");
        return;
      }

      if (storedUser.role !== "provider") {
        router.replace("/hesabim");
        return;
      }

      setUser(storedUser);

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [profileResponse, needsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/provider-panel/me`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/provider-panel/needs`, {
            headers,
            cache: "no-store",
          }),
        ]);

        if (profileResponse.status === 401 || needsResponse.status === 401) {
          clearAuth();
          router.replace("/giris");
          return;
        }

        if (profileResponse.status === 404) {
          if (active) {
            setError("Bu hesaba bağlı bir işletme bulunamadı.");
          }
          return;
        }

        if (!profileResponse.ok || !needsResponse.ok) {
          throw new Error("Panel verileri alınamadı.");
        }

        const profileData =
          (await profileResponse.json()) as ProviderPanelProfile;

        const needsData =
          (await needsResponse.json()) as ProviderNeed[];

        if (!active) {
          return;
        }

        setProfile(profileData);
        setNeeds(needsData);
      } catch {
        if (active) {
          setError("İşletme paneli yüklenemedi.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPanel();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </section>
      </SiteLayout>
    );
  }

  if (error || !profile) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h1 className="font-display text-2xl font-bold">
              İşletme paneli açılamadı
            </h1>

            <p className="mt-3 text-muted-foreground">
              {error || "İşletme bilgilerine ulaşılamadı."}
            </p>

            <Link
              href="/hesabim"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Hesabıma Dön
            </Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-medium text-primary">İşletme Paneli</p>

              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                {profile.businessName}
              </h1>

              <p className="mt-3 max-w-2xl text-muted-foreground">
                İşletme profilini ve sana eşleşen ihtiyaç taleplerini buradan takip edebilirsin.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.publicationStatus === "published" && (
                <Link
                  href={`/isletme/${profile.slug}`}
                  target="_blank"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Yayındaki Profili Gör
                </Link>
              )}

              <Link
                href="/hesabim"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Hesabım
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Building2 className="size-5 text-primary" aria-hidden="true" />
              <div>
                <div className="text-sm text-muted-foreground">Profil Durumu</div>
                <div className="mt-1 font-semibold">
                  {profile.publicationStatus === "published"
                    ? "Yayında"
                    : profile.publicationStatus === "draft"
                      ? "Taslak"
                      : "Yayından Kaldırıldı"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <MessageSquareText
                className="size-5 text-primary"
                aria-hidden="true"
              />
              <div>
                <div className="text-sm text-muted-foreground">
                  Eşleşen İhtiyaç
                </div>
                <div className="mt-1 font-semibold">
                  {profile.matchedNeedCount}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <UserRound className="size-5 text-primary" aria-hidden="true" />
              <div>
                <div className="text-sm text-muted-foreground">Hesap</div>
                <div className="mt-1 font-semibold">
                  {user?.displayName ?? "Hizmet Veren"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-xl font-semibold">
                Eşleşen İhtiyaç Talepleri
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Kategori, hizmet, il ve ilçe bilgileri işletmenle birebir eşleşen talepler gösterilir.
              </p>

              {needs.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Şu anda işletmenle eşleşen ihtiyaç talebi yok.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {needs.map((need) => (
                    <article
                      key={need.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <h3 className="font-semibold">{need.title}</h3>

                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {need.description}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(need.createdAtUtc).toLocaleString("tr-TR")}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border px-2.5 py-1">
                          {need.category}
                        </span>

                        <span className="rounded-full border border-border px-2.5 py-1">
                          {need.city} / {need.district}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">
                İşletme Özeti
              </h2>

              <div className="mt-4 space-y-4 text-sm">
                <div className="flex gap-3">
                  <Wrench className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <div className="font-medium">{profile.serviceSlug}</div>
                    <div className="mt-1 text-muted-foreground">
                      {profile.categorySlug}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="text-muted-foreground">
                    {profile.citySlug} / {profile.districtSlug}
                  </div>
                </div>

                {profile.publicPhone && (
                  <div className="flex gap-3">
                    <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="text-muted-foreground">
                      {profile.publicPhone}
                    </div>
                  </div>
                )}

                {profile.workingHours && (
                  <div className="flex gap-3">
                    <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="text-muted-foreground">
                      {profile.workingHours}
                    </div>
                  </div>
                )}

                {profile.emergencyService && (
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="text-muted-foreground">
                      Acil servis mevcut
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/40 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Profil düzenleme yetkisini işletme sahibine açmadan önce admin onayı ve alan bazlı güvenlik kuralları ekleyeceğiz.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
'@

Write-Utf8NoBom "$root\src\app\panel\page.tsx" $panelPage

Write-Host ""
Write-Host "Isletme paneli frontend sayfasi hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Olusturulan dosya:" -ForegroundColor Cyan
Write-Host "  src\app\panel\page.tsx"
Write-Host ""
Write-Host "Panel sadece provider rolu olan giris yapmis hesaplar icin calisir." -ForegroundColor Yellow
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Cyan
