"use client";

import BusinessPhotoManager from "@/components/account/BusinessPhotoManager";
import BusinessAccountManager from "@/components/account/BusinessAccountManager";
import {
  BadgeCheck,
  CalendarDays,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { EditableProviderImage } from "@/components/site/EditableProviderImage";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
  type AuthUser,
} from "@/lib/auth";

type District = {
  id: string;
  name: string;
  slug: string;
};

type City = {
  id: string;
  name: string;
  slug: string;
  districts: District[];
};

type UpdateProfileResponse = {
  message: string;
  phoneVerificationReset: boolean;
  user: AuthUser;
};

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isTeknonetAccount, setIsTeknonetAccount] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const token = getAccessToken();

      if (!token) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setUser(getStoredUser());

      try {
        const [accountResponse, locationsResponse, providerResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/locations`, {
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/provider-panel/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
        ]);

        if (accountResponse.status === 401) {
          clearAuth();

          if (active) {
            setUser(null);
          }

          return;
        }

        if (!accountResponse.ok) {
          throw new Error("Hesap bilgileri alınamadı.");
        }

        const accountData = (await accountResponse.json()) as AuthUser;

        let locationData: City[] = [];

        if (locationsResponse.ok) {
          locationData = (await locationsResponse.json()) as City[];
        }

        let teknonetAccount = false;

        if (providerResponse.ok) {
          const providerData = (await providerResponse.json()) as {
            businessName?: string;
          };

          teknonetAccount =
            providerData.businessName
              ?.toLocaleLowerCase("tr-TR")
              .includes("teknonet") ?? false;
        }

        if (active) {
          setUser(accountData);
          setCities(locationData);
          setIsTeknonetAccount(teknonetAccount);
          updateStoredUser(accountData);
        }
      } catch {
        if (active) {
          setError("Hesap bilgileri yüklenemedi.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, []);

  const selectedCity = useMemo(
    () => cities.find((city) => city.slug === citySlug) ?? null,
    [cities, citySlug],
  );

  const locationLabel = useMemo(() => {
    if (!user?.citySlug || !user?.districtSlug) {
      return "Konum eklenmemiş";
    }

    const city = cities.find((item) => item.slug === user.citySlug);
    const district = city?.districts.find(
      (item) => item.slug === user.districtSlug,
    );

    if (!city) {
      return `${user.citySlug} / ${user.districtSlug}`;
    }

    return `${city.name}${district ? `, ${district.name}` : ""}`;
  }, [cities, user]);

  function startEditing() {
    if (!user) {
      return;
    }

    setDisplayName(user.displayName);
    setPhoneNumber(user.phoneNumber ?? "");
    setCitySlug(user.citySlug ?? "");
    setDistrictSlug(user.districtSlug ?? "");
    setError("");
    setMessage("");
    setEditing(true);
  }

  async function saveProfile() {
    const token = getAccessToken();

    if (!token) {
      router.push("/giris?returnUrl=/hesabim");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          phoneNumber,
          citySlug,
          districtSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const firstFieldError =
          data?.errors &&
          Object.values(data.errors).flat().find((value) => Boolean(value));

        setError(
          String(
            firstFieldError ??
              data?.message ??
              "Profil bilgileri güncellenemedi.",
          ),
        );
        return;
      }

      const result = data as UpdateProfileResponse;

      // Kayit basarili olur olmaz duzenleme penceresini kapat.
      setEditing(false);

      // Ekrandaki ve localStorage'daki hesap bilgisini yenile.
      setUser(result.user);
      updateStoredUser(result.user);
      setMessage(result.message);

      // Hesabim ekraninda kal ve sunucudan gelen son durumu yeniden yukle.
      router.replace("/hesabim");
      router.refresh();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearAuth();
    router.push("/");
    router.refresh();
  }

  return (
    <SiteLayout>

      <section className="section-shell pb-10 pt-1 sm:pb-12 sm:pt-1">
        <div className="mx-auto w-full max-w-5xl">
          <div>
<section className={`mb-3 grid items-start gap-4 ${isTeknonetAccount ? "xl:grid-cols-[240px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]"}`}>
  <div className="pt-1">
    <h1 className="font-display text-4xl font-black tracking-tight text-slate-950">Hesabım</h1>
    <p className="mt-2 max-w-[220px] text-sm leading-6 text-slate-500">
      İşletme bilgilerinizi buradan yönetebilir, profilinizi güncelleyebilirsiniz.
    </p>
  </div>
  <BusinessPhotoManager />
</section>


          </div>

          {loading && (
            <div className="mt-2 h-80 animate-pulse rounded-2xl border border-border bg-card" />
          )}

          {!loading && !user && (
            <div className="mt-2 rounded-2xl border border-border bg-card p-8 shadow-soft">
              <h2 className="font-display text-xl font-semibold">
                Oturum açık değil
              </h2>

              <p className="mt-2 text-muted-foreground">
                Hesap bilgilerini görmek için giriş yap.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/giris"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Giriş Yap
                </Link>

                <Link
                  href="/kayit"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
                >
                  Kayıt Ol
                </Link>
              </div>
            </div>
          )}

          {!loading && user && (
            <>
              {message && (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {message}
                </div>
              )}

              {error && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div id="hesabim-yonetim-grid" className={`mt-1 grid items-start gap-4 ${isTeknonetAccount ? "xl:grid-cols-[240px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]"}`}>
                <aside className={isTeknonetAccount ? "hidden xl:block" : "hidden lg:block"}>
                  <nav className="sticky top-24 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <a href="#genel-bilgiler" className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-600"><span>Genel Bilgiler</span><span>›</span></a>
                    <a href="#isletme-bilgileri" className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">İşletme Bilgileri</a>
                    <a href="#konum-adres" className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Konum ve Adres</a>
                    <a href="#isletme-fotograflari" className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Fotoğraflar</a>
                    <a href="#hizmetler-kategoriler" className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Hizmetler ve Kategoriler</a>
                    <a href="#calisma-saatleri" className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Çalışma Saatleri</a>
                    <a href="#sosyal-medya" className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Sosyal Medya</a>
                    <a href="#guvenlik" className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Güvenlik</a>
                  </nav>
                </aside>
                <div id="genel-bilgiler" className="min-w-0 scroll-mt-24 space-y-4">
                  <BusinessAccountManager />
              <div id="guvenlik" className="mt-4 grid gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="size-5" aria-hidden="true" />
                    </div>
                    <h2 className="font-display text-lg font-bold text-slate-900">Doğrulama Durumu</h2>
                  </div>
                  <div className="mt-5 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className={user.emailVerified ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                          {user.emailVerified ? "E-posta doğrulandı" : "E-posta doğrulanmadı"}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-600">{user.email}</p>
                      </div>
                      <Link href={buildVerificationUrl(user, "email")} className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50">
                        {user.emailVerified ? "Değiştir" : "Doğrula"}
                      </Link>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className={user.phoneVerified ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                          {user.phoneVerified ? "Telefon doğrulandı" : "Telefon doğrulanmadı"}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-600">{user.phoneNumber || "Telefon bilgisi yok"}</p>
                      </div>
                      <Link href={buildVerificationUrl(user, "phone")} className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50">
                        {user.phoneVerified ? "Değiştir" : "Doğrula"}
                      </Link>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-50 text-primary">
                        <BadgeCheck className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h2 className="font-display text-lg font-bold text-slate-900">Hesap Durumu</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          İşletme hesabınız aktif olarak yayınlanmaktadır. Bilgilerinizi güncel tutarak daha fazla müşteriye ulaşabilirsiniz.
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Aktif</span>
                  </div>
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => document.getElementById("isletme-bilgileri")?.scrollIntoView({ behavior: "smooth" })} className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
                      Bilgileri Düzenle
                    </button>
                    <button type="button" onClick={logout} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-slate-50">
                      Çıkış Yap
                    </button>
                  </div>
                </section>
              </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {editing && user && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Hesap Bilgileri
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  Bilgilerini Düzenle
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setEditing(false)}
                className="grid size-9 place-items-center rounded-full border border-border"
                aria-label="Kapat"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Ad Soyad</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  autoComplete="name"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">E-posta</span>
                <input
                  value={user.email}
                  readOnly
                  disabled
                  className="h-11 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
                />
                <span className="text-xs text-muted-foreground">
                  E-posta değişikliği güvenlik nedeniyle ayrı bir doğrulama akışıyla yapılacaktır.
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Telefon</span>
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  inputMode="tel"
                  autoComplete="tel"
                />
                <span className="text-xs text-muted-foreground">
                  Telefon numarası değişirse telefon doğrulaması sıfırlanır.
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">İl</span>
                <select
                  value={citySlug}
                  onChange={(event) => {
                    setCitySlug(event.target.value);
                    setDistrictSlug("");
                  }}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">İl seçin</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">İlçe</span>
                <select
                  value={districtSlug}
                  onChange={(event) => setDistrictSlug(event.target.value)}
                  disabled={!selectedCity}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                >
                  <option value="">İlçe seçin</option>
                  {(selectedCity?.districts ?? []).map((district) => (
                    <option key={district.id} value={district.slug}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Vazgeç
              </Button>

              <Button
                type="button"
                onClick={() => void saveProfile()}
                disabled={saving}
              >
                {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}
            
      </SiteLayout>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-all font-semibold">{value}</dd>
      </div>
    </div>
  );
}

function VerificationCard({
  icon,
  title,
  description,
  destination,
  verified,
  href,
  verifiedLabel,
  buttonLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  destination: string;
  verified: boolean;
  href: string;
  verifiedLabel: string;
  buttonLabel: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        verified
          ? "border-green-200 bg-green-50/60"
          : "border-border bg-background"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
              verified
                ? "bg-green-100 text-green-700"
                : "bg-orange-50 text-primary"
            }`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
            <p className="mt-2 break-all rounded-lg bg-background/80 px-3 py-2 text-sm font-medium">
              {destination}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          {verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              {verifiedLabel}
            </span>
          ) : (
            <>
              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                Doğrulanmadı
              </span>

              <Link
                href={href}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {buttonLabel}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function buildVerificationUrl(
  user: AuthUser,
  channel: "email" | "phone",
) {
  const params = new URLSearchParams({
    userId: user.id,
    email: user.email,
    phone: user.phoneNumber ?? "",
    returnUrl: "/hesabim",
    channel,
  });

  return `/dogrula?${params.toString()}`;
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}


