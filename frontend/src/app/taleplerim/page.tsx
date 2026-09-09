"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, MessageCircle, Phone, RefreshCw, Star } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
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
  trackingExpiresAtUtc: string;
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

export default function MyNeedsPage() {
  const router = useRouter();

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
  const [workingCancelNeedId, setWorkingCancelNeedId] = useState<string | null>(null);
  const [workingTrackingNeedId, setWorkingTrackingNeedId] = useState<string | null>(null);
  const [workingReviewNeedId, setWorkingReviewNeedId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

      setMessage("Talebin 7 gün daha takip edilecek.");
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
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Taleplerim
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Açık taleplerini, gelen teklifleri, sonuçlanan işleri ve
            değerlendirmelerini buradan takip edebilirsin.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
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
              const review = reviewsByNeed[need.id] ?? null;
              const acceptedOffer = offers.find(
                (offer) => offer.status === "accepted",
              );
              const reviewDraft = getReviewDraft(need.id);
              const trackingExpiry = new Date(need.trackingExpiresAtUtc);
              const trackingRemainingMs =
                trackingExpiry.getTime() - Date.now();
              const trackingDaysLeft = Math.max(
                0,
                Math.ceil(
                  trackingRemainingMs / (1000 * 60 * 60 * 24),
                ),
              );
              const trackingActive =
                (need.status === "open" ||
                  need.status === "offerreceived") &&
                !need.trackingExpired;

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
                      className={`mt-4 rounded-xl border p-4 ${
                        trackingActive
                          ? "border-primary/20 bg-primary/5"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                              trackingActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            <Clock3 className="size-4" aria-hidden="true" />
                          </div>

                          <div>
                            <div className="font-medium">
                              {trackingActive
                                ? "Talebin takip ediliyor"
                                : "Takip süresi doldu"}
                            </div>

                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {trackingActive
                                ? `Uygun işletme bulunursa sana haber vereceğiz. Takip süresinin bitmesine ${trackingDaysLeft} gün kaldı.`
                                : "İhtiyacın devam ediyorsa talebini 7 gün daha takip edebiliriz."}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Takip bitişi:{" "}
                              {trackingExpiry.toLocaleString("tr-TR")}
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
                              : "7 Gün Daha Takip Et"}
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

                  {need.status === "cancelled" && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      Bu ihtiyaç talebi iptal edildi.
                    </div>
                  )}
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
                          const whatsapp = whatsappHref(
                            offer.publicWhatsapp,
                          );

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
                                    Bu teklif kabul edildi ve talep sonuçlandı.
                                  </div>

                                  {(tel || whatsapp) && (
                                    <div className="flex flex-wrap gap-2">
                                      {tel && (
                                        <a
                                          href={tel}
                                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium"
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
                                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
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
                        <div className="mt-3 rounded-xl border border-border p-4">
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
                </article>
              );
            })}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
