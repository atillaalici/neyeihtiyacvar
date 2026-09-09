"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";
import { useParams } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
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
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [reviewSummary, setReviewSummary] =
    useState<ProviderReviewSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          setReviewSummary(reviewData);
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

            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              {provider.businessName}
            </h1>

            {reviewCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
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
                {provider.citySlug} / {provider.districtSlug}
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

            <div className="mt-7 flex flex-wrap gap-3">
              {phone && (
                <a
                  href={phone}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  Telefon Et
                </a>
              )}

              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </a>
              )}
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
                  {provider.serviceSlug}
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
    </SiteLayout>
  );
}