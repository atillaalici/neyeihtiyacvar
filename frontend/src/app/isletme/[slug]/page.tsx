"use client";

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import { trackPlatformAnalytics } from "@/lib/platform-analytics";
import {
  phoneHref,
  type ProviderDetail,
  whatsappHref,
} from "@/lib/providers";

type ProviderReview = {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAtUtc: string;
};

type ProviderReviewSummary = {
  providerId: string;
  providerSlug: string;
  averageRating: number;
  reviewCount: number;
  reviews: ProviderReview[];
};

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

export default function ProviderDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [reviewSummary, setReviewSummary] =
    useState<ProviderReviewSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [showNeedModal, setShowNeedModal] = useState(false);
  const [pendingContactHref, setPendingContactHref] = useState<string | null>(null);
  const [needText, setNeedText] = useState("");
  const [contactByWhatsapp, setContactByWhatsapp] = useState(false);
  const [contactByEmail, setContactByEmail] = useState(false);
  const [contactByPush, setContactByPush] = useState(false);
  const [contactAutoOpened, setContactAutoOpened] = useState(false);
  const [sendingNeed, setSendingNeed] = useState(false);
  const [needError, setNeedError] = useState("");
  const [needSuccess, setNeedSuccess] = useState("");
  const profileViewTrackedRef = useRef(false);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let active = true;

    async function loadProvider() {
      setLoading(true);
      setError("");

      try {
        const [providerResponse, reviewResponse] = await Promise.all([
          fetch(
            `${apiBaseUrl}/api/providers/${encodeURIComponent(slug)}`,
            {
              cache: "no-store",
            },
          ),
          fetch(
            `${apiBaseUrl}/api/providers/${encodeURIComponent(slug)}/reviews`,
            {
              cache: "no-store",
            },
          ),
        ]);

        if (providerResponse.status === 404) {
          if (active) {
            setProvider(null);
            setReviewSummary(null);
            setError("İşletme profili bulunamadı.");
          }

          return;
        }

        if (!providerResponse.ok) {
          throw new Error("İşletme profili alınamadı.");
        }

        const providerData =
          (await providerResponse.json()) as ProviderDetail;

        let reviewData: ProviderReviewSummary | null = null;

        if (reviewResponse.ok) {
          reviewData =
            (await reviewResponse.json()) as ProviderReviewSummary;
        }

        if (active) {
          setProvider(providerData);
          setImageFailed(false);
          setReviewSummary(reviewData);

          if (!profileViewTrackedRef.current) {
            profileViewTrackedRef.current = true;
            trackPlatformAnalytics({
              eventType: "provider_view",
              providerSlug: slug,
              source: "profile",
            });
          }
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

  function requestContact(href: string) {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      setPendingContactHref(href);
      setShowAuthPrompt(true);
      return;
    }

    if (!user.emailVerified) {
      setPendingContactHref(href);
      setShowVerificationPrompt(true);
      return;
    }

    trackPlatformAnalytics({
      eventType: href.startsWith("tel:") ? "phone_click" : "whatsapp_click",
      providerSlug: slug,
      source: "profile",
    });

    window.location.href = href;
  }

  useEffect(() => {
    if (!provider || contactAutoOpened) {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("contact") !== "1") {
      return;
    }

    const timer = window.setTimeout(() => {
      setContactAutoOpened(true);

      const searchText = params.get("q")?.trim();

      if (searchText) {
        setNeedText(searchText);
      }

      setContactByWhatsapp(false);
      setContactByEmail(false);
      setContactByPush(false);

      if (!getAccessToken()) {
        setShowAuthPrompt(true);
        return;
      }

      setNeedError("");
      setShowNeedModal(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [provider, contactAutoOpened]);
  function openNeedModal() {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      setPendingContactHref(null);
      setShowAuthPrompt(true);
      return;
    }

    if (!user.emailVerified) {
      setPendingContactHref(null);
      setShowVerificationPrompt(true);
      return;
    }

    setNeedError("");
    setNeedSuccess("");
    setShowNeedModal(true);
  }

  async function submitNeed() {
    const token = getAccessToken();
    const user = getStoredUser();
    const cleanText = needText.trim();

    if (!token || !user) {
      setShowNeedModal(false);
      setShowAuthPrompt(true);
      return;
    }

    if (!user.emailVerified) {
      setShowNeedModal(false);
      setShowVerificationPrompt(true);
      return;
    }

    if (cleanText.length < 5) {
      setNeedError("İhtiyacını en az 5 karakterle açıklamalısın.");
      return;
    }

    setSendingNeed(true);
    setNeedError("");

    try {
      const currentUser = getStoredUser();

      if (!currentUser?.phoneNumber) {
        setNeedError(
          "İhtiyacını işletmeye iletmek için hesabında cep telefonu numarası bulunmalıdır.",
        );
        return;
      }

      const urlParams = new URLSearchParams(
        window.location.search,
      );
      const trackedNeedId = urlParams.get("needId");

      const response = trackedNeedId
        ? await fetch(
            `${apiBaseUrl}/api/needs/${trackedNeedId}/target-provider`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                targetProviderId: provider!.id,
                description: needText.trim(),
                contactByWhatsapp,
                contactByEmail,
                contactByPush,
              }),
            },
          )
        : await fetch(`${apiBaseUrl}/api/needs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: `${provider!.businessName} ile iletişim talebi`,
              description: needText.trim(),
              categorySlug: provider!.categorySlug,
              serviceSlug: provider!.serviceSlug,
              citySlug: provider!.citySlug,
              districtSlug: provider!.districtSlug,
              targetProviderId: provider!.id,
              contactByWhatsapp,
              contactByEmail,
              contactByPush,
            }),
          });
      const data = await response.json();

      if (!response.ok) {
        if (data?.code === "verification_required") {
          setShowNeedModal(false);
          setShowVerificationPrompt(true);
          return;
        }

        setNeedError(data?.message ?? "İhtiyaç işletmeye iletilemedi.");
        return;
      }

      setShowNeedModal(false);
      setNeedText("");
      setNeedSuccess(
        `İhtiyacınız ${provider!.businessName} işletmesine iletildi. İşletme sizinle en kısa sürede iletişime geçecektir.`,
      );
    } catch {
      setNeedError("Sunucuya bağlanılamadı.");
    } finally {
      setSendingNeed(false);
    }
  }

  function authReturnUrl() {
    return `/isletme/${encodeURIComponent(slug)}`;
  }
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

  const averageRating = reviewSummary?.averageRating ?? 0;
  const reviewCount = reviewSummary?.reviewCount ?? 0;
  const reviews = reviewSummary?.reviews ?? [];

  return (
    <SiteLayout>
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-primary">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              Yayındaki İşletme
            </span>

            {!imageFailed && (
              <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <img
                  src={`${apiBaseUrl}/api/providers/${provider.id}/image`}
                  alt={`${provider.businessName} işletme görseli`}
                  className="aspect-[16/7] w-full object-cover sm:aspect-[16/6]"
                  onError={() => setImageFailed(true)}
                />
              </div>
            )}
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              {provider!.businessName}
            </h1>

            {provider.isVerifiedBusiness && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  Doğrulanmış İşletme
                </span>
              </div>
            )}

            {reviewCount > 0 && (
              <div className="mt-4 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
                <RatingStars value={averageRating} />

                <span className="font-semibold">
                  {averageRating.toLocaleString("tr-TR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </span>

                <span className="text-sm text-muted-foreground">
                  ({reviewCount} değerlendirme)
                </span>
              </div>
            )}

            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {provider.shortDescription}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                {provider!.citySlug} / {provider!.districtSlug}
              </span>

              {provider.experienceYears !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  {provider.experienceYears} yıl deneyim
                </span>
              )}
            </div>

            {needSuccess && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {needSuccess}
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {phone && (
                <button
                  type="button"
                  onClick={() => requestContact(phone)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  Telefon Et
                </button>
              )}

              {whatsapp && (
                <button
                  type="button"
                  onClick={() => requestContact(whatsapp)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </button>
              )}

              <button
                type="button"
                onClick={openNeedModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                <Send className="size-4" aria-hidden="true" />
                İhtiyacımı İlet
              </button>
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
                  {provider!.serviceSlug}
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

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Müşteri Değerlendirmeleri
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Tamamlanmış işler sonrası yapılan gerçek değerlendirmeler.
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
                  Bu işletme için henüz değerlendirme yapılmadı.
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

                          <div className="mt-2 flex items-center gap-2">
                            <RatingStars value={review.rating} />

                            <span className="text-sm font-medium">
                              {review.rating} / 5
                            </span>
                          </div>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAtUtc).toLocaleDateString(
                            "tr-TR",
                          )}
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
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-base font-semibold">
                İşletme Bilgileri
              </h2>

              <div className="mt-4 space-y-4 text-sm">
                {provider.publicAddress && (
                  <div className="flex gap-3">
                    <MapPin
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="leading-6 text-muted-foreground">
                      {provider.publicAddress}
                    </span>
                  </div>
                )}

                {provider.workingHours && (
                  <div className="flex gap-3">
                    <Clock3
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="leading-6 text-muted-foreground">
                      {provider.workingHours}
                    </span>
                  </div>
                )}

                {provider.emergencyService && (
                  <div className="flex gap-3">
                    <ShieldCheck
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">
                      Acil servis mevcut
                    </span>
                  </div>
                )}

                {provider.onsiteService && (
                  <div className="flex gap-3">
                    <BriefcaseBusiness
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">
                      Yerinde hizmet mevcut
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-base font-semibold">
                Değerlendirme Özeti
              </h2>

              {reviewCount === 0 ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Henüz değerlendirme bulunmuyor.
                </p>
              ) : (
                <div className="mt-4">
                  <RatingStars value={averageRating} />

                  <div className="mt-2 text-2xl font-bold">
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
          </aside>
        </div>
      </section>
      {showVerificationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="font-display text-2xl font-bold">
              Önce e-posta adresini doğrula
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              İşletmeyle doğrudan iletişim kurmak veya ihtiyacını iletmek için
              e-posta adresini doğrulaman gerekiyor.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  const returnUrl = authReturnUrl();
                  router.push(
                    `/dogrula?returnUrl=${encodeURIComponent(returnUrl)}`,
                  );
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Şimdi Doğrula
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowVerificationPrompt(false);
                  setPendingContactHref(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold transition hover:bg-muted"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {showNeedModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-3 backdrop-blur-[1px] sm:p-4">
          <div className="mx-auto my-4 w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:my-6">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-8 sm:py-6">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  {provider!.businessName}&apos;a İhtiyacını İlet
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  İhtiyacını bu işletmeye ilet. İşletme talebini aldıktan sonra
                  seninle seçtiğin iletişim kanalları üzerinden iletişime geçebilir.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNeedModal(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background text-xl transition hover:bg-accent"
                aria-label="Pencereyi kapat"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Send
                      className="mt-0.5 size-6 shrink-0 text-orange-600"
                      aria-hidden="true"
                    />

                    <div>
                      <div className="font-semibold">
                        {new URLSearchParams(window.location.search).get("needId")
                          ? "Mevcut talebin hazır"
                          : "İhtiyacını işletmeye ilet"}
                      </div>

                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {new URLSearchParams(window.location.search).get("needId")
                          ? "Daha önce oluşturduğun takip talebi bu işletmeye yönlendirilecek. Yeni bir genel talep oluşturulmayacak."
                          : "Açıklaman doğrudan bu işletmeye gönderilecek."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border p-5 sm:p-6">
                  <h3 className="font-display text-lg font-semibold">Talep bilgileri</h3>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-medium">İhtiyacın</span>

                    <textarea
                      value={needText}
                      onChange={(event) => setNeedText(event.target.value)}
                      rows={5}
                      maxLength={2000}
                      placeholder="İhtiyacını kısaca anlat..."
                      className="w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />

                    <div className="mt-1 text-right text-xs text-muted-foreground">
                      {needText.length}/2000
                    </div>
                  </label>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="text-xs text-muted-foreground">Konum</div>
                      <div className="mt-1 font-semibold">
                        {provider!.citySlug} / {provider!.districtSlug}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="text-xs text-muted-foreground">Hizmet</div>
                      <div className="mt-1 font-semibold">
                        {new URLSearchParams(window.location.search).get("q")
                          ? "Mevcut ihtiyacın"
                          : provider!.serviceSlug}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border p-5 sm:p-6">
                  <h3 className="font-display text-lg font-semibold">
                    İşletme seninle nasıl iletişime geçsin?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Telefon zorunlu ve varsayılan iletişim kanalıdır. İstersen
                    başka kanalları da ekleyebilirsin.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-orange-200 bg-orange-50/40 p-4 transition hover:bg-orange-50">
                      <div className="flex items-center gap-3">
                        <Phone className="size-5 text-orange-600" aria-hidden="true" />

                        <div>
                          <div className="font-semibold">Telefon</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Arama yoluyla
                          </div>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked
                        readOnly
                        className="size-5 accent-orange-600"
                        aria-label="Telefon zorunlu"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-4 transition hover:bg-accent/40">
                      <div className="flex items-center gap-3">
                        <MessageCircle
                          className="size-5 text-green-600"
                          aria-hidden="true"
                        />

                        <div>
                          <div className="font-semibold">WhatsApp</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Mesaj yoluyla
                          </div>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={contactByWhatsapp}
                        onChange={(event) =>
                          setContactByWhatsapp(event.target.checked)
                        }
                        className="size-5 accent-green-600"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-4 transition hover:bg-accent/40">
                      <div>
                        <div className="font-semibold">E-posta</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          E-posta yoluyla
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={contactByEmail}
                        onChange={(event) =>
                          setContactByEmail(event.target.checked)
                        }
                        className="size-5 accent-primary"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-4 transition hover:bg-accent/40">
                      <div>
                        <div className="font-semibold">Uygulama içi bildirim</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Platform üzerinden
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={contactByPush}
                        onChange={(event) =>
                          setContactByPush(event.target.checked)
                        }
                        className="size-5 accent-primary"
                      />
                    </label>
                  </div>

                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                    İletişim bilgilerin yalnızca seçtiğin kanallar üzerinden bu
                    işletmeyle paylaşılır.
                  </div>
                </div>

                {needError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {needError}
                  </div>
                )}
              </div>

              <aside className="h-fit rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">
                <div>
                  <h3 className="font-display text-xl font-bold">
                    {provider!.businessName}
                  </h3>

                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Doğrulanmış İşletme
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />

                    <div>
                      <span className="text-muted-foreground">Konum:</span>{" "}
                      <strong>
                        {provider!.citySlug} / {provider!.districtSlug}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Wrench
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />

                    <div>
                      <span className="text-muted-foreground">Ana hizmet:</span>{" "}
                      <strong>{provider!.serviceSlug}</strong>
                    </div>
                  </div>

                  {provider!.publicPhone && (
                    <div className="flex items-start gap-3">
                      <Phone
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />

                      <div>
                        <span className="text-muted-foreground">Telefon:</span>{" "}
                        {provider!.publicPhone}
                      </div>
                    </div>
                  )}

                  {provider!.publicWhatsapp && (
                    <div className="flex items-start gap-3">
                      <MessageCircle
                        className="mt-0.5 size-4 shrink-0 text-green-600"
                        aria-hidden="true"
                      />

                      <div>
                        <span className="text-muted-foreground">WhatsApp:</span>{" "}
                        {provider!.publicWhatsapp}
                      </div>
                    </div>
                  )}
                </div>

                {(phone || whatsapp) && (
                  <div className="mt-6 rounded-2xl border border-green-200 bg-green-50/70 p-4">
                    <div className="font-display text-lg font-bold text-green-900">
                      Hemen iletişime geç
                    </div>

                    <p className="mt-1 text-sm leading-6 text-green-900/80">
                      Talep oluşturmadan önce de işletmeyi doğrudan arayabilir veya
                      WhatsApp&apos;tan yazabilirsin.
                    </p>

                    <div className="mt-4 grid gap-3">
                      {phone && (
                        <button
                          type="button"
                          onClick={() => requestContact(phone)}
                          className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-orange-600 px-5 py-3 text-left text-white shadow-sm transition hover:bg-orange-700"
                        >
                          <Phone className="size-6 shrink-0" aria-hidden="true" />

                          <span>
                            <span className="block text-lg font-bold">Hemen Ara</span>
                            {provider!.publicPhone && (
                              <span className="block text-xs text-white/85">
                                {provider!.publicPhone}
                              </span>
                            )}
                          </span>
                        </button>
                      )}

                      {whatsapp && (
                        <button
                          type="button"
                          onClick={() => requestContact(whatsapp)}
                          className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-green-600 px-5 py-3 text-left text-white shadow-sm transition hover:bg-green-700"
                        >
                          <MessageCircle
                            className="size-6 shrink-0"
                            aria-hidden="true"
                          />

                          <span>
                            <span className="block text-lg font-bold">
                              WhatsApp&apos;tan Yaz
                            </span>
                            {provider!.publicWhatsapp && (
                              <span className="block text-xs text-white/85">
                                {provider!.publicWhatsapp}
                              </span>
                            )}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Güvenle iletişim kur
                  </div>

                  <p className="mt-1">
                    Talebin yalnızca bu işletmeye iletilir. Seçmediğin ek iletişim
                    kanalları paylaşılmaz.
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-900">
                  <strong>İpucu:</strong> Acil ihtiyaçlarda doğrudan telefon ile
                  aramak en hızlı sonucu verir.
                </div>
              </aside>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <button
                type="button"
                onClick={() => setShowNeedModal(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-input bg-background px-6 text-sm font-semibold transition hover:bg-accent"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={() => void submitNeed()}
                disabled={sendingNeed || needText.trim().length < 3}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-8 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="size-4" aria-hidden="true" />
                {sendingNeed ? "İletiliyor..." : "İhtiyacımı İlet"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="font-display text-2xl font-bold">
              İşletmeyle iletişime geçmek için giriş yap
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Telefon ve WhatsApp bilgilerine erişmek için hesabına giriş yap
              veya ücretsiz üye ol. İşletme sayfası korunacak; girişten sonra
              kaldığın yerden devam edebilirsin.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  const returnUrl = authReturnUrl();
                  router.push(
                    `/giris?returnUrl=${encodeURIComponent(returnUrl)}`,
                  );
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Giriş Yap
              </button>

              <button
                type="button"
                onClick={() => {
                  const returnUrl = authReturnUrl();
                  router.push(
                    `/kayit?returnUrl=${encodeURIComponent(returnUrl)}`,
                  );
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold transition hover:bg-muted"
              >
                Üye Ol
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAuthPrompt(false);
                setPendingContactHref(null);
              }}
              className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}