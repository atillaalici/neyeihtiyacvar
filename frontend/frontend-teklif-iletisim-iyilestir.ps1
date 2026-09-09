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

$authMenu = @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  clearAuth,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";

export function AuthMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    function sync() {
      const token = getAccessToken();
      setUser(token ? getStoredUser() : null);
    }

    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("auth-changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth-changed", sync);
    };
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/");
    router.refresh();
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.role === "user" && (
          <Link
            href="/taleplerim"
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Taleplerim
          </Link>
        )}

        {user.role === "provider" && (
          <Link
            href="/panel"
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            İşletme Paneli
          </Link>
        )}

        <Link
          href="/hesabim"
          className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          {user.displayName}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Çıkış
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/giris"
        className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        Giriş Yap
      </Link>

      <Link
        href="/kayit"
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Kayıt Ol
      </Link>
    </div>
  );
}
'@

$taleplerim = @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { clearAuth, getAccessToken } from "@/lib/auth";

type MyNeed = {
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
  offerCount: number;
};

type Offer = {
  id: string;
  needRequestId: string;
  providerId: string;
  providerSlug: string;
  businessName: string;
  shortDescription: string;
  publicPhone: string | null;
  publicWhatsapp: string | null;
  message: string;
  price: number | null;
  status: "pending" | "accepted" | "rejected";
  createdAtUtc: string;
};

function statusLabel(status: Offer["status"]) {
  if (status === "accepted") return "Kabul Edildi";
  if (status === "rejected") return "Reddedildi";
  return "Bekliyor";
}

function statusClass(status: Offer["status"]) {
  if (status === "accepted")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "rejected")
    return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function phoneHref(value: string | null) {
  if (!value) return undefined;
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length < 10 || digits.length > 15) return undefined;
  return `tel:${digits}`;
}

function whatsappHref(value: string | null) {
  if (!value) return undefined;

  let digits = value.replace(/[^0-9]/g, "");

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `90${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) return undefined;

  return `https://wa.me/${digits}`;
}

