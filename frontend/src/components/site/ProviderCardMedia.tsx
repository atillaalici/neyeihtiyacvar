"use client";

import { BadgeCheck, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiBaseUrl } from "@/lib/api";

type ReviewSummary = {
  averageRating: number;
  reviewCount: number;
};

type Props = {
  providerId: string;
  providerSlug: string;
  businessName: string;
  verified?: boolean;
};

export function ProviderCardMedia({
  providerId,
  providerSlug,
  businessName,
  verified = false,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [rating, setRating] = useState<ReviewSummary | null>(null);

  const imageUrl = useMemo(
    () => `${apiBaseUrl}/api/providers/${providerId}/image`,
    [providerId],
  );

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/providers/${encodeURIComponent(providerSlug)}/reviews`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as ReviewSummary;

        if (active) {
          setRating(data);
        }
      } catch {
        // Kartın geri kalanını etkileme.
      }
    }

    void loadReviews();

    return () => {
      active = false;
    };
  }, [providerSlug]);

  const hasReviews = (rating?.reviewCount ?? 0) > 0;
  const rounded = Math.round(rating?.averageRating ?? 0);

  return (
    <>
      <div className="relative h-36 w-full overflow-hidden border-b border-border bg-gradient-to-br from-orange-50 via-amber-50/70 to-white sm:h-40">
        {!imageFailed ? (
          <img
            src={imageUrl}
            alt={`${businessName} işletme görseli`}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : null}

        {verified ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-green-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-green-700 shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Doğrulanmış İşletme
          </span>
        ) : null}
      </div>

      <div className="border-b border-border px-4 py-2.5">
        {hasReviews ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex items-center gap-0.5 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= rounded
                      ? "fill-current"
                      : "text-amber-200"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <strong className="text-sm font-extrabold text-slate-900">
              {(rating?.averageRating ?? 0).toLocaleString("tr-TR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </strong>

            <span className="text-xs text-muted-foreground">
              ({rating?.reviewCount ?? 0} değerlendirme)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 text-amber-200">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              ))}
            </div>

            <span className="text-xs text-muted-foreground">
              Henüz değerlendirme yok
            </span>
          </div>
        )}
      </div>
    </>
  );
}