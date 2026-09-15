"use client";

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
        const [accountResponse, locationsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/locations`, {
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

        if (active) {
          setUser(accountData);
          setCities(locationData);
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
      <div className="section-shell flex justify-end pt-7 sm:pt-8">
        <div className="w-full md:w-1/2 md:max-w-[520px]">
          <EditableProviderImage />
        </div>
      </div>
      <section className="section-shell py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Hesabım
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Hesap bilgilerini yönet, doğrulama durumunu kontrol et.
            </p>
          </div>

          {loading && (
            <div className="mt-8 h-80 animate-pulse rounded-2xl border border-border bg-card" />
          )}

          {!loading && !user && (
            <div className="mt-8 rounded-2xl border border-border bg-card p-8 shadow-soft">
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

              <div className="mt-8 grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-soft lg:grid-cols-[0.95fr_1.55fr] lg:p-8">
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-xl font-semibold">
                        Hesap Bilgilerim
                      </h2>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startEditing}
                      >
                        <Pencil className="mr-2 size-4" aria-hidden="true" />
                        Düzenle
                      </Button>
                    </div>

                    <dl className="mt-6 space-y-5">
                      <InfoRow
                        icon={<UserRound className="size-4" />}
                        label="Ad Soyad"
                        value={user.displayName}
                      />
                      <InfoRow
                        icon={<Mail className="size-4" />}
                        label="E-posta"
                        value={user.email}
                      />
                      <InfoRow
                        icon={<Phone className="size-4" />}
                        label="Telefon"
                        value={user.phoneNumber || "Telefon bilgisi yok"}
                      />
                      <InfoRow
                        icon={<MapPin className="size-4" />}
                        label="Konum"
                        value={locationLabel}
                      />
                      <InfoRow
                        icon={<ShieldCheck className="size-4" />}
                        label="Rol"
                        value={
                          user.role === "provider"
                            ? "İşletme"
                            : user.role === "admin"
                              ? "Admin"
                              : "Kullanıcı"
                        }
                      />
                      <InfoRow
                        icon={<CalendarDays className="size-4" />}
                        label="Kayıt Tarihi"
                        value={formatDate(user.createdAtUtc)}
                      />
                    </dl>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    {user.role === "provider" && (
                      <Link
                        href="/panel"
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                      >
                        İşletme Paneli
                      </Link>
                    )}

                    {user.role !== "provider" && user.role !== "admin" && (
                      <Link
                        href="/kayit?hesap=isletme"
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                      >
                        İşletme Olmak İstiyorum
                      </Link>
                    )}
                    {user.role === "admin" && (
                      <Link
                        href="/admin/isletmeler"
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                      >
                        Admin Paneli
                      </Link>
                    )}

                    <Button type="button" variant="outline" onClick={startEditing}>
                      <Pencil className="mr-2 size-4" aria-hidden="true" />
                      Düzenle
                    </Button>

                    <Button type="button" variant="outline" onClick={logout}>
                      Çıkış Yap
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  <VerificationCard
                    icon={<Mail className="size-5" aria-hidden="true" />}
                    title="E-posta Doğrulama"
                    description="Hesabının güvenliği için e-posta adresini doğrula."
                    destination={user.email}
                    verified={user.emailVerified}
                    href={buildVerificationUrl(user, "email")}
                    verifiedLabel="E-posta doğrulandı"
                    buttonLabel="E-posta Doğrula"
                  />

                  <VerificationCard
                    icon={<Phone className="size-5" aria-hidden="true" />}
                    title="Telefon Doğrulama"
                    description="Daha güvenli bir deneyim için telefon numaranı doğrula."
                    destination={user.phoneNumber ?? "Telefon bilgisi yok"}
                    verified={user.phoneVerified}
                    href={buildVerificationUrl(user, "phone")}
                    verifiedLabel="Telefon doğrulandı"
                    buttonLabel="Telefon Doğrula"
                  />

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <div className="flex items-start gap-3">
                      <ShieldCheck
                        className="mt-0.5 size-5 shrink-0 text-blue-600"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-semibold">Neden doğrulama yapmalıyım?</p>
                        <p className="mt-1 leading-6 text-blue-800">
                          {user.role === "provider"
                            ? "İşletme profilinin yayına alınabilmesi ve Doğrulanmış İşletme rozeti alabilmesi için e-posta ve telefon doğrulamalarının ikisi de tamamlanmalıdır."
                            : "İhtiyaç talebi oluşturabilmek için e-posta veya telefon doğrulamalarından en az birini tamamlaman yeterlidir."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-orange-50 text-primary">
                      <ShieldCheck className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold">
                        Kullanıcı Hesabı
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Siteyi hemen kullanmaya başlayabilirsin.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-950">
                    İhtiyaç talebi oluştururken e-posta veya telefon doğrulamasından
                    <strong> en az biri yeterlidir.</strong>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-orange-50 text-primary">
                      <BadgeCheck className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold">
                        İşletme Hesabı
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Doğrulama, işletme güveninin temelidir.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    İşletmenin yayına alınması için <strong>e-posta ve telefon</strong>
                    doğrulamalarının ikisi de tamamlanmalıdır. Admin onayı sonrası
                    “Doğrulanmış İşletme” rozeti görünür.
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