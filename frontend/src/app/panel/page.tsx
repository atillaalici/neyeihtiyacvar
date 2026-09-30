"use client";

import { Suspense, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Clock3,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Star,
  UserRound,
  Wrench,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { EditableProviderImage } from "@/components/site/EditableProviderImage";
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
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
  };
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
  targetProviderId?: string | null;
  isDirectRequest?: boolean;
  requesterName?: string | null;
  requesterPhone?: string | null;
  status?: "open" | "offerreceived" | "completed";
  createdAtUtc: string;
};

type ProviderOffer = {
  id: string;
  needRequestId: string;
  needTitle: string;
  needStatus?: "open" | "offerreceived" | "completed";
  message: string;
  price: number | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAtUtc: string;
  updatedAtUtc: string;
};

type ProviderImage = {
  index: number;
  imageUrl: string;
  isCover: boolean;
};

type OfferDraft = {
  message: string;
  price: string;
};

type ProviderReview = {
  id: string;
  needRequestId: string | null;
  needTitle: string;
  interactionChannel?: string | null;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAtUtc: string;
};

type ProviderReviewSummary = {
  providerId: string;
  averageRating: number;
  reviewCount: number;
  reviews: ProviderReview[];
};

type ProviderAnalyticsPeriod = {
  profileViews: number;

  // Genel tıklama istatistikleri
  phoneClicks: number;
  whatsappClicks: number;
  totalContactClicks: number;

  // Giriş yapmış kullanıcıların izlenebilir etkileşimleri
  trackedPhoneContacts: number;
  trackedWhatsappContacts: number;
  emailContacts: number;
  offerContacts: number;
  totalTrackedContacts: number;

  // Etkileşim sonuçları
  serviceReceived: number;
  noService: number;
  considering: number;
  notContacted: number;
  pending: number;

  // Gerçek teklif kayıtları
  offersGiven: number;
  offersAccepted: number;

  startUtc: string | null;
  endUtc: string;
};

type ProviderAnalyticsSummary = {
  provider: {
    id: string;
    businessName: string;
    slug: string;
  };
  generatedAtUtc: string;
  periods: {
    weekly: ProviderAnalyticsPeriod;
    monthly: ProviderAnalyticsPeriod;
    yearly: ProviderAnalyticsPeriod;
    total: ProviderAnalyticsPeriod;
  };
};

function offerStatusLabel(status: ProviderOffer["status"]) {
  if (status === "accepted") return "Kabul Edildi";
  if (status === "rejected") return "Reddedildi";
  if (status === "withdrawn") return "Geri Çekildi";
  return "Bekliyor";
}

