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

$needPage = @'
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

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

type NeedResponse = {
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

type MatchProvider = {
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
};

type MatchResponse = {
  requestId: string;
  matchType: string;
  count: number;
  providers: MatchProvider[];
  message?: string;
};

function toSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NeedCreatePage() {
  const searchParams = useSearchParams();
  const initialNeed = searchParams.get("ihtiyac") ?? "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [description, setDescription] = useState(initialNeed);
  const [categorySlug, setCategorySlug] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<NeedResponse | null>(null);
  const [matches, setMatches] = useState<MatchResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogs() {
      try {
        const [categoryResponse, locationResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/categories`),
          fetch(`${apiBaseUrl}/api/locations`),
        ]);

        if (!categoryResponse.ok || !locationResponse.ok) {
          throw new Error("Katalog verileri alınamadı.");
        }

        const [categoryData, locationData] = await Promise.all([
          categoryResponse.json() as Promise<Category[]>,
          locationResponse.json() as Promise<City[]>,
        ]);

        if (!cancelled) {
          setCategories(categoryData);
          setCities(locationData);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Kategori ve konum bilgileri yüklenemedi. Backend'in çalıştığından emin olun.",
          );
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    void loadCatalogs();

    return () => {
      cancelled = true;
    };
  }, []);

  const services = useMemo(() => {
    return categories.find((item) => item.slug === categorySlug)?.services ?? [];
  }, [categories, categorySlug]);

  const districts = useMemo(() => {
    return cities.find((item) => item.slug === citySlug)?.districts ?? [];
  }, [cities, citySlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(null);
    setMatches(null);

    const cleanDescription = description.trim();

    if (!cleanDescription) {
      setError("Lütfen ihtiyacını yaz.");
      return;
    }

    if (!categorySlug) {
      setError("Lütfen kategori seç.");
      return;
    }

    if (!serviceSlug) {
      setError("Lütfen hizmet seç.");
      return;
    }

    if (!citySlug) {
      setError("Lütfen il seç.");
      return;
    }

    if (!districtSlug) {
      setError("Lütfen ilçe seç.");
      return;
    }

    const title =
      cleanDescription.length > 150
        ? `${cleanDescription.slice(0, 147)}...`
        : cleanDescription;

    const token = getAccessToken();

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}/api/needs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description: cleanDescription,
          categorySlug,
          serviceSlug,
          citySlug,
          districtSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "İhtiyaç talebi oluşturulamadı.");
        return;
      }

      const created = data as NeedResponse;
      setSuccess(created);

      const matchResponse = await fetch(
        `${apiBaseUrl}/api/needs/${created.id}/matches`,
      );

      if (matchResponse.ok) {
        setMatches((await matchResponse.json()) as MatchResponse);
      }
    } catch {
      setError(
        "Sunucuya bağlanılamadı. Backend'in çalıştığından emin olun.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <section className="section-shell py-10 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              İhtiyaç Oluştur
            </h1>

            <p className="mt-3 text-muted-foreground">
              İhtiyacını, hizmeti ve konumunu seç. Sana uygun yayındaki
              işletmeleri bulalım.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
          >
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                Neye ihtiyacın var?
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="İhtiyacını kendi cümlenle anlat..."
                className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Kategori
                </label>

                <Select
                  value={categorySlug}
                  onValueChange={(value) => {
                    setCategorySlug(value);
                    setServiceSlug("");
                  }}
                  disabled={catalogLoading}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Kategori Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem key={item.id} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Hizmet
                </label>

                <Select
                  value={serviceSlug}
                  onValueChange={setServiceSlug}
                  disabled={!categorySlug}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Hizmet Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service} value={toSlug(service)}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">İl</label>

                <Select
                  value={citySlug}
                  onValueChange={(value) => {
                    setCitySlug(value);
                    setDistrictSlug("");
                  }}
                  disabled={catalogLoading}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="İl Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {cities.map((item) => (
                      <SelectItem key={item.id} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  İlçe
                </label>

                <Select
                  value={districtSlug}
                  onValueChange={setDistrictSlug}
                  disabled={!citySlug}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="İlçe Seç" />
                  </SelectTrigger>

                  <SelectContent>
                    {districts.map((item) => (
                      <SelectItem key={item.id} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!getAccessToken() && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Giriş yapmadan da talep oluşturabilirsin; ancak işletmelerden
                teklif almak ve teklifleri hesabında görmek için giriş yapman gerekir.
                {" "}
                <Link href="/giris" className="font-medium underline">
                  Giriş Yap
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Talebin başarıyla oluşturuldu.
                <div className="mt-1 break-all text-xs">
                  Talep ID: {success.id}
                </div>
                {getAccessToken() && (
                  <Link
                    href="/taleplerim"
                    className="mt-2 inline-block font-medium underline"
                  >
                    Taleplerime Git
                  </Link>
                )}
              </div>
            )}

            {matches && (
              <div className="rounded-2xl border border-border bg-background p-5">
                <div className="mb-4">
                  <h2 className="font-semibold">
                    Uygun işletmeler ({matches.count})
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aynı kategori, hizmet, il ve ilçedeki yayındaki işletmeler.
                  </p>
                </div>

                {matches.count === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Şu anda birebir eşleşen yayındaki işletme bulunamadı.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {matches.providers.map((provider) => (
                      <Link
                        key={provider.id}
                        href={`/isletme/${provider.slug}`}
                        className="block rounded-xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/40"
                      >
                        <div className="font-semibold">
                          {provider.businessName}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {provider.shortDescription}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading || catalogLoading}
              className="w-full"
            >
              {loading
                ? "Talep oluşturuluyor..."
                : catalogLoading
                  ? "Bilgiler yükleniyor..."
                  : "Talebi Gönder"}
            </Button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
'@

$panelPage = @'
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

type ProviderOffer = {
  id: string;
  needRequestId: string;
  needTitle: string;
  message: string;
  price: number | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAtUtc: string;
  updatedAtUtc: string;
};

type OfferDraft = {
  message: string;
  price: string;
};

export default function ProviderPanelPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProviderPanelProfile | null>(null);
  const [needs, setNeeds] = useState<ProviderNeed[]>([]);
  const [offers, setOffers] = useState<ProviderOffer[]>([]);
  const [drafts, setDrafts] = useState<Record<string, OfferDraft>>({});
  const [sendingNeedId, setSendingNeedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const offeredNeedIds = useMemo(
    () => new Set(offers.map((offer) => offer.needRequestId)),
    [offers],
  );

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

        const [profileResponse, needsResponse, offersResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/provider-panel/me`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/provider-panel/needs`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/provider-panel/offers`, {
            headers,
            cache: "no-store",
          }),
        ]);

        if (
          profileResponse.status === 401 ||
          needsResponse.status === 401 ||
          offersResponse.status === 401
        ) {
          clearAuth();
          router.replace("/giris");
          return;
        }

        if (!profileResponse.ok || !needsResponse.ok || !offersResponse.ok) {
          throw new Error("Panel verileri alınamadı.");
        }

        const profileData =
          (await profileResponse.json()) as ProviderPanelProfile;
        const needsData = (await needsResponse.json()) as ProviderNeed[];
        const offersData = (await offersResponse.json()) as ProviderOffer[];

        if (!active) return;

        setProfile(profileData);
        setNeeds(needsData);
        setOffers(offersData);
      } catch {
        if (active) setError("İşletme paneli yüklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPanel();

    return () => {
      active = false;
    };
  }, [router]);

  function getDraft(needId: string): OfferDraft {
    return drafts[needId] ?? { message: "", price: "" };
  }

  function updateDraft(
    needId: string,
    field: keyof OfferDraft,
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [needId]: {
        ...getDraft(needId),
        [field]: value,
      },
    }));
  }

  async function submitOffer(
    event: FormEvent<HTMLFormElement>,
    needId: string,
  ) {
    event.preventDefault();

    const token = getAccessToken();
    if (!token) {
      router.replace("/giris");
      return;
    }

    const draft = getDraft(needId);
    const cleanMessage = draft.message.trim();

    if (cleanMessage.length < 5) {
      setError("Teklif mesajı en az 5 karakter olmalıdır.");
      return;
    }

    const price = draft.price.trim() ? Number(draft.price) : null;

    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setError("Teklif tutarı geçerli değil.");
      return;
    }

    setError("");
    setMessage("");
    setSendingNeedId(needId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/needs/${needId}/offers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: cleanMessage,
            price,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Teklif gönderilemedi.");
        return;
      }

      setOffers((current) => [
        {
          id: data.id,
          needRequestId: data.needRequestId,
          needTitle:
            needs.find((need) => need.id === needId)?.title ?? "İhtiyaç",
          message: data.message,
          price: data.price,
          status: data.status,
          createdAtUtc: data.createdAtUtc,
          updatedAtUtc: data.createdAtUtc,
        },
        ...current,
      ]);

      setDrafts((current) => {
        const copy = { ...current };
        delete copy[needId];
        return copy;
      });

      setMessage("Teklif başarıyla gönderildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSendingNeedId(null);
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

  if (error && !profile) {
    return (
      <SiteLayout>
        <section className="section-shell py-12">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h1 className="font-display text-2xl font-bold">
              İşletme paneli açılamadı
            </h1>
            <p className="mt-3 text-muted-foreground">{error}</p>
          </div>
        </section>
      </SiteLayout>
    );
  }

  if (!profile) return null;

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-medium text-primary">
                İşletme Paneli
              </p>

              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                {profile.businessName}
              </h1>

              <p className="mt-3 max-w-2xl text-muted-foreground">
                İşletme profilini, eşleşen talepleri ve verdiğin teklifleri
                buradan takip edebilirsin.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.publicationStatus === "published" && (
                <Link
                  href={`/isletme/${profile.slug}`}
                  target="_blank"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
                >
                  Yayındaki Profili Gör
                </Link>
              )}

              <Link
                href="/panel/profil"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
              >
                Profili Düzenle
              </Link>

              <Link
                href="/hesabim"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
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
              <Building2 className="size-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">
                  Profil Durumu
                </div>
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
              <MessageSquareText className="size-5 text-primary" />
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
              <UserRound className="size-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">
                  Verilen Teklif
                </div>
                <div className="mt-1 font-semibold">{offers.length}</div>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-xl font-semibold">
                Eşleşen İhtiyaç Talepleri
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Yalnızca giriş yapmış kullanıcıların yeni taleplerine teklif
                verilebilir.
              </p>

              {needs.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Şu anda işletmenle eşleşen ihtiyaç talebi yok.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {needs.map((need) => {
                    const alreadyOffered = offeredNeedIds.has(need.id);
                    const draft = getDraft(need.id);

                    return (
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

                        {alreadyOffered ? (
                          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                            Bu talebe teklif verdin.
                          </div>
                        ) : (
                          <form
                            onSubmit={(event) => submitOffer(event, need.id)}
                            className="mt-4 space-y-3 border-t border-border pt-4"
                          >
                            <textarea
                              value={draft.message}
                              onChange={(event) =>
                                updateDraft(
                                  need.id,
                                  "message",
                                  event.target.value,
                                )
                              }
                              rows={3}
                              maxLength={2000}
                              placeholder="Teklif mesajını yaz..."
                              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                            />

                            <div className="flex flex-col gap-3 sm:flex-row">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={draft.price}
                                onChange={(event) =>
                                  updateDraft(
                                    need.id,
                                    "price",
                                    event.target.value,
                                  )
                                }
                                placeholder="Teklif tutarı (opsiyonel)"
                                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                              />

                              <Button
                                type="submit"
                                disabled={sendingNeedId === need.id}
                              >
                                {sendingNeedId === need.id
                                  ? "Gönderiliyor..."
                                  : "Teklif Ver"}
                              </Button>
                            </div>
                          </form>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-xl font-semibold">
                Verdiğim Teklifler
              </h2>

              {offers.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Henüz teklif vermedin.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row">
                        <div className="font-medium">{offer.needTitle}</div>
                        <span className="text-xs font-medium uppercase text-muted-foreground">
                          {offer.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {offer.message}
                      </p>

                      {offer.price !== null && (
                        <div className="mt-2 font-semibold">
                          {offer.price.toLocaleString("tr-TR")} TL
                        </div>
                      )}
                    </div>
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
                Teklif sistemi yalnızca hesabına bağlı, eşleşen yeni taleplerde
                çalışır. Eski anonim talepler sadece görüntülenebilir.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
'@

$myNeedsPage = @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
                        {offers.map((offer) => (
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

                              <span className="text-xs font-medium uppercase text-muted-foreground">
                                {offer.status}
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
                              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                Bu teklif kabul edildi.
                              </div>
                            )}

                            {offer.status === "rejected" && (
                              <div className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                Bu teklif reddedildi.
                              </div>
                            )}
                          </div>
                        ))}
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

Write-Utf8NoBom "$root\src\app\ihtiyac-olustur\page.tsx" $needPage
Write-Utf8NoBom "$root\src\app\panel\page.tsx" $panelPage
Write-Utf8NoBom "$root\src\app\taleplerim\page.tsx" $myNeedsPage

Write-Host ""
Write-Host "Frontend teklif sistemi hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Degistirilen/olusturulan sayfalar:" -ForegroundColor Cyan
Write-Host "  /ihtiyac-olustur  -> JWT ile talep olusturma"
Write-Host "  /panel            -> Teklif Ver + Verdigim Teklifler"
Write-Host "  /taleplerim       -> Gelen teklifler + Kabul/Red"
Write-Host ""
Write-Host "Turkce karakter bozulmalari da temizlendi." -ForegroundColor Yellow
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Cyan
