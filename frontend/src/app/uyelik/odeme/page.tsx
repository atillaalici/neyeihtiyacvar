"use client";

import { RegistrationProgress } from "@/components/auth/RegistrationProgress";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgePercent,
  Check,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type PlanCode = "kobi" | "avantaj" | "profesyonel";

const plans: Record<
  PlanCode,
  {
    name: string;
    annualPrice: number;
    serviceLimit: number;
    description: string;
  }
> = {
  kobi: {
    name: "KOBİ",
    annualPrice: 1200,
    serviceLimit: 2,
    description: "Esnaf, usta ve küçük işletmeler için ideal başlangıç paketi.",
  },
  avantaj: {
    name: "Avantaj",
    annualPrice: 2400,
    serviceLimit: 5,
    description: "Daha fazla hizmet alanında görünmek isteyen işletmeler için.",
  },
  profesyonel: {
    name: "Profesyonel",
    annualPrice: 5000,
    serviceLimit: 12,
    description: "Geniş hizmet ağı bulunan işletmeler ve ekipler için.",
  },
};

type PromotionValidationResult = {
  valid: boolean;
  code: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
};
function MembershipPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoResult, setPromoResult] =
    useState<PromotionValidationResult | null>(null);
  const [promoError, setPromoError] = useState("");
  const [completingRegistration, setCompletingRegistration] =
    useState(false);

  const planCode = useMemo<PlanCode>(() => {
    const fromUrl = searchParams.get("paket")?.trim().toLowerCase();

    if (
      fromUrl === "kobi" ||
      fromUrl === "avantaj" ||
      fromUrl === "profesyonel"
    ) {
      return fromUrl;
    }

    if (typeof window !== "undefined") {
      const stored = sessionStorage
        .getItem("neyeihtiyacvar.selectedPlanCode")
        ?.trim()
        .toLowerCase();

      if (
        stored === "kobi" ||
        stored === "avantaj" ||
        stored === "profesyonel"
      ) {
        return stored;
      }
    }

    return "kobi";
  }, [searchParams]);

  const plan = plans[planCode];

  function changePlan(code: PlanCode) {
    sessionStorage.setItem("neyeihtiyacvar.selectedPlanCode", code);
    router.replace(`/uyelik/odeme?paket=${encodeURIComponent(code)}`);
  }
  async function applyPromotionCode() {
    const cleanCode = promoCode.trim().toUpperCase();

    setPromoError("");
    setPromoResult(null);

    if (!cleanCode) {
      setPromoError("Promosyon kodunu girin.");
      return;
    }

    setPromoApplying(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/promotions/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: cleanCode,
            planCode,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setPromoError(
          data?.message ?? "Promosyon kodu uygulanamadı.",
        );
        sessionStorage.removeItem(
          "neyeihtiyacvar.appliedPromotion",
        );
        return;
      }

      const result = data as PromotionValidationResult;
      setPromoResult(result);

      sessionStorage.setItem(
        "neyeihtiyacvar.appliedPromotion",
        JSON.stringify({
          code: result.code,
          planCode,
          originalPrice: result.originalPrice,
          discountAmount: result.discountAmount,
          finalPrice: result.finalPrice,
        }),
      );
    } catch {
      setPromoError(
        "Promosyon kodu kontrol edilirken sunucuya bağlanılamadı.",
      );
    } finally {
      setPromoApplying(false);
    }
  }

  async function completeFreeRegistration() {
    if (!promoResult || promoResult.finalPrice !== 0) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    const rawDraft = sessionStorage.getItem(
      "neyeihtiyacvar.businessRegistrationDraft",
    );

    if (!rawDraft) {
      setPromoError(
        "Kayıt bilgileri bulunamadı. İşletme kaydını yeniden başlatın.",
      );
      return;
    }

    let draft: {
      businessName: string;
      applicantName: string;
      phoneNumber: string;
      citySlug: string;
      districtSlug: string;
      categorySlug: string;
      serviceSlug: string;
      additionalServiceSlug: string | null;
    };

    try {
      draft = JSON.parse(rawDraft) as typeof draft;
    } catch {
      setPromoError(
        "Kayıt bilgileri okunamadı. İşletme kaydını yeniden başlatın.",
      );
      return;
    }

    setCompletingRegistration(true);
    setPromoError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-applications/complete-free`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            promotionCode: promoResult.code,
            planCode,
            ...draft,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setPromoError(
          data?.message ?? "Kayıt işlemi tamamlanamadı.",
        );
        return;
      }

      sessionStorage.removeItem(
        "neyeihtiyacvar.businessRegistrationDraft",
      );
      sessionStorage.removeItem(
        "neyeihtiyacvar.appliedPromotion",
      );

      router.replace(
        "/hesabim?kayit=tamamlandi&promosyon=1",
      );
    } catch {
      setPromoError(
        "Kayıt tamamlanırken sunucuya bağlanılamadı.",
      );
    } finally {
      setCompletingRegistration(false);
    }
  }

  function continueToPayment() {
    setPromoError(
      "Ödeme gerektiren işlemler ödeme sağlayıcısı entegrasyonu bağlandığında ödeme ekranına yönlendirilecek.",
    );
  }
  return (
    <SiteLayout>
      <section className="section-shell py-5 sm:py-6">
        <div className="mx-auto max-w-2xl">
          <RegistrationProgress current={6} />

          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              ÜYELİK / SON ADIM
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold">
              Paketini kontrol et
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Seçtiğin paketi kontrol et, istersen aşağıdan değiştirebilirsin.
            </p>
          </div>

          <div className="mt-3 rounded-[22px] border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">
                  Seçilen paket
                </div>
                <div className="mt-0.5 font-display text-xl font-bold">
                  {plan.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {plan.serviceLimit} hizmet hakkı
                </div>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-right">
                <div className="text-lg font-black text-slate-950">
                  {plan.annualPrice.toLocaleString("tr-TR")} TL
                </div>
                <div className="text-[11px] text-muted-foreground">/ yıl</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Paket seçimi korundu
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <ShieldCheck className="size-4 text-sky-600" />
                Doğrulama sonra yapılabilir
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <CreditCard className="size-4 text-orange-600" />
                Ödeme sonrası başvuru
              </div>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 text-[13px] font-bold">Paket seçenekleri</div>

              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(plans) as PlanCode[]).map((code) => {
                  const item = plans[code];
                  const selected = code === planCode;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => changePlan(code)}
                      className={[
                        "rounded-xl border p-3 text-left transition",
                        selected
                          ? "border-orange-500 bg-orange-50 ring-1 ring-orange-200"
                          : "border-border bg-background hover:border-orange-300",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold">{item.name}</div>
                        {selected ? (
                          <span className="grid size-5 place-items-center rounded-full bg-orange-600 text-white">
                            <Check className="size-3.5" />
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-lg font-black">
                        {item.annualPrice.toLocaleString("tr-TR")} TL
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                          / yıl
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.serviceLimit} hizmet hakkı
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                Paket değiştirildiğinde kayıt bilgileriniz silinmez ve bu
                sayfada kalırsınız. İşletme başvurusu ödeme başarıyla
                tamamlandıktan sonra oluşturulur.
              </p>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <label className="mb-1 block text-[13px] font-medium">
                Promosyon kodu
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <BadgePercent className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={promoCode}
                    onChange={(event) =>
                      setPromoCode(event.target.value.toUpperCase())
                    }
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
                    placeholder="Varsa promosyon kodunu gir"
                    maxLength={50}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void applyPromotionCode()}
                  disabled={promoApplying}
                  className="h-10 rounded-xl border border-border px-4 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {promoApplying ? "Kontrol..." : "Uygula"}
                </button>
              </div>
              {promoError ? (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {promoError}
                </div>
              ) : null}

              {promoResult ? (
                <>
                  <div className="mt-2 grid gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-green-800 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="font-semibold">
                        {promoResult.code} uygulandı
                      </div>
                      <div className="mt-1 text-xs">
                        Paket fiyatı:{" "}
                        <span className="line-through">
                          {promoResult.originalPrice.toLocaleString("tr-TR")} TL
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold">
                        İndirim: -
                        {promoResult.discountAmount.toLocaleString("tr-TR")} TL
                      </div>
                    </div>

                    <div className="border-green-200 sm:border-l sm:pl-5 sm:text-right">
                      <div className="text-xs font-semibold text-green-800">
                        Ödenmesi gereken tutar
                      </div>
                      <div className="mt-1 text-3xl font-black leading-none text-green-800">
                        {promoResult.finalPrice.toLocaleString("tr-TR")} TL
                      </div>
                    </div>
                  </div>

                  {promoResult.finalPrice === 0 ? (
                    <div className="mt-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
                      %100 indirim uygulandı. Ödeme adımı olmadan kayıt işlemini tamamlayabilirsiniz.
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
              >
                Geri
              </button>

              {promoResult?.finalPrice === 0 ? (
                <button
                  type="button"
                  onClick={() => void completeFreeRegistration()}
                  disabled={completingRegistration}
                  className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {completingRegistration
                    ? "Tamamlanıyor..."
                    : "Kayıt İşlemini Tamamla"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={continueToPayment}
                  className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700"
                >
                  Ödemeye Geç
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

export default function MembershipPaymentPage() {
  return (
    <Suspense>
      <MembershipPaymentContent />
    </Suspense>
  );
}