function offerStatusClass(status: ProviderOffer["status"]) {
  if (status === "accepted")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "rejected")
    return "border-red-200 bg-red-50 text-red-700";
  if (status === "withdrawn")
    return "border-border bg-muted/40 text-muted-foreground";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function RatingStars({ value }: { value: number }) {
  const rounded = Math.round(value);

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${value.toFixed(1)} yıldız`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-5 ${
            star <= rounded
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function ProviderPanelPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notificationNeedId = searchParams.get("talep");

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProviderPanelProfile | null>(null);
  const [needs, setNeeds] = useState<ProviderNeed[]>([]);
  const [offers, setOffers] = useState<ProviderOffer[]>([]);
  const [reviewSummary, setReviewSummary] =
    useState<ProviderReviewSummary | null>(null);
  const [analytics, setAnalytics] =
    useState<ProviderAnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsPeriod, setAnalyticsPeriod] =
    useState<"weekly" | "monthly" | "yearly" | "total">("monthly");

  const [drafts, setDrafts] = useState<Record<string, OfferDraft>>({});
  const [sendingNeedId, setSendingNeedId] = useState<string | null>(null);
  const [withdrawingOfferId, setWithdrawingOfferId] = useState<string | null>(null);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [providerImages, setProviderImages] = useState<ProviderImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imageWorking, setImageWorking] = useState(false);
  const [imageNotice, setImageNotice] = useState("");
  const [imageError, setImageError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const offeredNeedIds = useMemo(
    () => new Set(offers.map((offer) => offer.needRequestId)),
    [offers],
  );

  const visibleNeeds = useMemo(
    () => needs.filter((need) => !offeredNeedIds.has(need.id)),
    [needs, offeredNeedIds],
  );

  useEffect(() => {
    if (!notificationNeedId || loading) {
      return;
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById(
        `talep-${notificationNeedId}`,
      );

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      target.focus({ preventScroll: true });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [notificationNeedId, loading, needs]);
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

        const [
          profileResponse,
          needsResponse,
          offersResponse,
          reviewsResponse,
        ] = await Promise.all([
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
          fetch(`${apiBaseUrl}/api/provider-panel/reviews`, {
            headers,
            cache: "no-store",
          }),
        ]);

        if (
          profileResponse.status === 401 ||
          needsResponse.status === 401 ||
          offersResponse.status === 401 ||
          reviewsResponse.status === 401
        ) {
          clearAuth();
          router.replace("/giris");
          return;
        }

        if (
          !profileResponse.ok ||
          !needsResponse.ok ||
          !offersResponse.ok ||
          !reviewsResponse.ok
        ) {
          throw new Error("Panel verileri alınamadı.");
        }

        const profileData =
          (await profileResponse.json()) as ProviderPanelProfile;
        const needsData = (await needsResponse.json()) as ProviderNeed[];
        const offersData = (await offersResponse.json()) as ProviderOffer[];
        const reviewsData =
          (await reviewsResponse.json()) as ProviderReviewSummary;

        if (!active) return;

        setProfile(profileData);
        setNeeds(needsData);
        setOffers(offersData);
        setReviewSummary(reviewsData);

        void (async () => {
          try {
            const imagesResponse = await fetch(
              `${apiBaseUrl}/api/provider-panel/image`,
              {
                headers,
                cache: "no-store",
              },
            );

            if (!active) return;

            if (!imagesResponse.ok) {
              setImageError("İşletme fotoğrafları yüklenemedi.");
              return;
            }

            const imagesData =
              (await imagesResponse.json()) as ProviderImage[];

            if (!active) return;

            setProviderImages(imagesData);
            setImageError("");
          } catch {
            if (active) {
              setImageError("İşletme fotoğrafları yüklenemedi.");
            }
          } finally {
            if (active) setImagesLoading(false);
          }
        })();

        void (async () => {
          try {
            const analyticsResponse = await fetch(
              `${apiBaseUrl}/api/provider-panel/analytics`,
              {
                headers,
                cache: "no-store",
              },
            );

            if (!active) return;

            if (!analyticsResponse.ok) {
              setAnalyticsError("İstatistik verileri şu anda alınamadı.");
              return;
            }

            const analyticsData =
              (await analyticsResponse.json()) as ProviderAnalyticsSummary;

            if (!active) return;

            setAnalytics(analyticsData);
            setAnalyticsError("");
          } catch {
            if (active) {
              setAnalyticsError("İstatistik verileri şu anda alınamadı.");
            }
          } finally {
            if (active) setAnalyticsLoading(false);
          }
        })();
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

  async function refreshProviderImages() {
    const token = getAccessToken();
    if (!token) return;

    const response = await fetch(
      `${apiBaseUrl}/api/provider-panel/image`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error("İşletme fotoğrafları alınamadı.");
    }

    const data = (await response.json()) as ProviderImage[];
    setProviderImages(data);
  }

  async function uploadProviderImage(file: File) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    if (providerImages.length >= 5) {
      setImageError("Bir işletme en fazla 5 fotoğraf yükleyebilir.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setImageWorking(true);
    setImageError("");
    setImageNotice("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setImageError(data?.message ?? "Fotoğraf yüklenemedi.");
        return;
      }

      await refreshProviderImages();
      setImageNotice("İşletme fotoğrafı başarıyla yüklendi.");
    } catch {
      setImageError("Fotoğraf yüklenirken bir hata oluştu.");
    } finally {
      setImageWorking(false);
    }
  }

  async function setProviderCover(index: number) {
    const token = getAccessToken();
    if (!token) return;

    setImageWorking(true);
    setImageError("");
    setImageNotice("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/image/cover/${index}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setImageError(data?.message ?? "Kapak fotoğrafı değiştirilemedi.");
        return;
      }

      await refreshProviderImages();
      setImageNotice("Kapak fotoğrafı değiştirildi.");
    } catch {
      setImageError("Kapak fotoğrafı değiştirilirken bir hata oluştu.");
    } finally {
      setImageWorking(false);
    }
  }

  async function deleteProviderImage(index: number) {
    const token = getAccessToken();
    if (!token) return;

    if (!window.confirm("Bu işletme fotoğrafını silmek istiyor musunuz?")) {
      return;
    }

    setImageWorking(true);
    setImageError("");
    setImageNotice("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/image/${index}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setImageError(data?.message ?? "Fotoğraf silinemedi.");
        return;
      }

      await refreshProviderImages();
      setImageNotice("İşletme fotoğrafı silindi.");
    } catch {
      setImageError("Fotoğraf silinirken bir hata oluştu.");
    } finally {
      setImageWorking(false);
    }
  }

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
          needStatus: "offerreceived",
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

  async function saveNotificationPreferences(
    next: ProviderPanelProfile["notificationPreferences"],
  ) {
    const token = getAccessToken();

    if (!token || !profile) {
      router.replace("/giris");
      return;
    }

    setSavingNotifications(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/notification-preferences`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(next),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Bildirim tercihleri kaydedilemedi.");
        return;
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              notificationPreferences: {
                email: data.email,
                sms: data.sms,
                whatsapp: data.whatsapp,
                push: data.push,
              },
              version: data.version,
            }
          : current,
      );

      setMessage("Bildirim tercihleri kaydedildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSavingNotifications(false);
    }
  }

  async function withdrawOffer(offerId: string) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    const confirmed = window.confirm(
      "Bu teklifi geri çekmek istediğine emin misin?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setWithdrawingOfferId(offerId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/offers/${offerId}/withdraw`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Teklif geri çekilemedi.");
        return;
      }

      setOffers((current) =>
        current.map((offer) =>
          offer.id === offerId
            ? {
                ...offer,
                status: "withdrawn",
                needStatus: data.needStatus,
                updatedAtUtc: new Date().toISOString(),
              }
            : offer,
        ),
      );

      setMessage("Teklif geri çekildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWithdrawingOfferId(null);
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

  const averageRating = reviewSummary?.averageRating ?? 0;
  const reviewCount = reviewSummary?.reviewCount ?? 0;
  const reviews = reviewSummary?.reviews ?? [];

  return (
    <SiteLayout>
      <section className="relative border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="mb-6 lg:hidden">
            <EditableProviderImage />
          </div>

          <div className="pointer-events-auto absolute right-4 top-8 z-10 hidden lg:block 2xl:right-8">
            <EditableProviderImage compact />
          </div>

          <div className="lg:pr-[430px]">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-medium text-primary">
                İşletme Paneli
              </p>

              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                {profile.businessName}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-border bg-background px-3 py-1.5">
                  Kategori: {profile.categorySlug}
                </span>
                <span className="rounded-full border border-border bg-background px-3 py-1.5">
                  Ana hizmet: {profile.serviceSlug}
                </span>
                {profile.additionalServices.map((service) => (
                  <span
                    key={service}
                    className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-primary"
                  >
                    Ek hizmet: {service}
                  </span>
                ))}
              </div>

              <p className="mt-3 max-w-2xl text-muted-foreground">
                İşletme profilini, eşleşen talepleri, verdiğin teklifleri ve
                müşteri değerlendirmelerini buradan takip edebilirsin.
              </p>
            </div>

            <div className="mr-auto flex w-full flex-col gap-2 sm:w-52 lg:mr-6">
              {profile.publicationStatus === "published" && (
                <Link
                  href={`/isletme/${profile.slug}`}
                  target="_blank"
                  className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 text-sm font-medium"
                >
                  Yayındaki Profili Gör
                </Link>
              )}

              <Link
                href="/hesabim"
                className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Hesabım
              </Link>
            </div>
          </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Building2 className="size-5 text-primary" aria-hidden="true" />

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
                <div className="text-sm text-muted-foreground">
                  Verilen Teklif
                </div>

                <div className="mt-1 font-semibold">{offers.length}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Star
                className="size-5 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />

              <div>
                <div className="text-sm text-muted-foreground">
                  Ortalama Puan
                </div>

                <div className="mt-1 font-semibold">
                  {reviewCount > 0
                    ? `${averageRating.toLocaleString("tr-TR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })} / 5`
                    : "Henüz yok"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Müşteri Etkileşimleri ve Sonuçlar
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                İşletmenizin görünürlüğünü, müşteri iletişimlerini, hizmet sonuçlarını
                ve teklif performansını seçtiğiniz döneme göre takip edin.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["weekly", "Haftalık"],
                ["monthly", "Aylık"],
                ["yearly", "Yıllık"],
                ["total", "Toplam"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setAnalyticsPeriod(
                      value as "weekly" | "monthly" | "yearly" | "total",
                    )
                  }
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    analyticsPeriod === value
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {analyticsLoading ? (
            <div className="mt-5 h-80 animate-pulse rounded-xl border border-border bg-muted/40" />
          ) : analytics ? (
            (() => {
              const data = analytics.periods[analyticsPeriod];
              const unresolved =
                data.pending + data.considering + data.notContacted;

              const periodLabel = {
                weekly: "Son 7 Gün",
                monthly: "Son 30 Gün",
                yearly: "Son 1 Yıl",
                total: "Tüm Zamanlar",
              }[analyticsPeriod];

              return (
                <div className="mt-5 overflow-hidden rounded-xl border border-border bg-background">
                  <div className="flex flex-col gap-1 border-b border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-semibold">{periodLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      Seçili dönem performansı
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-muted/35 p-4">
                        <div className="text-xs text-muted-foreground">
                          Profil Görüntülenme
                        </div>
                        <div className="mt-1 text-3xl font-bold">
                          {data.profileViews}
                        </div>
                      </div>

                      <div className="rounded-xl bg-muted/35 p-4">
                        <div className="text-xs text-muted-foreground">
                          İletişim Tıklaması
                        </div>
                        <div className="mt-1 text-3xl font-bold">
                          {data.totalContactClicks}
                        </div>
                      </div>

                      <div className="rounded-xl bg-muted/35 p-4">
                        <div className="text-xs text-muted-foreground">
                          Kayıtlı İletişim
                        </div>
                        <div className="mt-1 text-3xl font-bold">
                          {data.totalTrackedContacts}
                        </div>
                      </div>

                      <div className="rounded-xl bg-muted/35 p-4">
                        <div className="text-xs text-muted-foreground">
                          Hizmet Alan
                        </div>
                        <div className="mt-1 text-3xl font-bold">
                          {data.serviceReceived}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-xl border border-border p-4">
                        <div className="text-sm font-semibold">
                          Müşteri İletişimi
                        </div>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Telefon</span>
                            <strong>{data.trackedPhoneContacts}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">WhatsApp</span>
                            <strong>{data.trackedWhatsappContacts}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">E-posta</span>
                            <strong>{data.emailContacts}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border p-4">
                        <div className="text-sm font-semibold">
                          Hizmet Sonucu
                        </div>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Hizmet Aldı</span>
                            <strong>{data.serviceReceived}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Hizmet Almadı</span>
                            <strong>{data.noService}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Sonuç Bekleniyor</span>
                            <strong>{unresolved}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border p-4">
                        <div className="text-sm font-semibold">
                          Teklif Performansı
                        </div>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Verilen Teklif</span>
                            <strong>{data.offersGiven}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Kabul Edilen</span>
                            <strong>{data.offersAccepted}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Teklif İletişimi</span>
                            <strong>{data.offerContacts}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              {analyticsError || "Henüz görüntülenecek istatistik bulunmuyor."}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                İşletme Fotoğrafları
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Dijital vitrininizde gösterilecek fotoğrafları yönetin. En fazla
                5 adet JPG, PNG veya WebP fotoğraf yükleyebilirsiniz.
              </p>
            </div>

            <label
              className={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition ${
                imageWorking || providerImages.length >= 5
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-primary/90"
              }`}
            >
              {imageWorking ? "İşleniyor..." : "Fotoğraf Ekle"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={imageWorking || providerImages.length >= 5}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";

                  if (file) {
                    void uploadProviderImage(file);
                  }
                }}
              />
            </label>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            {providerImages.length} / 5 fotoğraf
          </div>

          {imageNotice && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {imageNotice}
            </div>
          )}

          {imageError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {imageError}
            </div>
          )}

          {imagesLoading ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="aspect-[4/3] animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : providerImages.length === 0 ? (
            <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
              <Building2
                className="size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="mt-3 font-medium">
                Henüz işletme fotoğrafı yüklenmemiş
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                İlk yüklediğiniz fotoğraf otomatik olarak kapak fotoğrafı olur.
              </div>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {providerImages.map((image) => (
                <div
                  key={image.index}
                  className="overflow-hidden rounded-xl border border-border bg-background"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    <img
                      src={`${apiBaseUrl}${image.imageUrl}?v=${image.index}-${image.isCover ? "cover" : "image"}`}
                      alt={`${profile.businessName} işletme fotoğrafı`}
                      className="h-full w-full object-cover"
                    />

                    {image.isCover && (
                      <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow">
                        Kapak Fotoğrafı
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 p-3">
                    {!image.isCover && (
                      <button
                        type="button"
                        disabled={imageWorking}
                        onClick={() => void setProviderCover(image.index)}
                        className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-input px-3 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
                      >
                        Kapak Yap
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={imageWorking}
                      onClick={() => void deleteProviderImage(image.index)}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                Yalnızca giriş yapmış kullanıcıların yeni ve sonuçlanmamış
                taleplerine teklif verilebilir.
              </p>

              {visibleNeeds.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Şu anda işletmenle eşleşen açık ihtiyaç talebi yok.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {visibleNeeds.map((need) => {
                    const alreadyOffered = offeredNeedIds.has(need.id);
                    const draft = getDraft(need.id);

                    return (
                      <article id={`talep-${need.id}`} tabIndex={-1}
                        key={need.id}
                        className="rounded-xl border border-border p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div>
                            <h3 className="font-semibold">{need.title}</h3>

                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {need.description}
                            </p>

                            {need.isDirectRequest && (
                              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                                <div className="text-xs font-semibold text-primary">
                                  Doğrudan işletmenize iletildi
                                </div>

                                <div className="mt-2 text-sm text-muted-foreground">
                                  Talep sahibi: {need.requesterName ?? "Kullanıcı"}
                                </div>

                                {need.requesterPhone && (
                                  <div className="mt-3 flex flex-wrap gap-3">
                                    <a
                                      href={`tel:${need.requesterPhone}`}
                                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                                    >
                                      <Phone className="size-4" aria-hidden="true" />
                                      Kullanıcıyı Ara
                                    </a>

                                    <a
                                      href={`https://wa.me/${need.requesterPhone.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                                    >
                                      WhatsApp
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
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
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Aldığım Değerlendirmeler
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Tamamlanmış işler sonrası müşterilerin bıraktığı puan ve
                    yorumlar.
                  </p>
                </div>

                {reviewCount > 0 && (
                  <div className="flex items-center gap-3">
                    <RatingStars value={averageRating} />

                    <div>
                      <div className="font-semibold">
                        {averageRating.toLocaleString("tr-TR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        / 5
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {reviewCount} değerlendirme
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {reviewCount === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Henüz müşteri değerlendirmesi bulunmuyor.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <div className="font-semibold">
                            {review.reviewerName}
                          </div>

                          <div className="mt-1 text-sm text-muted-foreground">
                            {review.needTitle}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <RatingStars value={review.rating} />

                            <span className="text-sm font-medium">
                              {review.rating} / 5
                            </span>
                          </div>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAtUtc).toLocaleString("tr-TR")}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {review.comment}
                      </p>
                    </article>
                  ))}
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

                        <span
                          className={`h-fit rounded-full border px-2.5 py-1 text-xs font-medium ${offerStatusClass(
                            offer.status,
                          )}`}
                        >
                          {offerStatusLabel(offer.status)}
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

                      {offer.status === "pending" && (
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={withdrawingOfferId === offer.id}
                            onClick={() => void withdrawOffer(offer.id)}
                            className="border-red-600 bg-red-600 text-white hover:bg-red-700 hover:text-white"
                          >
                            {withdrawingOfferId === offer.id
                              ? "Geri Çekiliyor..."
                              : "Teklifi Geri Çek"}
                          </Button>
                        </div>
                      )}

                      {offer.status === "accepted" && (
                        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                          Müşteri teklifinizi kabul etti.
                        </div>
                      )}

                      {offer.status === "withdrawn" && (
                        <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                          Bu teklif geri çekildi.
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
                  <Wrench
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />

                  <div>
                    <div className="text-xs text-muted-foreground">
                      Ana hizmet
                    </div>
                    <div className="mt-1 font-medium">
                      {profile.serviceSlug}
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      Kategori
                    </div>
                    <div className="mt-1 font-medium">
                      {profile.categorySlug}
                    </div>

                    {profile.additionalServices.length > 0 && (
                      <>
                        <div className="mt-3 text-xs text-muted-foreground">
                          Ek hizmet
                        </div>
                        <div className="mt-1 font-medium">
                          {profile.additionalServices.join(", ")}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />

                  <div className="text-muted-foreground">
                    {profile.citySlug} / {profile.districtSlug}
                  </div>
                </div>

                {profile.publicPhone && (
                  <div className="flex gap-3">
                    <Phone
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />

                    <div className="text-muted-foreground">
                      {profile.publicPhone}
                    </div>
                  </div>
                )}

                {profile.workingHours && (
                  <div className="flex gap-3">
                    <Clock3
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />

                    <div className="text-muted-foreground">
                      {profile.workingHours}
                    </div>
                  </div>
                )}

                {profile.emergencyService && (
                  <div className="flex gap-3">
                    <ShieldCheck
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />

                    <div className="text-muted-foreground">
                      Acil servis mevcut
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">
                Bildirim Tercihleri
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Yeni ihtiyaç taleplerini hangi kanallardan almak istediğini seç.
              </p>

              <div className="mt-4 space-y-3">
                {[
                  ["email", "E-posta"],
                  ["sms", "SMS"],
                  ["whatsapp", "WhatsApp"],
                  ["push", "Mobil bildirim"],
                ].map(([key, label]) => {
                  const typedKey =
                    key as keyof ProviderPanelProfile["notificationPreferences"];

                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border px-3 py-3"
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <input
                        type="checkbox"
                        checked={profile.notificationPreferences[typedKey]}
                        disabled={savingNotifications}
                        onChange={(event) => {
                          const next = {
                            ...profile.notificationPreferences,
                            [typedKey]: event.target.checked,
                          };

                          setProfile((current) =>
                            current
                              ? {
                                  ...current,
                                  notificationPreferences: next,
                                }
                              : current,
                          );

                          void saveNotificationPreferences(next);
                        }}
                        className="size-4 accent-primary"
                      />
                    </label>
                  );
                })}
              </div>

              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Tercihlerin kaydedilir. Uygulama içi bildirim şu anda aktiftir.
                E-posta, SMS ve WhatsApp dış gönderimleri ilgili servis
                entegrasyonları tamamlandığında bu tercihlere göre çalışacaktır.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">
                Puan Özeti
              </h2>

              {reviewCount === 0 ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Henüz müşteri değerlendirmesi yok.
                </p>
              ) : (
                <div className="mt-4">
                  <RatingStars value={averageRating} />

                  <div className="mt-2 text-3xl font-bold">
                    {averageRating.toLocaleString("tr-TR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </div>

                  <div className="mt-1 text-sm text-muted-foreground">
                    {reviewCount} müşteri değerlendirmesi
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-muted/40 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Teklif sistemi yalnızca hesabına bağlı, eşleşen ve sonuçlanmamış
                taleplerde çalışır.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}

export default function ProviderPanelPage() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <div
            data-panel-suspense-wrapper
            className="section-shell py-12"
          >
            <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </SiteLayout>
      }
    >
      <ProviderPanelPageContent />
    </Suspense>
  );
}
