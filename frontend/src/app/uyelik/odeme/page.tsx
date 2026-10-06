"use client";

import { RegistrationProgress } from "@/components/auth/RegistrationProgress";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgePercent,
  Check,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  X,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import {
  getLegalDocument,
  type LegalDocumentData,
} from "@/components/legal/legal-data";

type PlanCode = "kobi" | "avantaj" | "profesyonel";

function formatLocationName(value?: string | null) {
  if (!value) return "";

  return value
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) =>
      part.charAt(0).toLocaleUpperCase("tr-TR") +
      part.slice(1).toLocaleLowerCase("tr-TR"),
    )
    .join(" ");
}

const plans: Record<
  PlanCode,
  {
    name: string;
    regularAnnualPrice: number;
    annualPrice: number;
    serviceLimit: number;
    description: string;
  }
> = {
  kobi: {
    name: "1+1 Paket",
    regularAnnualPrice: 2400,
    annualPrice: 1200,
    serviceLimit: 2,
    description: "Esnaf, usta ve küçük işletmeler için ideal başlangıç paketi.",
  },
  avantaj: {
    name: "1+4 Paket",
    regularAnnualPrice: 5000,
    annualPrice: 2400,
    serviceLimit: 5,
    description: "Daha fazla hizmet alanında görünmek isteyen işletmeler için.",
  },
  profesyonel: {
    name: "12 Kategorili Paket",
    regularAnnualPrice: 12000,
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

type UpgradeQuote = {
  membershipId: string;
  currentPlan: {
    code: string;
    name: string;
  };
  targetPlan: {
    id: string;
    code: string;
    name: string;
    annualPrice: number;
    serviceLimit: number;
    sortOrder: number;
  };
  startsAtUtc: string;
  expiresAtUtc: string;
  paidAmount: number;
  remainingCredit: number;
  amountDue: number;
};
function MembershipPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoResult, setPromoResult] =
    useState<PromotionValidationResult | null>(null);
  const [promoError, setPromoError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [completingRegistration, setCompletingRegistration] =
    useState(false);
  const [billingOpen] = useState(true);
  const [billingSaved, setBillingSaved] = useState(false);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [upgradeQuote, setUpgradeQuote] = useState<UpgradeQuote | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalModalDocument, setLegalModalDocument] =
    useState<LegalDocumentData | null>(null);

  const [billing, setBilling] = useState({
    billingType: "individual",
    nameOrTitle: "",
    fullName: "",
    taxOffice: "",
    identityNumber: "",
    taxNumber: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
  });

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
  const isUpgrade = searchParams.get("mode") === "upgrade";

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    const profileTimer = window.setTimeout(() => {
      setBilling((current) => ({
        ...current,
        nameOrTitle: current.nameOrTitle || user?.displayName?.trim() || "",
        email: current.email || user?.email?.trim() || "",
        phone: current.phone || user?.phoneNumber?.trim() || "",
        city: current.city || formatLocationName(user?.citySlug?.trim()),
        district: current.district || formatLocationName(user?.districtSlug?.trim()),
      }));
    }, 0);
    if (!token) {
      queueMicrotask(() => setBillingLoading(false));
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/billing-information`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data) {
          setBilling({
            billingType: data.billingType ?? "individual",
            nameOrTitle: data.nameOrTitle ?? "",
            fullName: data.fullName ?? "",
            taxOffice: data.taxOffice ?? "",
            identityNumber: data.identityNumber ?? "",
            taxNumber: data.taxNumber ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            address: data.address ?? "",
            city: data.city ?? "",
            district: data.district ?? "",
          });
          setBillingSaved(true);
        }
      } finally {
        if (!cancelled) queueMicrotask(() => setBillingLoading(false));
      }
    })();

    return () => { cancelled = true; window.clearTimeout(profileTimer); };
  }, []);

  useEffect(() => {
    if (!isUpgrade) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    let cancelled = false;

    void (async () => {
      setUpgradeLoading(true);
      setUpgradeError("");

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/membership-selection/upgrade-quote/${encodeURIComponent(planCode)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const data = await response.json().catch(() => null);

        if (cancelled) return;

        if (!response.ok) {
          setUpgradeQuote(null);
          setUpgradeError(
            data?.message ?? "Paket yükseltme bilgileri alınamadı.",
          );
          return;
        }

        setUpgradeQuote(data as UpgradeQuote);
      } catch {
        if (!cancelled) {
          setUpgradeQuote(null);
          setUpgradeError(
            "Paket yükseltme bilgileri alınırken sunucuya bağlanılamadı.",
          );
        }
      } finally {
        if (!cancelled) {
          setUpgradeLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isUpgrade, planCode, router]);

  function changePlan(code: PlanCode) {
    sessionStorage.setItem("neyeihtiyacvar.selectedPlanCode", code);
    router.replace(
      `/uyelik/odeme?paket=${encodeURIComponent(code)}${isUpgrade ? "&mode=upgrade" : ""}`,
    );
  }
  async function applyPromotionCode() {
    if (!billingSaved) {
      setPromoError("Önce fatura bilgilerini kaydetmelisin.");
      return;
    }

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

    if (!legalAccepted) {
      setPromoError(
        "Devam etmek için Ücretli İşletme Üyeliği ve Dijital Vitrin Sözleşmesini kabul etmelisin.",
      );
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    const rawDraft =
      sessionStorage.getItem("neyeihtiyacvar.businessRegistrationDraft") ??
      localStorage.getItem("neyeihtiyacvar.businessRegistrationDraft");

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
      additionalCategorySlug?: string | null;
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
            legalAccepted: true,
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
      localStorage.removeItem(
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

  async function saveBillingInformation() {
    const identityDigits = billing.identityNumber.replace(/\D/g, "");
    const taxDigits = billing.taxNumber.replace(/\D/g, "");

    if (!billing.nameOrTitle.trim()) {
      setBillingError("İsim Soyisim / Unvan zorunludur.");
      return false;
    }

    if (billing.billingType === "individual") {
      if (identityDigits.length !== 11) {
        setBillingError("T.C. Kimlik No 11 haneli olmalıdır.");
        return false;
      }
    }

    if (billing.billingType === "sole_proprietorship") {
      if (!billing.fullName.trim()) {
        setBillingError("Şahıs işletmesi için Ad Soyad zorunludur.");
        return false;
      }

      if (!identityDigits && !taxDigits) {
        setBillingError(
          "Şahıs işletmesi için T.C. Kimlik No veya Vergi Kimlik No bilgilerinden en az birini girin.",
        );
        return false;
      }

      if (identityDigits && identityDigits.length !== 11) {
        setBillingError("T.C. Kimlik No 11 haneli olmalıdır.");
        return false;
      }

      if (taxDigits && taxDigits.length !== 10) {
        setBillingError("Vergi Kimlik No 10 haneli olmalıdır.");
        return false;
      }

      if (!billing.taxOffice.trim()) {
        setBillingError("Şahıs işletmesi için vergi dairesi zorunludur.");
        return false;
      }
    }

    if (billing.billingType === "corporate") {
      if (taxDigits.length !== 10) {
        setBillingError("Vergi Kimlik No 10 haneli olmalıdır.");
        return false;
      }

      if (!billing.taxOffice.trim()) {
        setBillingError("Şirket için vergi dairesi zorunludur.");
        return false;
      }
    }

    if (!billing.email.trim()) {
      setBillingError("E-posta zorunludur.");
      return false;
    }
    if (!billing.phone.trim()) {
      setBillingError("Telefon zorunludur.");
      return false;
    }
    if (!billing.city.trim()) {
      setBillingError("İl zorunludur.");
      return false;
    }
    if (!billing.district.trim()) {
      setBillingError("İlçe zorunludur.");
      return false;
    }
    if (!billing.address.trim()) {
      setBillingError("Fatura adresi zorunludur.");
      return false;
    }

    const token = getAccessToken();
    if (!token) {
      router.replace("/giris");
      return false;
    }

    setBillingSaving(true);
    setBillingError("");
    setPromoError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/billing-information`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billing),
      });
      const data = await response.json();

      if (!response.ok) {
        setBillingSaved(false);
        setBillingError(data?.message ?? "Fatura bilgileri kaydedilemedi.");
        return false;
      }

      setBillingSaved(true);
      return true;
    } catch {
      setBillingSaved(false);
      setBillingError("Fatura bilgileri kaydedilirken sunucuya bağlanılamadı.");
      return false;
    } finally {
      setBillingSaving(false);
    }
  }

  async function continueToPayment() {
    if (!billingSaved) {
      setBillingError("Önce fatura bilgilerini kaydetmelisin.");
      return;
    }

    if (!legalAccepted) {
      setPromoError(
        "Devam etmek için Ücretli İşletme Üyeliği ve Dijital Vitrin Sözleşmesini kabul etmelisin.",
      );
      return;
    }

    setPaymentMessage(
      "Fatura bilgileriniz ve sözleşme onayınız hazır. Ödeme sağlayıcısı entegrasyonu tamamlandığında güvenli ödeme ekranına yönlendirileceksiniz.",
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
              {isUpgrade ? "Paket yükseltme" : "Paketini kontrol et"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isUpgrade
                ? "Yeni paketini ve mevcut üyeliğinden düşülecek kalan tutarı kontrol et."
                : "Seçtiğin paketi kontrol et, istersen aşağıdan değiştirebilirsin."}
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
                {!isUpgrade ? (
                  <>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-orange-700">
                      Birinci Yıla Özel
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground line-through">
                      {plan.regularAnnualPrice.toLocaleString("tr-TR")} TL
                    </div>
                  </>
                ) : null}
                <div className="text-lg font-black text-slate-950">
                  {(isUpgrade && upgradeQuote
                    ? upgradeQuote.amountDue
                    : plan.annualPrice
                  ).toLocaleString("tr-TR")} TL
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isUpgrade ? "ödenecek tutar · KDV dahil" : "KDV dahil / yıl"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Paket seçimi korundu
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <ShieldCheck className="size-4 text-sky-600" />
                E-posta doğrulandı
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <CreditCard className="size-4 text-orange-600" />
                Ödeme sonrası başvuru
              </div>
            </div>

            {!isUpgrade ? (
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

                      <div className="mt-1">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-orange-700">
                          Birinci Yıla Özel
                        </div>
                        <div className="text-[11px] text-muted-foreground line-through">
                          {item.regularAnnualPrice.toLocaleString("tr-TR")} TL
                        </div>
                        <div className="text-lg font-black">
                          {item.annualPrice.toLocaleString("tr-TR")} TL
                          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                            KDV dahil / yıl
                          </span>
                        </div>
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
            ) : null}

            {isUpgrade ? (
              <div className="mt-3 border-t border-border pt-3">
                <div className="text-sm font-bold">Paket Yükseltme Özeti</div>

                {upgradeLoading ? (
                  <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                    Yükseltme tutarı hesaplanıyor...
                  </div>
                ) : upgradeError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                    {upgradeError}
                  </div>
                ) : upgradeQuote ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Mevcut paket
                      </span>
                      <span className="font-bold">
                        {upgradeQuote.currentPlan.name}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Yeni paket
                      </span>
                      <span className="font-bold">
                        {upgradeQuote.targetPlan.name}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Yeni paket yıllık fiyatı
                      </span>
                      <span className="font-bold">
                        {upgradeQuote.targetPlan.annualPrice.toLocaleString("tr-TR")} TL
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Kullanılmamış paket kredisi
                      </span>
                      <span className="font-bold text-emerald-700">
                        -{upgradeQuote.remainingCredit.toLocaleString("tr-TR")} TL
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 border-t border-orange-200 pt-3">
                      <span className="font-black">
                        Ödenecek tutar
                      </span>
                      <span className="text-xl font-black text-orange-600">
                        {upgradeQuote.amountDue.toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {billingOpen ? (
              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-3">
                  <div className="text-sm font-bold">Fatura Bilgileri</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ödemeye devam etmeden önce fatura bilgilerinizi doldurun.
                  </p>
                </div>

                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      setBilling((current) => ({
                        ...current,
                        billingType: "individual",
                        taxOffice: "",
                        taxNumber: "",
                      }))
                    }
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      billing.billingType === "individual"
                        ? "border-orange-500 bg-orange-50"
                        : "border-border"
                    }`}
                  >
                    Bireysel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setBilling((current) => ({
                        ...current,
                        billingType: "sole_proprietorship",
                      }))
                    }
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      billing.billingType === "sole_proprietorship"
                        ? "border-orange-500 bg-orange-50"
                        : "border-border"
                    }`}
                  >
                    Şahıs İşletmesi
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setBilling((current) => ({
                        ...current,
                        billingType: "corporate",
                        identityNumber: "",
                      }))
                    }
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      billing.billingType === "corporate"
                        ? "border-orange-500 bg-orange-50"
                        : "border-border"
                    }`}
                  >
                    Şirket
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">

                  {billing.billingType === "sole_proprietorship" ? (
                    <>
                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        placeholder="Ad Soyad *"
                        value={billing.fullName}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            fullName: event.target.value,
                          }))
                        }
                      />

                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        placeholder="Ticari Unvan *"
                        value={billing.nameOrTitle}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            nameOrTitle: event.target.value,
                          }))
                        }
                      />

                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        inputMode="numeric"
                        placeholder="T.C. Kimlik No"
                        value={billing.identityNumber}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            identityNumber: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 11),
                          }))
                        }
                      />

                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        inputMode="numeric"
                        placeholder="Vergi Kimlik No"
                        value={billing.taxNumber}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            taxNumber: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          }))
                        }
                      />

                      <p className="text-xs text-muted-foreground sm:col-span-2">
                        T.C. Kimlik No veya Vergi Kimlik No bilgilerinden en az biri zorunludur.
                      </p>

                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        placeholder="Vergi Dairesi *"
                        value={billing.taxOffice}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            taxOffice: event.target.value,
                          }))
                        }
                      />
                    </>
                  ) : billing.billingType === "corporate" ? (
                    <>
                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        placeholder="Ticari Unvan *"
                        value={billing.nameOrTitle}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            nameOrTitle: event.target.value,
                          }))
                        }
                      />

                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        placeholder="Vergi Dairesi *"
                        value={billing.taxOffice}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            taxOffice: event.target.value,
                          }))
                        }
                      />

                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        inputMode="numeric"
                        placeholder="Vergi Kimlik No *"
                        value={billing.taxNumber}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            taxNumber: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          }))
                        }
                      />
                    </>
                  ) : (
                    <>
                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        placeholder="Ad Soyad *"
                        value={billing.nameOrTitle}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            nameOrTitle: event.target.value,
                          }))
                        }
                      />

                      <input
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        inputMode="numeric"
                        placeholder="T.C. Kimlik No *"
                        value={billing.identityNumber}
                        onChange={(event) =>
                          setBilling((current) => ({
                            ...current,
                            identityNumber: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 11),
                          }))
                        }
                      />
                    </>
                  )}

                  <input
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                    type="email"
                    placeholder="E-posta *"
                    value={billing.email}
                    onChange={(event) => setBilling((current) => ({ ...current, email: event.target.value }))}
                  />
                  <input
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                    type="tel"
                    placeholder="Telefon *"
                    value={billing.phone}
                    onChange={(event) => setBilling((current) => ({ ...current, phone: event.target.value }))}
                  />
                  <input
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                    placeholder="İl *"
                    value={billing.city}
                    onChange={(event) => setBilling((current) => ({ ...current, city: event.target.value }))}
                  />
                  <input
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                    placeholder="İlçe *"
                    value={billing.district}
                    onChange={(event) => setBilling((current) => ({ ...current, district: event.target.value }))}
                  />
                  <textarea
                    className="min-h-20 rounded-xl border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
                    placeholder="Fatura adresi *"
                    value={billing.address}
                    onChange={(event) => setBilling((current) => ({ ...current, address: event.target.value }))}
                  />
                </div>

                {billingError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {billingError}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted-foreground">
                    {billingLoading
                      ? "Fatura bilgileri kontrol ediliyor..."
                      : billingSaved
                        ? isUpgrade
                          ? "Fatura bilgileri kaydedildi. Ödeme adımına geçebilirsin."
                          : "Fatura bilgileri kaydedildi. Promosyon adımına geçebilirsin."
                        : isUpgrade
                          ? "Ödemeden önce fatura bilgilerini kaydet."
                          : "Promosyon kodundan önce fatura bilgilerini kaydet."}
                  </span>
                  <button
                    type="button"
                    onClick={() => void saveBillingInformation()}
                    disabled={billingSaving || billingLoading}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {billingSaving
                      ? "Kaydediliyor..."
                      : billingSaved
                        ? "Fatura Bilgilerini Güncelle"
                        : "Fatura Bilgilerini Kaydet"}
                  </button>
                </div>
              </div>
            ) : null}

            
            {!isUpgrade ? (
            <div className="mt-3 border-t border-border pt-3">
              <label className="mb-1 block text-[13px] font-medium">
                Promosyon kodu
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <BadgePercent className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={promoCode}
                    disabled={!billingSaved}
                    onChange={(event) =>
                      setPromoCode(event.target.value.toUpperCase())
                    }
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
                    placeholder={billingSaved ? "Varsa promosyon kodunu gir" : "Önce fatura bilgilerini kaydet"}
                    maxLength={50}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void applyPromotionCode()}
                  disabled={promoApplying || !billingSaved}
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
                        Birinci yıla özel paket fiyatı:{" "}
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
                        Ödenmesi gereken tutar (KDV dahil)
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
            ) : null}

            {billingSaved ? (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
                <div className="text-sm font-black text-slate-950">
                  Sipariş Özeti
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Paket</span>
                    <span className="text-right font-bold">
                      {isUpgrade && upgradeQuote
                        ? upgradeQuote.targetPlan.name
                        : plan.name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Üyelik dönemi</span>
                    <span className="font-bold">
                      {isUpgrade ? "Mevcut üyelik dönemi" : "12 ay"}
                    </span>
                  </div>

                  {!isUpgrade ? (
                    <>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Normal yıllık fiyat</span>
                        <span className="line-through">
                          {plan.regularAnnualPrice.toLocaleString("tr-TR")} TL
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Birinci yıla özel fiyat</span>
                        <span className="font-bold">
                          {plan.annualPrice.toLocaleString("tr-TR")} TL
                        </span>
                      </div>

                      {promoResult ? (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">
                            Promosyon indirimi ({promoResult.code})
                          </span>
                          <span className="font-bold text-emerald-700">
                            -{promoResult.discountAmount.toLocaleString("tr-TR")} TL
                          </span>
                        </div>
                      ) : null}
                    </>
                  ) : upgradeQuote ? (
                    <>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Yeni paket yıllık fiyatı</span>
                        <span className="font-bold">
                          {upgradeQuote.targetPlan.annualPrice.toLocaleString("tr-TR")} TL
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Kullanılmamış paket kredisi</span>
                        <span className="font-bold text-emerald-700">
                          -{upgradeQuote.remainingCredit.toLocaleString("tr-TR")} TL
                        </span>
                      </div>
                    </>
                  ) : null}

                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Fatura</span>
                    <span className="max-w-[65%] text-right font-bold">
                      {billing.nameOrTitle}
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-4 border-t border-orange-200 pt-3">
                    <div>
                      <div className="font-black">Ödenecek Toplam</div>
                      <div className="text-[11px] text-muted-foreground">
                        KDV dahil nihai tutar
                      </div>
                    </div>
                    <div className="text-2xl font-black text-orange-600">
                      {(isUpgrade && upgradeQuote
                        ? upgradeQuote.amountDue
                        : promoResult
                          ? promoResult.finalPrice
                          : plan.annualPrice
                      ).toLocaleString("tr-TR")} TL
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={(event) => {
                    setLegalAccepted(event.target.checked);
                    if (event.target.checked) {
                      setPromoError("");
                    }
                  }}
                  className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
                />
                <span className="text-sm leading-6 text-muted-foreground">
                  <button
                    type="button"
                    onClick={() =>
                      setLegalModalDocument(
                        getLegalDocument("ucretli-isletme-uyeligi") ?? null,
                      )
                    }
                    className="font-semibold text-foreground underline underline-offset-2"
                  >
                    Ücretli İşletme Üyeliği ve Dijital Vitrin Sözleşmesi
                  </button>
                  &apos;ni okudum ve kabul ediyorum.{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setLegalModalDocument(
                        getLegalDocument("iptal-iade-politikasi") ?? null,
                      )
                    }
                    className="font-semibold text-foreground underline underline-offset-2"
                  >
                    İptal ve İade Politikası
                  </button>
                  &apos;nı inceledim.
                </span>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
              >
                Geri
              </button>

              {!isUpgrade && promoResult?.finalPrice === 0 ? (
                <button
                  type="button"
                  onClick={() => void completeFreeRegistration()}
                  disabled={
                    completingRegistration ||
                    !billingSaved ||
                    !legalAccepted
                  }
                  className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {completingRegistration
                    ? "Tamamlanıyor..."
                    : "İşletme Kaydını Tamamla"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void continueToPayment()}
                  disabled={
                    billingSaving ||
                    !billingSaved ||
                    !legalAccepted ||
                    (isUpgrade && (upgradeLoading || !upgradeQuote))
                  }
                  className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {billingSaving
                    ? "Kaydediliyor..."
                    : isUpgrade
                      ? "Yükseltme Ödemesine Geç"
                      : "Ödemeye Geç"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {paymentMessage ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-info-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPaymentMessage("");
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-orange-50 text-2xl">
              🔒
            </div>

            <h2
              id="payment-info-title"
              className="mt-4 text-center font-display text-xl font-black text-slate-950"
            >
              Ödeme Altyapısı Hazırlanıyor
            </h2>

            <p className="mt-3 text-center text-sm leading-6 text-slate-600">
              {paymentMessage}
            </p>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setPaymentMessage("")}
                className="min-w-32 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {legalModalDocument ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLegalModalDocument(null);
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-orange-600">
                  Sözleşmeler ve Yasal Metinler
                </div>
                <h2
                  id="legal-modal-title"
                  className="mt-1 font-display text-xl font-black text-slate-950 sm:text-2xl"
                >
                  {legalModalDocument.title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {legalModalDocument.summary}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLegalModalDocument(null)}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                aria-label="Sözleşmeyi kapat"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <div className="space-y-7">
                {legalModalDocument.sections.map((section) => (
                  <section key={section.title}>
                    <h3 className="font-display text-base font-bold text-slate-950 sm:text-lg">
                      {section.title}
                    </h3>

                    <div className="mt-2 space-y-3 text-sm leading-7 text-slate-700">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <span className="text-xs text-slate-500">
                Metni okuduktan sonra onay kutusunu ayrıca işaretleyin.
              </span>

              <button
                type="button"
                onClick={() => setLegalModalDocument(null)}
                className="shrink-0 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700"
              >
                Okudum, Kapat
              </button>
            </div>
          </div>
        </div>
      ) : null}
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