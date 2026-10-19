"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, CreditCard, MessageSquareText } from "lucide-react";

import { BusinessSidebar } from "@/components/panel/BusinessSidebar";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { clearAuth, getAccessToken, getStoredUser } from "@/lib/auth";

type MembershipSummary = {
  membershipId: string;
  currentPlan: {
    id: string;
    code: string;
    name: string;
    annualPrice: number;
    serviceLimit: number;
    sortOrder: number;
  };
  startsAtUtc: string;
  expiresAtUtc: string;
};

type ProviderProfile = {
  slug: string;
  businessName: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
}

function remainingDays(value: string) {
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}

export default function MembershipPanelPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [membership, setMembership] = useState<MembershipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const token = getAccessToken();
      const user = getStoredUser();

      if (!token || !user) {
        router.replace("/giris?returnUrl=/panel/uyeligim");
        return;
      }

      if (user.role !== "provider") {
        router.replace("/hesabim");
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [profileResponse, membershipResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/provider-panel/me`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/membership-selection/summary`, {
            headers,
            cache: "no-store",
          }),
        ]);

        if (!active) return;

        if (profileResponse.status === 401 || membershipResponse.status === 401) {
          clearAuth();
          router.replace("/giris?returnUrl=/panel/uyeligim");
          return;
        }

        if (!profileResponse.ok) {
          setError("İşletme bilgileri yüklenemedi.");
          return;
        }

        setProfile((await profileResponse.json()) as ProviderProfile);

        if (membershipResponse.ok) {
          const data = (await membershipResponse.json()) as MembershipSummary;
          if (active && data?.currentPlan) setMembership(data);
        } else if (membershipResponse.status !== 404) {
          setError("Üyelik bilgileri alınamadı. Lütfen tekrar deneyin.");
        }
      } catch {
        if (active) setError("Sunucuya bağlanılamadı.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [router]);

  const days = membership ? remainingDays(membership.expiresAtUtc) : null;
  const activeMembership = days !== null && days > 0;

  return (
    <SiteLayout hideFooter>
      <div className="min-h-screen bg-background lg:flex">
        {profile && (
          <BusinessSidebar
            providerSlug={profile.slug}
            businessName={profile.businessName}
          />
        )}

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <header>
              <p className="text-sm font-semibold text-muted-foreground">
                İşletme Yönetimi
              </p>
              <h1 className="mt-2 text-3xl font-bold">Üyeliğim</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Mevcut paketinizin süresini ve hizmet haklarını buradan takip edebilirsiniz.
              </p>
            </header>

            {loading ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                Üyelik bilgileri yükleniyor...
              </div>
            ) : (
              <>
                {error && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {membership ? (
                  <>
                    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CreditCard className="size-5" />
                            Mevcut Üyelik Paketim
                          </div>
                          <h2 className="mt-3 text-2xl font-bold">
                            {membership.currentPlan.name}
                          </h2>
                        </div>
                        <span className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          activeMembership
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {activeMembership ? "Aktif Üyelik" : "Süresi Dolmuş"}
                        </span>
                      </div>

                      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <Info label="Başlangıç Tarihi" value={formatDate(membership.startsAtUtc)} />
                        <Info label="Bitiş Tarihi" value={formatDate(membership.expiresAtUtc)} />
                        <Info
                          label="Kalan Süre"
                          value={days === null ? "—" : days === 0 ? "Süre doldu" : `${days} gün`}
                        />
                      </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                      <h2 className="text-xl font-bold">Paket Haklarım</h2>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/30 p-5">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Paket hizmet hakkı
                          </p>
                          <p className="mt-1 text-2xl font-bold">
                            {membership.currentPlan.serviceLimit}
                          </p>
                        </div>
                        <CalendarDays className="size-7 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Üyelik süresi sonunda otomatik yenileme yapılmaz.
                      </p>
                    </section>
                  </>
                ) : !error ? (
                  <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h2 className="text-xl font-bold">Aktif Paket Bulunamadı</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Hesabınızda görüntülenebilen bir üyelik paketi bulunmuyor.
                    </p>
                    <Link href="/uyelik" className="mt-5 inline-block rounded-xl border border-border px-5 py-3 text-sm font-semibold">
                      Üyelik Paketlerini İncele
                    </Link>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                  <div className="flex items-start gap-3">
                    <MessageSquareText className="mt-1 size-6 text-primary" />
                    <div>
                      <h2 className="text-xl font-bold">Paket Değişikliği</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Paket değişikliği talepleriniz ekibimiz tarafından değerlendirilir.
                        Otomatik paket değişikliği yapılmaz.
                      </p>
                      <Link
                        href="/iletisim"
                        className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                      >
                        Paket Değişikliği İçin İletişime Geçin
                      </Link>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </SiteLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock3 className="size-4" />
        {label}
      </div>
      <p className="mt-3 text-lg font-semibold">{value}</p>
    </div>
  );
}
