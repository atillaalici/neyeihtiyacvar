"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Star,
  UserRound,
} from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type NeedStatus =
  | "open"
  | "offerreceived"
  | "completed"
  | "cancelled";

type OfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

type AdminOffer = {
  id: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  providerPhone: string | null;
  providerWhatsapp: string | null;
  message: string;
  price: number | null;
  status: OfferStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
};

type AdminReview = {
  id: string;
  providerId: string;
  providerName: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

type AdminNeedDetail = {
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
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  ownerEmail: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  offerCount: number;
  acceptedOfferCount: number;
  pendingOfferCount: number;
  rejectedOfferCount: number;
  withdrawnOfferCount: number;
  offers: AdminOffer[];
  review: AdminReview | null;
};

const needStatusLabels: Record<NeedStatus, string> = {
  open: "Açık",
  offerreceived: "Teklif Alındı",
  completed: "Sonuçlandı",
  cancelled: "İptal Edildi",
};

const needStatusClasses: Record<NeedStatus, string> = {
  open: "border-slate-200 bg-slate-50 text-slate-700",
  offerreceived: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-green-200 bg-green-50 text-green-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

const offerStatusLabels: Record<OfferStatus, string> = {
  pending: "Bekliyor",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
  withdrawn: "Geri Çekildi",
};

const offerStatusClasses: Record<OfferStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  accepted: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  withdrawn: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function AdminNeedDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [need, setNeed] = useState<AdminNeedDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await adminFetch(
          `${apiBaseUrl}/api/admin/needs/${encodeURIComponent(id)}`,
          { cache: "no-store" },
        );

        if (response.status === 404) {
          if (active) {
            setNeed(null);
            setError("İhtiyaç talebi bulunamadı.");
          }
          return;
        }

        if (!response.ok) {
          throw new Error("Talep detayı alınamadı.");
        }

        if (active) {
          setNeed((await response.json()) as AdminNeedDetail);
        }
      } catch {
        if (active) {
          setError(
            "Talep detayı yüklenemedi. Backend Development ortamında çalışıyor olmalı.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const acceptedOffer = useMemo(
    () => need?.offers.find((offer) => offer.status === "accepted") ?? null,
    [need],
  );

  if (loading) {
    return (
      <SiteLayout>
      <AdminNav />
        <section className="section-shell py-12">
          <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
        </section>
      </SiteLayout>
    );
  }

  if (error || !need) {
    return (
      <SiteLayout>
      <AdminNav />
        <section className="section-shell py-12">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h1 className="font-display text-2xl font-bold">
              Talep detayı açılamadı
            </h1>
            <p className="mt-3 text-muted-foreground">
              {error || "Talep bulunamadı."}
            </p>

            <Link
              href="/admin/talepler"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Taleplere Dön
            </Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <AdminNav />
      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <Link
            href="/admin/talepler"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            İhtiyaç Taleplerine Dön
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-bold sm:text-4xl">
                  {need.title}
                </h1>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${needStatusClasses[need.status]}`}
                >
                  {needStatusLabels[need.status]}
                </span>
              </div>

              <p className="mt-4 text-base leading-7 text-muted-foreground">
                {need.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricCard label="Toplam Teklif" value={need.offerCount} />
              <MetricCard label="Bekleyen" value={need.pendingOfferCount} />
              <MetricCard label="Reddedilen" value={need.rejectedOfferCount} />
              <MetricCard label="Geri Çekilen" value={need.withdrawnOfferCount} />
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-xl font-semibold">
                Teklif Geçmişi
              </h2>

              {need.offers.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Bu talebe henüz teklif verilmemiş.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {need.offers.map((offer) => (
                    <article
                      key={offer.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <Link
                            href={`/isletme/${offer.providerSlug}`}
                            target="_blank"
                            className="font-semibold hover:underline"
                          >
                            {offer.providerName}
                          </Link>

                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {offer.message}
                          </p>
                        </div>

                        <span
                          className={`h-fit rounded-full border px-2.5 py-1 text-xs font-medium ${offerStatusClasses[offer.status]}`}
                        >
                          {offerStatusLabels[offer.status]}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {offer.price !== null && (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                            <CircleDollarSign className="size-4 text-primary" />
                            {offer.price.toLocaleString("tr-TR")} TL
                          </span>
                        )}

                        {offer.providerPhone && (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="size-4 text-primary" />
                            {offer.providerPhone}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-4 text-primary" />
                          {new Date(offer.createdAtUtc).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Değerlendirme
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sonuçlanan iş sonrası müşterinin bıraktığı puan ve yorum.
                  </p>
                </div>

                {need.review && (
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`size-5 ${
                          index < need.review!.rating
                            ? "fill-current"
                            : ""
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-semibold text-foreground">
                      {need.review.rating} / 5
                    </span>
                  </div>
                )}
              </div>

              {need.review ? (
                <div className="mt-5 rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">
                      {need.review.reviewerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(need.review.createdAtUtc).toLocaleString("tr-TR")}
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-muted-foreground">
                    İşletme: {need.review.providerName}
                  </div>

                  <p className="mt-3 text-sm leading-6">
                    {need.review.comment}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Bu talep için henüz değerlendirme yapılmamış.
                </p>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">
                Talep Sahibi
              </h2>

              <div className="mt-4 space-y-4 text-sm">
                <div className="flex gap-3">
                  <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <div className="font-medium">
                      {need.ownerDisplayName ?? "Anonim / Eski Talep"}
                    </div>
                  </div>
                </div>

                {need.ownerEmail && (
                  <div className="flex gap-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="break-all text-muted-foreground">
                      {need.ownerEmail}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="text-muted-foreground">
                    {need.city} / {need.district}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="text-muted-foreground">
                    {new Date(need.createdAtUtc).toLocaleString("tr-TR")}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">
                Kategori ve Hizmet
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Kategori</div>
                  <div className="mt-1 font-medium">{need.category}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {need.categorySlug ?? "-"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Hizmet</div>
                  <div className="mt-1 font-medium">
                    {need.serviceSlug ?? "-"}
                  </div>
                </div>
              </div>
            </div>

            {acceptedOffer && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-center gap-2 text-green-700">
                  <BadgeCheck className="size-5" />
                  <h2 className="font-display text-base font-semibold">
                    Kabul Edilen İşletme
                  </h2>
                </div>

                <div className="mt-3 font-semibold text-green-900">
                  {acceptedOffer.providerName}
                </div>

                {acceptedOffer.price !== null && (
                  <div className="mt-2 text-sm text-green-800">
                    {acceptedOffer.price.toLocaleString("tr-TR")} TL
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <div className="flex gap-3">
                <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Bu ekran salt okunur yönetim görünümüdür. Müşteri ve işletme
                  işlemlerine müdahale etmeden sürecin tamamını denetleyebilirsin.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-24 rounded-xl border border-border bg-background p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}