"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock3, MessageCircle, Phone, RefreshCw, Star } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { HeroSearch } from "@/components/site/HeroSearch";
import { UserSidebar } from "@/components/panel/UserSidebar";
import { BusinessSidebar } from "@/components/panel/BusinessSidebar";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { clearAuth, getAccessToken } from "@/lib/auth";

type NeedStatus = "open" | "offerreceived" | "completed" | "cancelled";

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
  status: NeedStatus;
  distributionEnabled: boolean;
  acceptingNewOffers: boolean;
  acceptedJobCount: number;
  trackingExpiresAtUtc: string | null;
  trackingExpired: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
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

type Review = {
  id: string;
  needRequestId: string;
  providerId: string;
  providerSlug: string;
  businessName: string;
  rating: number;
  comment: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

type ReviewDraft = {
  rating: number;
  comment: string;
};

function offerStatusLabel(status: Offer["status"]) {
  if (status === "accepted") return "Kabul Edildi";
  if (status === "rejected") return "Reddedildi";
  return "Bekliyor";
}

function offerStatusClass(status: Offer["status"]) {
  if (status === "accepted")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "rejected")
    return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function needStatusLabel(status: NeedStatus) {
  if (status === "cancelled") return "İptal Edildi";
  if (status === "completed") return "Sonuçlandı";
  if (status === "offerreceived") return "Teklif Alındı";
  return "Açık";
}

function needStatusClass(status: NeedStatus) {
  if (status === "cancelled")
    return "border-red-200 bg-red-50 text-red-700";
  if (status === "completed")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "offerreceived")
    return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-border bg-background text-muted-foreground";
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

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${value} yıldız`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;

        if (readonly) {
          return (
            <Star
              key={star}
              className={`size-5 ${
                active
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
              aria-hidden="true"
            />
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className="rounded-sm p-0.5 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label={`${star} yıldız ver`}
          >
            <Star
              className={`size-6 ${
                active
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/35"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function MyNeedsWorkspace({
  businessProfile,
}: {
  businessProfile?: { slug: string; businessName: string };
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedNeedId = searchParams.get("talep");
  const requestedTab = searchParams.get("sekme");

  const [searchPopupOpen, setSearchPopupOpen] = useState(false);
  const [needs, setNeeds] = useState<MyNeed[]>([]);
  const [offersByNeed, setOffersByNeed] = useState<Record<string, Offer[]>>({});
  const [reviewsByNeed, setReviewsByNeed] = useState<Record<string, Review | null>>(
    {},
  );
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, ReviewDraft>
  >({});

  const [loading, setLoading] = useState(true);
  const [workingOfferId, setWorkingOfferId] = useState<string | null>(null);
  const [workingOfferPreferenceNeedId, setWorkingOfferPreferenceNeedId] =
    useState<string | null>(null);
  const [workingCancelNeedId, setWorkingCancelNeedId] = useState<string | null>(null);
  const [workingTrackingNeedId, setWorkingTrackingNeedId] = useState<string | null>(null);
  const [workingReviewNeedId, setWorkingReviewNeedId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [message]);
  const [detailDrafts, setDetailDrafts] = useState<Record<string, string>>({});
  const [workingDetailNeedId, setWorkingDetailNeedId] = useState<string | null>(null);

  async function loadData() {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    try {
      setError("");

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

          if (!response.ok) return [need.id, []] as const;

          return [
            need.id,
            (await response.json()) as Offer[],
          ] as const;
        }),
      );

      setOffersByNeed(Object.fromEntries(offerEntries));

      const completedNeeds = needsData.filter(
        (need) => need.status === "completed",
      );

      const reviewEntries = await Promise.all(
        completedNeeds.map(async (need) => {
          const response = await fetch(
            `${apiBaseUrl}/api/my-needs/${need.id}/review`,
            {
              headers,
              cache: "no-store",
            },
          );

          if (response.status === 204) {
            return [need.id, null] as const;
          }

          if (!response.ok) {
            return [need.id, null] as const;
          }

          return [
            need.id,
            (await response.json()) as Review,
          ] as const;
        }),
      );

      setReviewsByNeed(Object.fromEntries(reviewEntries));
    } catch {
      setError("Talepler, teklifler veya değerlendirmeler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addNeedDetails(needId: string) {
    const details = (detailDrafts[needId] ?? "").trim();
    if (!details || workingDetailNeedId) return;

    const need = needs.find((item) => item.id === needId);
    if (!need || !["open", "offerreceived"].includes(need.status)) return;

    const token = getAccessToken();
    if (!token) {
      router.replace("/giris");
      return;
    }

    setError("");
    setMessage("");
    setWorkingDetailNeedId(needId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/my-needs/${needId}/details`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ details }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Ek açıklama kaydedilemedi.");
        return;
      }

      setNeeds((current) =>
        current.map((item) =>
          item.id === needId
            ? {
                ...item,
                description: data.description,
                updatedAtUtc: data.updatedAtUtc,
              }
            : item,
        ),
      );
      setDetailDrafts((current) => ({ ...current, [needId]: "" }));
      setMessage("Talebinize ek açıklama kaydedildi.");
    } catch {
      setError(
        "Bağlantı kesildi. Tekrar göndermeden önce talebinizi kontrol edin.",
      );
    } finally {
      setWorkingDetailNeedId(null);
    }
  }

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
    setMessage("");
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

  async function updateOfferPreference(
    needId: string,
    acceptingNewOffers: boolean,
  ) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    setError("");
    setMessage("");
    setWorkingOfferPreferenceNeedId(needId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/my-needs/${needId}/offer-preference`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ acceptingNewOffers }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Teklif alma tercihi kaydedilemedi.");
        return;
      }

      await loadData();

      setMessage(
        acceptingNewOffers
          ? "Talebiniz yeni tekliflere açıldı."
          : "Yeni teklif alımı durduruldu. Mevcut teklifleriniz korundu.",
      );
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWorkingOfferPreferenceNeedId(null);
    }
  }

  function getReviewDraft(needId: string): ReviewDraft {
    return reviewDrafts[needId] ?? {
      rating: 0,
      comment: "",
    };
  }

  function updateReviewDraft(
    needId: string,
    patch: Partial<ReviewDraft>,
  ) {
    setReviewDrafts((current) => ({
      ...current,
      [needId]: {
        ...getReviewDraft(needId),
        ...patch,
      },
    }));
  }

  async function renewTracking(needId: string) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    setError("");
    setMessage("");
    setWorkingTrackingNeedId(needId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/needs/${needId}/tracking/renew`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Takip süresi uzatılamadı.");
        return;
      }

      setMessage("Talebin 1 ay daha takip edilecek.");
      setLoading(true);
      await loadData();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWorkingTrackingNeedId(null);
      setLoading(false);
    }
  }
  async function cancelNeed(needId: string) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    const confirmed = window.confirm(
      "Bu talebi kapatmak istediğine emin misin?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setWorkingCancelNeedId(needId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/my-needs/${needId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Talep iptal edilemedi.");
        return;
      }

      setMessage("Talebin kapatıldı.");
      setLoading(true);
      await loadData();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWorkingCancelNeedId(null);
      setLoading(false);
    }
  }
  async function submitReview(needId: string) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    const draft = getReviewDraft(needId);
    const comment = draft.comment.trim();

    if (draft.rating < 1 || draft.rating > 5) {
      setError("Lütfen 1 ile 5 arasında yıldız seç.");
      return;
    }

    if (comment.length < 3) {
      setError("Yorum en az 3 karakter olmalıdır.");
      return;
    }

    setError("");
    setMessage("");
    setWorkingReviewNeedId(needId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/my-needs/${needId}/review`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rating: draft.rating,
            comment,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Değerlendirme gönderilemedi.");
        return;
      }

      setReviewsByNeed((current) => ({
        ...current,
        [needId]: {
          id: data.id,
          needRequestId: data.needRequestId,
          providerId: data.providerId,
          providerSlug: "",
          businessName: "",
          rating: data.rating,
          comment: data.comment,
          createdAtUtc: data.createdAtUtc,
          updatedAtUtc: data.createdAtUtc,
        },
      }));

      setReviewDrafts((current) => {
        const next = { ...current };
        delete next[needId];
        return next;
      });

      setMessage("Değerlendirmen başarıyla kaydedildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWorkingReviewNeedId(null);
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
    <SiteLayout hideFooter>
      {searchPopupOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/60 px-4 pt-[18vh] pb-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSearchPopupOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="İhtiyaç ara"
            className="w-full max-w-3xl rounded-2xl border border-border bg-background p-5 shadow-2xl sm:p-8"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Neye İhtiyaç Var?</h2>
              <button
                type="button"
                onClick={() => setSearchPopupOpen(false)}
                aria-label="Pencereyi kapat"
                className="grid size-9 place-items-center rounded-lg text-2xl text-muted-foreground hover:bg-muted"
              >
                ×
              </button>
            </div>
            <HeroSearch
              popup
              onQuoteSubmitted={() => {
                setSearchPopupOpen(false);
                void loadData();
              }}
            />
          </div>
        </div>
      )}
      <div className="section-shell flex flex-col gap-6 py-6 lg:flex-row lg:items-stretch">
        {businessProfile ? (
          <BusinessSidebar
            providerSlug={businessProfile.slug}
            businessName={businessProfile.businessName}
            activeNeedCount={needs.filter(
              (need) => need.status === "open" || need.status === "offerreceived",
            ).length}
            completedNeedCount={needs.filter(
              (need) => need.status === "completed" || need.status === "cancelled",
            ).length}
          />
        ) : (
          <UserSidebar
            activeNeedCount={needs.filter(
              (need) =>
                need.status === "open" ||
                need.status === "offerreceived",
            ).length}
            completedNeedCount={needs.filter(
              (need) =>
                need.status === "completed" ||
                need.status === "cancelled",
            ).length}
          />
        )}
        <main className="min-w-0 flex-1">
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">
                {(() => {
                  const selectedNeed = needs.find(
                    (need) => need.id === selectedNeedId,
                  );
                  const showCompleted = selectedNeed
                    ? selectedNeed.status === "completed" ||
                      selectedNeed.status === "cancelled"
                    : requestedTab === "sonuclanan";

                  return showCompleted
                    ? "Sonuçlanan Taleplerim"
                    : "Aktif Taleplerim";
                })()}
              </h1>

              <p className="mt-3 max-w-2xl text-muted-foreground">
                Açık taleplerini, gelen teklifleri, sonuçlanan işleri ve
                değerlendirmelerini buradan takip edebilirsin.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSearchPopupOpen(true)}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
            >
              + Yeni Talep Oluştur
            </button>
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

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

            <button
              type="button"
              onClick={() => setSearchPopupOpen(true)}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              İhtiyaç Oluştur
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            {[
              {
                title: "Aktif Taleplerim",
                items: needs.filter(
                  (need) =>
                    need.status === "open" ||
                    need.status === "offerreceived",
                ),
              },
              {
                title: "Sonuçlanan Taleplerim",
                items: needs.filter(
                  (need) =>
                    need.status === "completed" ||
                    need.status === "cancelled",
                ),
              },
            ]
              .filter((section) => {
                const selectedNeed = needs.find(
                  (need) => need.id === selectedNeedId,
                );
                const showCompleted = selectedNeed
                  ? selectedNeed.status === "completed" ||
                    selectedNeed.status === "cancelled"
                  : requestedTab === "sonuclanan";

                return section.title ===
                  (showCompleted
                    ? "Sonuçlanan Taleplerim"
                    : "Aktif Taleplerim");
              })
              .map((section) => (
              <div key={section.title} className="space-y-5">
                <h2 className="border-b-2 border-slate-300 pb-3 text-xl font-bold text-slate-900">
                  {section.title}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({section.items.length})
                  </span>
                </h2>

                {section.items.length === 0 ? (
                  <p className="rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
                    Bu bölümde henüz talep bulunmuyor.
                  </p>
                ) : null}

                {section.items
              .sort((a, b) => {
                if (selectedNeedId) {
                  if (a.id === selectedNeedId) return -1;
                  if (b.id === selectedNeedId) return 1;
                }

                const aCancelled = a.status === "cancelled" ? 1 : 0;
                const bCancelled = b.status === "cancelled" ? 1 : 0;

                if (aCancelled !== bCancelled) {
                  return aCancelled - bCancelled;
                }

                return (
                  new Date(b.createdAtUtc).getTime() -
                  new Date(a.createdAtUtc).getTime()
                );
              })
              .map((need) => {
              const offers = offersByNeed[need.id] ?? [];
              const review = reviewsByNeed[need.id] ?? null;
              const acceptedOffer = offers.find(
                (offer) => offer.status === "accepted",
              );
              const reviewDraft = getReviewDraft(need.id);
              const trackingExpiry = need.trackingExpiresAtUtc
                ? new Date(need.trackingExpiresAtUtc)
                : null;
              const trackingRemainingMs = trackingExpiry
                ? // eslint-disable-next-line react-hooks/purity
                  trackingExpiry.getTime() - Date.now()
                : null;
              const trackingDaysLeft =
                trackingRemainingMs === null
                  ? null
                  : Math.max(
                      0,
                      Math.ceil(
                        trackingRemainingMs / (1000 * 60 * 60 * 24),
                      ),
                    );
              const trackingActive =
                (need.status === "open" ||
                  need.status === "offerreceived") &&
                !need.trackingExpired;

              if (need.status === "cancelled") {
                const repeatParams = new URLSearchParams();

                if (need.title) repeatParams.set("q", need.title);
                if (need.citySlug) repeatParams.set("il", need.citySlug);
                if (need.districtSlug) repeatParams.set("ilce", need.districtSlug);
                if (need.categorySlug) {
                  repeatParams.set("kategori", need.categorySlug);
                }
                if (need.serviceSlug) {
                  repeatParams.set("hizmet", need.serviceSlug);
                }

                return (
                  <article
                    key={need.id}
                    className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 text-sm">
                      <span className="font-semibold text-foreground">
                        {need.title}
                      </span>
                      <span className="mx-2 text-red-300">—</span>
                      <span className="text-red-700">
                        Bu ihtiyaç talebi iptal edildi.
                      </span>
                    </div>

                    <Link
                      href={`/ihtiyac-olustur?${repeatParams.toString()}`}
                      className="shrink-0 text-sm font-semibold text-primary hover:underline"
                    >
                      Talebi Tekrar Oluştur
                    </Link>
                  </article>
                );
              }

              return (
                <article
                  key={need.id}
                  className={`overflow-hidden rounded-xl border bg-card ${
                    need.id === selectedNeedId
                      ? "border-orange-500 ring-2 ring-orange-200"
                      : "border-border"
                  }`}
                >
                  <details
                    className="group"
                    open={need.id === selectedNeedId}
                  >
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-4 marker:hidden [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <h2 className="font-semibold">{need.title}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {need.city} / {need.district} ·{" "}
                          {new Date(need.createdAtUtc).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {offers.length} teklif
                        </span>
                        <span className={`rounded-full px-2.5 py-1 font-medium ${needStatusClass(need.status)}`}>
                          {needStatusLabel(need.status)}
                        </span>
                        <span className="font-medium text-primary group-open:hidden">
                          Detayları Gör ↓
                        </span>
                        <span className="hidden font-medium text-primary group-open:inline">
                          Kapat ↑
                        </span>
                      </div>
                    </summary>
                    <div className="border-t border-border px-4 py-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="sr-only">
                        {need.title}
                      </h2>

                      <div className="mb-5">
                        <h3 className="text-sm font-semibold">Talep Bilgileri</h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {need.description}
                        </p>
                      </div>

                      {(need.status === "open" ||
                        need.status === "offerreceived") && (
                        <div className="mt-4 border-t border-border pt-4">
                          <h3 className="text-sm font-semibold">Ek Açıklama</h3>

                          <textarea
                            value={detailDrafts[need.id] ?? ""}
                            onChange={(event) =>
                              setDetailDrafts((current) => ({
                                ...current,
                                [need.id]: event.target.value,
                              }))
                            }
                            rows={4}
                            maxLength={2000}
                            placeholder="Talebinizle ilgili ek açıklama yazın..."
                            className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm"
                          />

                          <button
                            type="button"
                            onClick={() => void addNeedDetails(need.id)}
                            disabled={
                              Boolean(workingDetailNeedId) ||
                              !(detailDrafts[need.id] ?? "").trim()
                            }
                            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            {workingDetailNeedId === need.id
                              ? "Kaydediliyor..."
                              : "Ek Açıklamayı Kaydet"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${needStatusClass(
                          need.status,
                        )}`}
                      >
                        {needStatusLabel(need.status)}
                      </span>

                      <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                        {offers.length} teklif
                      </span>
                    </div>
                  </div>

                  {(need.status === "open" ||
                    need.status === "offerreceived") && (
                    <div
                      className="mt-5 border-t border-border pt-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex size-7 shrink-0 items-center justify-center text-muted-foreground"
                          >
                            <Clock3 className="size-4" aria-hidden="true" />
                          </div>

                          <div>
                            <div className="font-medium">
                              {trackingActive
                                ? "Takip ediliyor"
                                : "Takip süresi doldu"}
                            </div>

                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {trackingActive
                                ? trackingDaysLeft === null
                                  ? "Uygun işletme bulunursa sana haber vereceğiz. Talebin sen kapatana kadar açık kalacak."
                                  : `Uygun işletme bulunursa sana haber vereceğiz. Takip süresinin bitmesine ${trackingDaysLeft} gün kaldı.`
                                : "İhtiyacın devam ediyorsa talebini 1 ay daha takip edebiliriz."}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Takip bitişi:{" "}
                              {trackingExpiry
                                ? trackingExpiry.toLocaleString("tr-TR")
                                : "Ben kapatana kadar"}
                            </p>
                          </div>
                        </div>

                        {!trackingActive && (
                          <Button
                            type="button"
                            disabled={
                              workingTrackingNeedId === need.id
                            }
                            onClick={() =>
                              void renewTracking(need.id)
                            }
                            className="w-full shrink-0 sm:w-auto"
                          >
                            <RefreshCw
                              className="size-4"
                              aria-hidden="true"
                            />
                            {workingTrackingNeedId === need.id
                              ? "Uzatılıyor..."
                              : "1 Ay Daha Takip Et"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {(need.status === "open" ||
                    need.status === "offerreceived") && (
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={workingCancelNeedId === need.id}
                        onClick={() => void cancelNeed(need.id)}
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      >
                        {workingCancelNeedId === need.id
                          ? "Kapatılıyor..."
                          : "Talebi Kapat"}
                      </Button>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                    <span>{need.category}</span>
                    <span>{need.city} / {need.district}</span>
                    <span>{new Date(need.createdAtUtc).toLocaleString("tr-TR")}</span>
                  </div>

                  <div className="mt-6 border-t border-border pt-5">
                    <h3 className="font-semibold">Gelen Teklifler</h3>

                    {need.distributionEnabled &&
                      need.acceptedJobCount > 0 &&
                      (need.status === "open" ||
                        need.status === "offerreceived") && (
                        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                          <p className="text-sm font-semibold">
                            Yeni teklifler almaya devam etmek istiyor musunuz?
                          </p>

                          <p className="mt-2 text-sm text-muted-foreground">
                            {need.acceptingNewOffers
                              ? "Talebiniz yeni tekliflere açık. İsterseniz yeni teklif alımını durdurabilirsiniz."
                              : "Yeni teklif alımı durduruldu. Daha önce gelen teklifleri değerlendirmeye devam edebilirsiniz."}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={need.acceptingNewOffers ? "default" : "outline"}
                              disabled={
                                workingOfferPreferenceNeedId === need.id ||
                                need.acceptingNewOffers
                              }
                              onClick={() =>
                                void updateOfferPreference(need.id, true)
                              }
                            >
                              Teklif Almaya Devam Et
                            </Button>

                            <Button
                              type="button"
                              variant={!need.acceptingNewOffers ? "default" : "outline"}
                              disabled={
                                workingOfferPreferenceNeedId === need.id ||
                                !need.acceptingNewOffers
                              }
                              onClick={() =>
                                void updateOfferPreference(need.id, false)
                              }
                            >
                              Yeni Teklifleri Durdur
                            </Button>
                          </div>
                        </div>
                      )}

                    {offers.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Henüz teklif gelmedi.
                      </p>
                    ) : (
                      <div className="mt-3 divide-y divide-border">
                        {offers.map((offer) => {
                          const tel = phoneHref(offer.publicPhone);
                          const whatsapp = whatsappHref(
                            offer.publicWhatsapp,
                          );

                          return (
                            <div
                              key={offer.id}
                              className="py-4 first:pt-0"
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
                                  className={`h-fit rounded-full border px-2.5 py-1 text-xs font-medium ${offerStatusClass(
                                    offer.status,
                                  )}`}
                                >
                                  {offerStatusLabel(offer.status)}
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

                              {offer.status === "pending" &&
                                need.status !== "completed" && (
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
                                    {need.distributionEnabled
                                      ? "Bu teklif kabul edildi ve işletmeyle ayrı bir iş süreci oluşturuldu."
                                      : "Bu teklif kabul edildi ve talep sonuçlandı."}
                                  </div>

                                  {(tel || whatsapp) && (
                                    <div className="flex flex-wrap gap-2">
                                      {tel && (
                                        <a
                                          href={tel}
                                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-transparent bg-orange-500 px-4 text-sm font-medium text-white hover:bg-orange-600"
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
                                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 text-sm font-medium text-white hover:bg-[#1DA851]"
                                        >
                                          <MessageCircle className="size-4" />
                                          WhatsApp
                                        </a>
                                      )}

                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={async () => {
                                          const token = getAccessToken();

                                          if (!token) {
                                            router.push(
                                              `/giris?returnUrl=${encodeURIComponent("/mesajlarim")}`,
                                            );
                                            return;
                                          }

                                          try {
                                            const response = await fetch(
                                              `${apiBaseUrl}/api/need-messages/needs/${need.id}/providers/${offer.providerId}/conversation`,
                                              {
                                                method: "POST",
                                                headers: {
                                                  Authorization: `Bearer ${token}`,
                                                },
                                              },
                                            );

                                            if (!response.ok) {
                                              throw new Error(
                                                "Mesajlaşma açılamadı. Lütfen tekrar deneyin.",
                                              );
                                            }

                                            const conversation = await response.json();

                                            router.push(
                                              `/mesajlarim?conversation=${conversation.id}`,
                                            );
                                          } catch (error) {
                                            setError(
                                              error instanceof Error
                                                ? error.message
                                                : "Mesajlaşma açılamadı.",
                                            );
                                          }
                                        }}
                                      >
                                        <MessageCircle className="mr-2 size-4" />
                                        Mesaj
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {offer.status === "rejected" && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                  Bu teklif reddedildi.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {need.status === "completed" && acceptedOffer && (
                    <div className="mt-6 border-t border-border pt-5">
                      <h3 className="font-semibold">Hizmeti Değerlendir</h3>

                      {review ? (
                        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <StarRating value={review.rating} readonly />

                            <span className="text-sm font-medium">
                              {review.rating} / 5
                            </span>
                          </div>

                          <p className="mt-3 text-sm leading-6">
                            {review.comment}
                          </p>

                          <p className="mt-3 text-xs text-muted-foreground">
                            Değerlendirme tarihi:{" "}
                            {new Date(
                              review.createdAtUtc,
                            ).toLocaleString("tr-TR")}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 border-t border-border pt-4">
                          <p className="text-sm text-muted-foreground">
                            {acceptedOffer.businessName} için puan ve yorum
                            bırakabilirsin.
                          </p>

                          <div className="mt-4">
                            <StarRating
                              value={reviewDraft.rating}
                              onChange={(rating) =>
                                updateReviewDraft(need.id, { rating })
                              }
                            />
                          </div>

                          <textarea
                            value={reviewDraft.comment}
                            onChange={(event) =>
                              updateReviewDraft(need.id, {
                                comment: event.target.value,
                              })
                            }
                            rows={4}
                            maxLength={2000}
                            placeholder="Aldığın hizmetle ilgili deneyimini yaz..."
                            className="mt-4 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
                          />

                          <div className="mt-3 flex justify-end">
                            <Button
                              type="button"
                              disabled={
                                workingReviewNeedId === need.id ||
                                reviewDraft.rating === 0 ||
                                reviewDraft.comment.trim().length < 3
                              }
                              onClick={() => void submitReview(need.id)}
                            >
                              {workingReviewNeedId === need.id
                                ? "Gönderiliyor..."
                                : "Değerlendirmeyi Gönder"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  </details>
                </article>
              );
            })}
              </div>
            ))}
          </div>
        )}
      </section>
        </main>
      </div>
    </SiteLayout>
  );
}