export default function MyNeedsPage() {
  const router = useRouter();

  const [needs, setNeeds] = useState<MyNeed[]>([]);
  const [offersByNeed, setOffersByNeed] = useState<Record<string, Offer[]>>({});
  const [loading, setLoading] = useState(true);
  const [workingOfferId, setWorkingOfferId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadData() {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const needsResponse = await fetch(`${apiBaseUrl}/api/my-needs`, {
        headers,
        cache: "no-store",
      });

      if (needsResponse.status === 401) {
        clearAuth();
        router.replace("/giris");
        return;
      }

      if (!needsResponse.ok) {
        throw new Error("Talepler alınamadı.");
      }

      const needsData = (await needsResponse.json()) as MyNeed[];
      setNeeds(needsData);

      const offerEntries = await Promise.all(
        needsData.map(async (need) => {
          const response = await fetch(
            `${apiBaseUrl}/api/my-needs/${need.id}/offers`,
            {
              headers,
              cache: "no-store",
            },
          );

          if (!response.ok) {
            return [need.id, []] as const;
          }

          return [
            need.id,
            (await response.json()) as Offer[],
          ] as const;
        }),
      );

      setOffersByNeed(Object.fromEntries(offerEntries));
    } catch {
      setError("Talepler ve teklifler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function actOnOffer(
    needId: string,
    offerId: string,
    action: "accept" | "reject",
  ) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    setError("");
    setWorkingOfferId(offerId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/my-needs/${needId}/offers/${offerId}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "İşlem tamamlanamadı.");
        return;
      }

      setLoading(true);
      await loadData();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWorkingOfferId(null);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Taleplerim
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Oluşturduğun ihtiyaç taleplerini ve işletmelerden gelen teklifleri
            buradan takip edebilirsin.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {needs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h2 className="font-display text-xl font-semibold">
              Henüz hesabına bağlı talep yok
            </h2>

            <p className="mt-2 text-muted-foreground">
              Yeni bir ihtiyaç oluşturduğunda burada görünecek.
            </p>

            <Link
              href="/ihtiyac-olustur"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              İhtiyaç Oluştur
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {needs.map((need) => {
              const offers = offersByNeed[need.id] ?? [];

              return (
                <article
                  key={need.id}
                  className="rounded-2xl border border-border bg-card p-6 shadow-soft"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="font-display text-xl font-semibold">
                        {need.title}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {need.description}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      {offers.length} teklif
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-2.5 py-1">
                      {need.category}
                    </span>

                    <span className="rounded-full border border-border px-2.5 py-1">
                      {need.city} / {need.district}
                    </span>

                    <span className="rounded-full border border-border px-2.5 py-1">
                      {new Date(need.createdAtUtc).toLocaleString("tr-TR")}
                    </span>
                  </div>

                  <div className="mt-6 border-t border-border pt-5">
                    <h3 className="font-semibold">Gelen Teklifler</h3>

                    {offers.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Henüz teklif gelmedi.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-4">
                        {offers.map((offer) => {
                          const tel = phoneHref(offer.publicPhone);
                          const whatsapp = whatsappHref(offer.publicWhatsapp);

                          return (
                            <div
                              key={offer.id}
                              className="rounded-xl border border-border p-4"
                            >
                              <div className="flex flex-col justify-between gap-2 sm:flex-row">
                                <div>
                                  <Link
                                    href={`/isletme/${offer.providerSlug}`}
                                    className="font-semibold hover:underline"
                                  >
                                    {offer.businessName}
                                  </Link>

                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {offer.shortDescription}
                                  </p>
                                </div>

                                <span
                                  className={`h-fit rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                                    offer.status,
                                  )}`}
                                >
                                  {statusLabel(offer.status)}
                                </span>
                              </div>

                              <p className="mt-4 text-sm leading-6">
                                {offer.message}
                              </p>

                              {offer.price !== null && (
                                <div className="mt-3 text-lg font-bold">
                                  {offer.price.toLocaleString("tr-TR")} TL
                                </div>
                              )}

                              {offer.status === "pending" && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    disabled={workingOfferId === offer.id}
                                    onClick={() =>
                                      void actOnOffer(
                                        need.id,
                                        offer.id,
                                        "accept",
                                      )
                                    }
                                  >
                                    Kabul Et
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={workingOfferId === offer.id}
                                    onClick={() =>
                                      void actOnOffer(
                                        need.id,
                                        offer.id,
                                        "reject",
                                      )
                                    }
                                  >
                                    Reddet
                                  </Button>
                                </div>
                              )}

                              {offer.status === "accepted" && (
                                <div className="mt-4 space-y-3">
                                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                    Teklifi kabul ettin. Artık işletmeyle iletişime geçebilirsin.
                                  </div>

                                  {(tel || whatsapp) && (
                                    <div className="flex flex-wrap gap-2">
                                      {tel && (
                                        <a
                                          href={tel}
                                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
                                        >
                                          <Phone className="size-4" />
                                          Telefon Et
                                        </a>
                                      )}

                                      {whatsapp && (
                                        <a
                                          href={whatsapp}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                        >
                                          <MessageCircle className="size-4" />
                                          WhatsApp
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {offer.status === "rejected" && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                  Bu teklifi reddettin.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
'@

$panelPath = Join-Path $root "src\app\panel\page.tsx"
$panel = Get-Content -Raw -Encoding UTF8 $panelPath

$panel = $panel.Replace(
    '<span className="text-xs font-medium uppercase text-muted-foreground">' + "`r`n" +
    '                          {offer.status}' + "`r`n" +
    '                        </span>',
    '<span' + "`r`n" +
    '                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${' + "`r`n" +
    '                            offer.status === "accepted"' + "`r`n" +
    '                              ? "border-green-200 bg-green-50 text-green-700"' + "`r`n" +
    '                              : offer.status === "rejected"' + "`r`n" +
    '                                ? "border-red-200 bg-red-50 text-red-700"' + "`r`n" +
    '                                : "border-amber-200 bg-amber-50 text-amber-700"' + "`r`n" +
    '                          }`}' + "`r`n" +
    '                        >' + "`r`n" +
    '                          {offer.status === "accepted"' + "`r`n" +
    '                            ? "Kabul Edildi"' + "`r`n" +
    '                            : offer.status === "rejected"' + "`r`n" +
    '                              ? "Reddedildi"' + "`r`n" +
    '                              : offer.status === "withdrawn"' + "`r`n" +
    '                                ? "Geri Çekildi"' + "`r`n" +
    '                                : "Bekliyor"}' + "`r`n" +
    '                        </span>'
)

$panel = $panel.Replace(
    '{offer.price !== null && (' + "`r`n" +
    '                        <div className="mt-2 font-semibold">' + "`r`n" +
    '                          {offer.price.toLocaleString("tr-TR")} TL' + "`r`n" +
    '                        </div>' + "`r`n" +
    '                      )}',
    '{offer.price !== null && (' + "`r`n" +
    '                        <div className="mt-2 font-semibold">' + "`r`n" +
    '                          {offer.price.toLocaleString("tr-TR")} TL' + "`r`n" +
    '                        </div>' + "`r`n" +
    '                      )}' + "`r`n" +
    '' + "`r`n" +
    '                      {offer.status === "accepted" && (' + "`r`n" +
    '                        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">' + "`r`n" +
    '                          Müşteri teklifinizi kabul etti.' + "`r`n" +
    '                        </div>' + "`r`n" +
    '                      )}'
)

Write-Utf8NoBom "$root\src\components\site\AuthMenu.tsx" $authMenu
Write-Utf8NoBom "$root\src\app\taleplerim\page.tsx" $taleplerim
Write-Utf8NoBom $panelPath $panel

Write-Host ""
Write-Host "Teklif durumlari ve iletisim akisi guncellendi." -ForegroundColor Green
Write-Host ""
Write-Host "Yapilanlar:" -ForegroundColor Cyan
Write-Host "  Navbar: normal kullanici icin Taleplerim"
Write-Host "  Navbar: provider icin Isletme Paneli"
Write-Host "  ACCEPTED/PENDING/REJECTED Turkcelestirildi"
Write-Host "  Kabul edilen teklifte Telefon / WhatsApp acildi"
Write-Host "  Isletme panelinde 'Musteri teklifinizi kabul etti' mesaji"
Write-Host "  AuthMenu Turkce karakterleri duzeltildi"
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
