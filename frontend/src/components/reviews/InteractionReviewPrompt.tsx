"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type PendingInteraction = {
  id: string;
  providerId: string;
  providerSlug: string;
  businessName: string;
  channel: string;
  source: string;
  createdAtUtc: string;
};

type Step = "question" | "review" | "no-service";

const noServiceReasons = [
  { value: "price", label: "Fiyatta anlaşamadık" },
  { value: "no_response", label: "Geri dönüş alamadım" },
  { value: "other_provider", label: "Başka bir işletmeyi seçtim" },
  { value: "no_longer_needed", label: "İhtiyacım kalmadı" },
  { value: "other", label: "Diğer" },
];

export function InteractionReviewPrompt() {
  const [interaction, setInteraction] =
    useState<PendingInteraction | null>(null);
  const [step, setStep] = useState<Step>("question");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const resetForm = useCallback(() => {
    setStep("question");
    setRating(0);
    setHoverRating(0);
    setComment("");
    setReason("");
    setError("");
  }, []);

  const loadPending = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      setInteraction(null);
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-interactions/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as PendingInteraction | null;

      resetForm();
      setInteraction(data);
    } catch {
      // Global değerlendirme penceresi uygulamanın kullanımını engellememeli.
    }
  }, [resetForm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPending();
    }, 500);

    function handleAuthChanged() {
      window.setTimeout(() => {
        void loadPending();
      }, 300);
    }

    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, [loadPending]);

  async function submitOutcome(
    outcome: "no_service" | "considering" | "not_contacted" | "remind_later",
    selectedReason?: string,
  ) {
    if (!interaction || working) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setInteraction(null);
      return;
    }

    setWorking(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-interactions/${interaction.id}/outcome`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outcome,
            reason: selectedReason ?? null,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message ?? "İşlem tamamlanamadı.");
        return;
      }

      setInteraction(null);
      resetForm();

      // Birden fazla bekleyen kayıt varsa sıradakini hemen açmak yerine
      // kullanıcıyı yormamak için bu oturumda yalnızca bir tane soruyoruz.
    } catch {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setWorking(false);
    }
  }

  async function submitReview() {
    if (!interaction || working) {
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("Lütfen 1 ile 5 arasında yıldız verin.");
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setInteraction(null);
      return;
    }

    setWorking(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-interactions/${interaction.id}/review`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rating,
            comment: comment.trim() || null,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message ?? "Değerlendirme kaydedilemedi.");
        return;
      }

      setInteraction(null);
      resetForm();
    } catch {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setWorking(false);
    }
  }

  if (!interaction) {
    return null;
  }

  const visibleRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="interaction-review-title"
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-background shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="p-5 sm:p-7">
          <button
            type="button"
            onClick={() => void submitOutcome("remind_later")}
            disabled={working}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Daha sonra hatırlat"
            title="Daha sonra hatırlat"
          >
            <X className="size-5" />
          </button>

          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Star className="size-6" />
          </div>

          <p className="mb-1 text-sm font-medium text-primary">
            Hizmet deneyiminizi paylaşın
          </p>

          <h2
            id="interaction-review-title"
            className="pr-8 text-xl font-bold tracking-tight sm:text-2xl"
          >
            {interaction.businessName}
          </h2>

          {step === "question" && (
            <>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Bu işletmeyle iletişime geçtiniz. Görüşmeniz sonucunda hizmet
                aldınız mı?
              </p>

              <div className="mt-6 grid gap-3">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full rounded-xl"
                  onClick={() => {
                    setError("");
                    setStep("review");
                  }}
                  disabled={working}
                >
                  <CheckCircle2 className="size-5" />
                  Evet, hizmet aldım
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-xl"
                  onClick={() => {
                    setError("");
                    setStep("no-service");
                  }}
                  disabled={working}
                >
                  Hizmet almadım
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-xl"
                  onClick={() => void submitOutcome("considering")}
                  disabled={working}
                >
                  Görüşme sürüyor / Henüz karar vermedim
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-xl text-muted-foreground"
                  onClick={() => void submitOutcome("not_contacted")}
                  disabled={working}
                >
                  Henüz görüşmedik
                </Button>
              </div>

              <button
                type="button"
                disabled={working}
                onClick={() => void submitOutcome("remind_later")}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <Clock3 className="size-4" />
                3 gün sonra tekrar hatırlat
              </button>
            </>
          )}

          {step === "review" && (
            <>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Aldığınız hizmeti 1 ile 5 yıldız arasında değerlendirin.
              </p>

              <div className="mt-6 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={working}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onFocus={() => setHoverRating(star)}
                    onBlur={() => setHoverRating(0)}
                    onClick={() => {
                      setRating(star);
                      setError("");
                    }}
                    className="rounded-xl p-1.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                    aria-label={`${star} yıldız`}
                  >
                    <Star
                      className={`size-9 sm:size-10 ${
                        star <= visibleRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/35"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <p className="mt-2 text-center text-sm font-medium">
                {rating === 1 && "Çok kötü"}
                {rating === 2 && "Kötü"}
                {rating === 3 && "Orta"}
                {rating === 4 && "İyi"}
                {rating === 5 && "Çok iyi"}
                {rating === 0 && "Yıldız seçin"}
              </p>

              <label className="mt-6 block">
                <span className="text-sm font-semibold">
                  Yorumunuz{" "}
                  <span className="font-normal text-muted-foreground">
                    (isteğe bağlı)
                  </span>
                </span>

                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  disabled={working}
                  placeholder="Hizmet deneyiminizi kısaca anlatabilirsiniz..."
                  className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                />

                <span className="mt-1 block text-right text-xs text-muted-foreground">
                  {comment.length}/2000
                </span>
              </label>

              <div className="mt-5 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  disabled={working}
                  onClick={() => {
                    setError("");
                    setStep("question");
                  }}
                >
                  Geri
                </Button>

                <Button
                  type="button"
                  className="flex-1 rounded-xl"
                  disabled={working || rating === 0}
                  onClick={() => void submitReview()}
                >
                  {working ? "Kaydediliyor..." : "Değerlendirmeyi Gönder"}
                </Button>
              </div>
            </>
          )}

          {step === "no-service" && (
            <>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Hizmet almama nedeninizi belirtmeniz, işletmelerin hizmet
                kalitesini geliştirmemize yardımcı olur.
              </p>

              <div className="mt-5 grid gap-2">
                {noServiceReasons.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    disabled={working}
                    onClick={() => {
                      setReason(item.value);
                      setError("");
                    }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      reason === item.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  disabled={working}
                  onClick={() => {
                    setError("");
                    setStep("question");
                  }}
                >
                  Geri
                </Button>

                <Button
                  type="button"
                  className="flex-1 rounded-xl"
                  disabled={working || !reason}
                  onClick={() => void submitOutcome("no_service", reason)}
                >
                  {working ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
