"use client";

type ProviderKind = "usta" | "esnaf";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TaxonomyV3Picker } from "@/components/auth/TaxonomyV3Picker";
import { Hammer, Store } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SearchableCatalogSelect } from "@/components/auth/SearchableCatalogSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken, getStoredUser, saveAuth, type AuthResponse } from "@/lib/auth";
import type { CategoryDto } from "@/lib/categories";

type DistrictDto = {
  id: string;
  slug: string;
  name: string;
};

type CityDto = {
  id: string;
  slug: string;
  name: string;
  districts: DistrictDto[];
};

const BUSINESS_DRAFT_KEY = "neyeihtiyacvar.businessRegistrationDraft";

type BusinessRegistrationDraft = {
  businessName?: string;
  applicantName?: string;
  email?: string;
  phoneNumber?: string;
  citySlug?: string;
  districtSlug?: string;
  categorySlug?: string;
  serviceSlug?: string;
  additionalServiceSlug?: string | null;
};
type BusinessRegisterResponse = AuthResponse & {
  applicationId: string | null;
  providerId: string | null;
  verificationRequired: boolean;
  message: string;
};

function toSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizePhoneDigits(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("90") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

function formatPhone(value: string) {
  const digits = normalizePhoneDigits(value);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 8);
  const p4 = digits.slice(8, 10);

  return [p1, p2, p3, p4].filter(Boolean).join(" ");
}

export function BusinessRegistrationForm({
  selectedPlanCode,
  onStepChange,
}: {
  selectedPlanCode?: string | null;
  onStepChange?: (step: number) => void;
}) {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cities, setCities] = useState<CityDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);  const [providerKind, setProviderKind] = useState<ProviderKind | null>(null);
  const [wizardStep, setWizardStep] = useState(2);
  const membershipContinueUrl = selectedPlanCode
    ? `/uyelik/odeme?paket=${encodeURIComponent(selectedPlanCode)}`
    : "/uyelik/odeme";


  const [businessName, setBusinessName] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [additionalCategorySlug, setAdditionalCategorySlug] = useState("");
  const [additionalServiceSlug, setAdditionalServiceSlug] = useState("");
  const [extraServices, setExtraServices] = useState<
    Array<{ categorySlug: string; serviceSlug: string }>
  >([]);
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordAgain, setShowPasswordAgain] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [existingAccountMode, setExistingAccountMode] =
    useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExistingAccountMode(
        Boolean(getStoredUser() && getAccessToken()),
      );
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    const existingUser = getStoredUser();

    let draft: BusinessRegistrationDraft | null = null;

    const rawDraft =
      sessionStorage.getItem(BUSINESS_DRAFT_KEY) ??
      localStorage.getItem(BUSINESS_DRAFT_KEY);

    if (rawDraft) {
      try {
        draft = JSON.parse(rawDraft) as BusinessRegistrationDraft;
      } catch {
        sessionStorage.removeItem(BUSINESS_DRAFT_KEY);
        localStorage.removeItem(BUSINESS_DRAFT_KEY);
      }
    }

    const timer = window.setTimeout(() => {
      setBusinessName((current) =>
        current || draft?.businessName?.trim() || "",
      );

      setApplicantName((current) =>
        current ||
        draft?.applicantName?.trim() ||
        existingUser?.displayName?.trim() ||
        "",
      );

      setEmail((current) =>
        current ||
        draft?.email?.trim() ||
        existingUser?.email?.trim() ||
        "",
      );

      setPhoneNumber((current) =>
        current ||
        draft?.phoneNumber?.trim() ||
        existingUser?.phoneNumber?.trim() ||
        "",
      );

      setCitySlug((current) =>
        current ||
        draft?.citySlug?.trim() ||
        existingUser?.citySlug?.trim() ||
        "",
      );

      setDistrictSlug((current) =>
        current ||
        draft?.districtSlug?.trim() ||
        existingUser?.districtSlug?.trim() ||
        "",
      );

      setCategorySlug((current) =>
        current || draft?.categorySlug?.trim() || "",
      );

      setServiceSlug((current) =>
        current || draft?.serviceSlug?.trim() || "",
      );

      setAdditionalServiceSlug((current) =>
        current ||
        draft?.additionalServiceSlug?.trim() ||
        "",
      );
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);
  const [businessTermsAccepted, setBusinessTermsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [verifyWorking, setVerifyWorking] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] =
    useState<BusinessRegisterResponse | null>(null);
  useEffect(() => {
    onStepChange?.(registered ? 5 : wizardStep);
  }, [onStepChange, registered, wizardStep]);
function chooseProviderKind(kind: ProviderKind) {
    setProviderKind(kind);
    setWizardStep(2);
    sessionStorage.setItem("neyeihtiyacvar.providerKind", kind);
    setError("");
  }

  function resetProviderKind() {
    setProviderKind(null);
    setWizardStep(2);
    sessionStorage.removeItem("neyeihtiyacvar.providerKind");
    setError("");
  }
  const planServiceLimit =
    selectedPlanCode === "profesyonel"
      ? 12
      : selectedPlanCode === "avantaj"
        ? 5
        : 2;

  const additionalServiceLimit = planServiceLimit - 1;

  const allAdditionalSelections = [
    {
      categorySlug: additionalCategorySlug,
      serviceSlug: additionalServiceSlug,
    },
    ...extraServices,
  ].slice(0, additionalServiceLimit);

  function setAdditionalSelection(
    slotIndex: number,
    patch: Partial<{
      categorySlug: string;
      serviceSlug: string;
    }>,
  ) {
    if (slotIndex === 0) {
      if (patch.categorySlug !== undefined) {
        setAdditionalCategorySlug(patch.categorySlug);
      }

      if (patch.serviceSlug !== undefined) {
        setAdditionalServiceSlug(patch.serviceSlug);
      }

      return;
    }

    const extraIndex = slotIndex - 1;

    setExtraServices((current) => {
      const next = [...current];

      while (next.length <= extraIndex) {
        next.push({
          categorySlug: "",
          serviceSlug: "",
        });
      }

      next[extraIndex] = {
        ...next[extraIndex],
        ...patch,
      };

      return next;
    });
  }

  function clearAdditionalSelection(slotIndex: number) {
    setAdditionalSelection(slotIndex, {
      categorySlug: "",
      serviceSlug: "",
    });
  }
  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === categorySlug) ?? null,
    [categories, categorySlug],
  );

  const selectedCity = useMemo(
    () => cities.find((item) => item.slug === citySlug) ?? null,
    [cities, citySlug],
  );

  const serviceOptions = selectedCategory?.services ?? [];
  const selectedAdditionalCategory = useMemo(
    () =>
      categories.find(
        (category) => category.slug === additionalCategorySlug,
      ) ?? null,
    [categories, additionalCategorySlug],
  );

  const additionalServiceOptions =
    selectedAdditionalCategory?.services ?? [];
  const districtOptions = selectedCity?.districts ?? [];

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [categoryResponse, locationResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/api/locations`, { cache: "no-store" }),
        ]);

        if (!categoryResponse.ok || !locationResponse.ok) {
          throw new Error();
        }

        const [categoryData, locationData] = await Promise.all([
          categoryResponse.json(),
          locationResponse.json(),
        ]);

        if (active) {
          setCategories(categoryData);
          setCities(locationData);
        }
      } catch {
        if (active) {
          setError("Kategori ve konum bilgileri yüklenemedi.");
        }
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (typeof window !== "undefined") {
      if (selectedPlanCode) {
        sessionStorage.setItem(
          "neyeihtiyacvar.selectedPlanCode",
          selectedPlanCode,
        );
      } else {
        sessionStorage.removeItem(
          "neyeihtiyacvar.selectedPlanCode",
        );
      }
    }

    const phoneDigits =
      normalizePhoneDigits(phoneNumber);

    if (
      (providerKind === "esnaf" &&
        !businessName.trim()) ||
      !applicantName.trim() ||
      !email.trim() ||
      phoneDigits.length !== 10 ||
      !phoneDigits.startsWith("5") ||
      !citySlug ||
      !districtSlug ||
      !categorySlug ||
      !serviceSlug ||
      !businessTermsAccepted ||
      !termsAccepted ||
      (!existingAccountMode &&
        (!password || !passwordAgain))
    ) {
      setError(
        "Lütfen zorunlu alanların tamamını doğru şekilde doldur.",
      );
      return;
    }

    if (!existingAccountMode) {
      if (password !== passwordAgain) {
        setError(
          "Şifreler birbiriyle aynı olmalıdır.",
        );
        return;
      }

      if (
        password.length < 8 ||
        !/[A-ZÇĞİÖŞÜ]/.test(password) ||
        !/[a-zçğıöşü]/.test(password) ||
        !/\d/.test(password)
      ) {
        setError(
          "Şifre en az 8 karakter olmalı; büyük harf, küçük harf ve rakam içermelidir.",
        );
        return;
      }
    }

    if (
      additionalCategorySlug === categorySlug &&
      additionalServiceSlug &&
      additionalServiceSlug === serviceSlug
    ) {
      setError(
        "Ek hizmet, ana hizmet ile aynı olamaz.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const accessToken =
        existingAccountMode
          ? getAccessToken()
          : null;

      const response = await fetch(
        `${apiBaseUrl}/api/provider-applications/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken
              ? {
                  Authorization:
                    `Bearer ${accessToken}`,
                }
              : {}),
          },
          body: JSON.stringify({
            businessName:
              providerKind === "usta"
                ? applicantName.trim()
                : businessName.trim(),
            applicantName:
              applicantName.trim(),
            email: email.trim(),
            phoneNumber:
              `+90${phoneDigits}`,
            citySlug,
            districtSlug,
            categorySlug,
            serviceSlug,
            additionalCategorySlug:
              additionalCategorySlug || null,
            additionalServiceSlug:
              additionalServiceSlug || null,
            password:
              existingAccountMode
                ? null
                : password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const firstError =
          data?.errors &&
          Object.values(data.errors)
            .flat()
            .find(Boolean);

        setError(
          (typeof firstError === "string"
            ? firstError
            : null) ??
            data?.message ??
            "İşletme kaydı oluşturulamadı.",
        );
        return;
      }

      const registerData =
        data as BusinessRegisterResponse;

      saveAuth(registerData);

      const businessDraft =
        JSON.stringify({
          providerKind,
          businessName:
            providerKind === "usta"
              ? applicantName.trim()
              : businessName.trim(),
          applicantName:
            applicantName.trim(),
          email: email.trim(),
          phoneNumber:
            `+90${phoneDigits}`,
          citySlug,
          districtSlug,
          categorySlug,
          serviceSlug,
          additionalServiceSelections:
            allAdditionalSelections
              .filter(
                (item) =>
                  item.categorySlug &&
                  item.serviceSlug,
              )
              .map((item) => ({
                categorySlug:
                  item.categorySlug,
                serviceSlug:
                  item.serviceSlug,
              })),
          additionalServices:
            allAdditionalSelections
              .map(
                (item) =>
                  item.serviceSlug,
              )
              .filter(Boolean),
          additionalCategorySlug:
            additionalCategorySlug || null,
          additionalServiceSlug:
            additionalServiceSlug || null,
          selectedPlanCode:
            selectedPlanCode ?? null,
          userId:
            registerData.user.id,
        });

      sessionStorage.setItem(
        BUSINESS_DRAFT_KEY,
        businessDraft,
      );

      localStorage.setItem(
        BUSINESS_DRAFT_KEY,
        businessDraft,
      );

      if (selectedPlanCode) {
        sessionStorage.setItem(
          "neyeihtiyacvar.selectedPlanCode",
          selectedPlanCode,
        );
      }

      /*
       * Mevcut ve zaten dogrulanmis kullanici icin
       * tekrar dogrulama ekrani gostermiyoruz.
       */
      if (
        existingAccountMode &&
        !registerData.verificationRequired
      ) {
        window.location.assign(
          membershipContinueUrl,
        );
        return;
      }

      setRegistered(registerData);
    } catch {
      setError(
        "Sunucuya bağlanılamadı. Backend bağlantısını kontrol et.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function verifyNow() {
    if (!registered) {
      return;
    }

    setVerifyWorking(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/verification/resend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: registered.user.id,
            channel: "email",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ??
            "E-posta doğrulama kodu gönderilemedi.",
        );
        return;
      }

      if (data?.developmentCode) {
        sessionStorage.setItem(
          "neyeihtiyacvar.devVerificationCodes",
          JSON.stringify({
            email: String(data.developmentCode),
          }),
        );
      }

      const params = new URLSearchParams({
        userId: registered.user.id,
        email: registered.user.email,
        phone: registered.user.phoneNumber ?? "",
        channel: "email",
        returnUrl: "/uyelik/odeme",
      });

      router.push(`/dogrula?${params.toString()}`);
    } catch {
      setError("Doğrulama kodu istenirken sunucuya bağlanılamadı.");
    } finally {
      setVerifyWorking(false);
    }
  }

  if (registered) {
    return (
      <div className="mt-5">
        <div className="rounded-2xl border border-green-200 bg-card p-6 shadow-soft">

<p className="text-sm font-semibold text-primary">
          Hesap oluşturuldu
        </p>

        <h2 className="mt-2 font-display text-2xl font-bold">
          Ödeme öncesi hesabın hazır
        </h2>

        <p className="mt-3 leading-7 text-muted-foreground">
          İşletme başvurun henüz oluşturulmadı. İstersen şimdi hesabını
          doğrula veya paket ve ödeme adımına devam et. İşletme başvurusu
          ödeme başarıyla tamamlandıktan sonra oluşturulacak.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <Button
                type="button"
                onClick={() => void verifyNow()}
                disabled={verifyWorking}
              >
                {verifyWorking ? "Kod gönderiliyor..." : "Hesabı Doğrula"}
              </Button>
<Button
            type="button"
            onClick={() => {
                  const selectedPlan = sessionStorage
                    .getItem("neyeihtiyacvar.selectedPlanCode")
                    ?.trim()
                    .toLowerCase();

                  const target =
                    selectedPlan === "kobi" ||
                    selectedPlan === "avantaj" ||
                    selectedPlan === "profesyonel"
                      ? `/uyelik/odeme?paket=${encodeURIComponent(selectedPlan)}`
                      : "/uyelik/odeme";

                  window.location.assign(target);
                }}
          >
                Doğrulamadan Devam Et
              </Button>
        </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            Geri
          </button>

          <button
            type="button"
            onClick={() => {
              const plan =
                sessionStorage
                  .getItem("neyeihtiyacvar.selectedPlanCode")
                  ?.trim()
                  .toLowerCase();

              const target =
                plan === "kobi" ||
                plan === "avantaj" ||
                plan === "profesyonel"
                  ? `/uyelik/odeme?paket=${encodeURIComponent(plan)}`
                  : "/uyelik/odeme";

              window.location.assign(target);
            }}
            className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700"
          >
            İleri
          </button>
        </div>
<p className="mt-4 text-xs leading-5 text-muted-foreground">
          İşletme yayına alınmadan önce e-posta ve telefon
          doğrulamasının ikisi de tamamlanmalıdır.
        </p>
        </div>
      </div>
    );
  }

  if (!providerKind) {
    const planName =
      selectedPlanCode === "kobi"
        ? "KOBİ"
        : selectedPlanCode === "avantaj"
          ? "Avantaj"
          : selectedPlanCode === "profesyonel"
            ? "Profesyonel"
            : null;

    return (
      <div className="mt-3 rounded-[22px] border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Adım 1 / 5
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold">
              Nasıl hizmet veriyorsunuz?
            </h2>
            <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
              Size uygun kayıt yolunu seçin. Sonraki adımlar seçiminize göre hazırlanacak.
            </p>
          </div>

          {planName ? (
            <div className="shrink-0 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                Seçilen paket
              </div>
              <div className="text-sm font-bold text-slate-950">{planName}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => chooseProviderKind("usta")}
            className="group rounded-2xl border-2 border-border bg-background p-4 text-left transition hover:border-orange-400 hover:bg-orange-50/50"
          >
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700">
                <Hammer className="size-6" strokeWidth={2.2} />
              </div>
              <div>
                <div className="font-display text-lg font-bold">Usta</div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Bireysel olarak hizmet veriyorum.
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
              Örn. elektrikçi, tesisatçı, tamirci, boya ustası, teknik servis.
            </div>
          </button>

          <button
            type="button"
            onClick={() => chooseProviderKind("esnaf")}
            className="group rounded-2xl border-2 border-border bg-background p-4 text-left transition hover:border-orange-400 hover:bg-orange-50/50"
          >
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
                <Store className="size-6" strokeWidth={2.2} />
              </div>
              <div>
                <div className="font-display text-lg font-bold">
                  Esnaf / İşletme
                </div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Dükkânım veya işletmem üzerinden hizmet veriyorum.
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
              Örn. mağaza, servis, firma, ofis, atölye veya ticari işletme.
            </div>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Bu seçim profil ve kayıt alanlarını belirleyecek.</span>
          <span className="font-semibold text-foreground">Sonradan değiştirilebilir.</span>
        </div>
      </div>
    );
  }
  if (providerKind && wizardStep === 2) {
    const isUsta = providerKind === "usta";

    function goNextFromStep2() {
      const phoneDigits = phoneNumber
        .replace(/\D/g, "")
        .replace(/^90/, "")
        .replace(/^0/, "")
        .slice(-10);

      if (
        !applicantName.trim() ||
        !email.trim() ||
        phoneDigits.length !== 10 ||
        (!isUsta && !businessName.trim())
      ) {
        setError("Lütfen zorunlu alanları eksiksiz doldurun.");
        return;
      }

      setError("");
      setWizardStep(3);
    }

    return (
      <div className="mt-3">
        <div className="rounded-[22px] border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="mt-0.5 font-display text-xl font-bold">
              {isUsta ? "Usta bilgileri" : "İşletme bilgileri"}
            </h2>
            <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
              {isUsta
                ? "Sizi müşterilere tanıtacak temel bilgileri girin."
                : "İşletmenizi ve yetkili kişiyi tanımlayan temel bilgileri girin."}
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-border bg-muted/40 px-3 py-2 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Kayıt türü
            </div>
            <div className="text-sm font-bold text-foreground">
              {isUsta ? "Usta" : "Esnaf / İşletme"}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
          {!isUsta ? (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[13px] font-medium">
                İşletme Adı *
              </label>
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                maxLength={200}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
                placeholder="İşletme adını yazın"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-[13px] font-medium">
              {isUsta ? "Ad Soyad *" : "Yetkili Kişi Adı Soyadı *"}
            </label>
            <input
              value={applicantName}
              onChange={(event) => setApplicantName(event.target.value)}
              maxLength={150}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
              placeholder={isUsta ? "Adınız ve soyadınız" : "Yetkili kişinin adı soyadı"}
            />
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium">E-posta *</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
              placeholder="ornek@eposta.com"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-[13px] font-medium">Telefon *</label>
            <div className="flex">
              <div className="grid h-10 w-14 shrink-0 place-items-center rounded-l-xl border border-r-0 border-input bg-muted/40 text-sm">
                +90
              </div>
              <input
                inputMode="numeric"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="h-10 w-full rounded-r-xl border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
                placeholder="5XX XXX XX XX"
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => { setError(""); setProviderKind(null); setWizardStep(2); }}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            Geri
          </button>

          <button
            type="button"
            onClick={goNextFromStep2}
            className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700"
          >
            Devam Et
          </button>
        </div>
        </div>
      </div>
    );
  }
  const inputClass =
    "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15";
  if (providerKind && wizardStep === 3) {
    const goNextFromStep3 = () => {
      if (!citySlug || !districtSlug || !categorySlug || !serviceSlug) {
        setError("İl, ilçe, kategori ve ana hizmet alanlarını seçin.");
        return;
      }

      setError("");
      setWizardStep(4);
    };

    return (
      <div className="mt-3">
        <div className="rounded-[22px] border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="mt-0.5 font-display text-xl font-bold">
            Konum ve hizmet bilgileri
          </h2>
          <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
            Hizmet verdiğiniz bölgeyi ve hizmet alanınızı seçin.
          </p>
        </div>

        <div className="mt-3 grid gap-x-3 gap-y-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13px] font-medium">İl *</label>
            <Select
              value={citySlug}
              onValueChange={(value) => {
                setCitySlug(value);
                setDistrictSlug("");
              }}
              disabled={catalogLoading}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="İl seç" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.slug}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium">İlçe *</label>
            <Select
              value={districtSlug}
              onValueChange={setDistrictSlug}
              disabled={!citySlug || catalogLoading}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="İlçe seç" />
              </SelectTrigger>
              <SelectContent>
                {districtOptions.map((district) => (
                  <SelectItem key={district.id} value={district.slug}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 rounded-2xl border border-border bg-muted/20 p-4">
  <div className="mb-3">
    <div className="text-sm font-semibold">
      İşletmenin ana hizmetini seç
    </div>

    <div className="mt-1 text-xs text-muted-foreground">
      Ana Alan → Hizmet Grubu → Hizmet → Alt Uzmanlık
    </div>
  </div>

  <TaxonomyV3Picker
    initialCategorySlug={categorySlug}
    initialServiceSlug={serviceSlug}
    onChange={(selection) => {
      setCategorySlug(
        selection?.legacyCategorySlug ?? "",
      );

      setServiceSlug(
        selection?.legacyServiceSlug ?? "",
      );

      setAdditionalCategorySlug("");
      setAdditionalServiceSlug("");
    }}
  />
</div>
<div className="sm:col-span-2 rounded-2xl border border-border bg-muted/20 p-4">
  <div className="mb-3">
    <div className="text-sm font-bold text-foreground">
      2. Hizmet
    </div>

    <div className="mt-1 text-xs text-muted-foreground">
      İsteğe bağlıdır. İşletmenin sunduğu ikinci hizmeti seçebilirsin.
    </div>

    <div className="mt-1 text-xs text-muted-foreground">
      Ana Alan → Hizmet Grubu → Hizmet → Alt Uzmanlık
    </div>
  </div>

  <TaxonomyV3Picker
    initialCategorySlug={additionalCategorySlug}
    initialServiceSlug={additionalServiceSlug}
    onChange={(selection) => {
      setAdditionalCategorySlug(
        selection?.legacyCategorySlug ?? "",
      );

      setAdditionalServiceSlug(
        selection?.legacyServiceSlug ?? "",
      );
    }}
  />

  {additionalCategorySlug || additionalServiceSlug ? (
    <button
      type="button"
      onClick={() => {
        setAdditionalCategorySlug("");
        setAdditionalServiceSlug("");
      }}
      className="mt-3 text-xs font-semibold text-primary hover:underline"
    >
      2. Hizmeti temizle
    </button>
  ) : null}
</div>
        </div>

        {error ? (
          <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => {
              setError("");
              setWizardStep(2);
            }}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            Geri
          </button>

          <button
            type="button"
            onClick={goNextFromStep3}
            className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700"
          >
            İleri
          </button>
        </div>
        </div>
      </div>
    );
  }

  if (providerKind && wizardStep === 4) {
    return (
      <div className="mt-3">
        <form
          onSubmit={handleSubmit}
          className="rounded-[22px] border border-border bg-card p-4 shadow-sm"
        >
          <h2 className="font-display text-xl font-bold">
            Güvenlik ve koşullar
          </h2>

          <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
            {existingAccountMode
              ? "Mevcut hesabın kullanılacak. İşletme kaydı için gerekli koşulları onaylayarak devam et."
              : "Şifrenizi oluşturun ve kayıt koşullarını onaylayın."}
          </p>

          {!existingAccountMode ? (
            <>
              <div className="mt-3 grid gap-x-2 gap-y-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-medium">
                    Şifre *
                  </label>

                  <div className="relative">
                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
                      placeholder="En az 8 karakter"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current,
                        )
                      }
                      className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={
                        showPassword
                          ? "Şifreyi gizle"
                          : "Şifreyi göster"
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {showPassword ? (
                          <>
                            <path d="m2 2 20 20" />
                            <path d="M6.7 6.7C4.8 8 3.4 9.8 2.5 12c1.8 4.4 5.2 7 9.5 7 1.5 0 2.9-.3 4.1-.9" />
                            <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
                            <path d="M14.1 5.2c3.3.7 5.9 3.1 7.4 6.8-.6 1.5-1.5 2.8-2.5 3.9" />
                          </>
                        ) : (
                          <>
                            <path d="M2.5 12S5.5 5 12 5s9.5 7 9.5 7-3 7-9.5 7S2.5 12 2.5 12Z" />
                            <circle
                              cx="12"
                              cy="12"
                              r="3"
                            />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium">
                    Şifre Tekrar *
                  </label>

                  <div className="relative">
                    <input
                      type={
                        showPasswordAgain
                          ? "text"
                          : "password"
                      }
                      value={passwordAgain}
                      onChange={(event) =>
                        setPasswordAgain(
                          event.target.value,
                        )
                      }
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
                      placeholder="Şifreyi tekrar yazın"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswordAgain(
                          (current) =>
                            !current,
                        )
                      }
                      className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={
                        showPasswordAgain
                          ? "Şifreyi gizle"
                          : "Şifreyi göster"
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {showPasswordAgain ? (
                          <>
                            <path d="m2 2 20 20" />
                            <path d="M6.7 6.7C4.8 8 3.4 9.8 2.5 12c1.8 4.4 5.2 7 9.5 7 1.5 0 2.9-.3 4.1-.9" />
                            <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
                            <path d="M14.1 5.2c3.3.7 5.9 3.1 7.4 6.8-.6 1.5-1.5 2.8-2.5 3.9" />
                          </>
                        ) : (
                          <>
                            <path d="M2.5 12S5.5 5 12 5s9.5 7 9.5 7-3 7-9.5 7S2.5 12 2.5 12Z" />
                            <circle
                              cx="12"
                              cy="12"
                              r="3"
                            />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <p className="mt-1.5 text-[11px] text-muted-foreground">
                En az 8 karakter; büyük harf, küçük harf ve rakam içermelidir.
              </p>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] leading-5 text-emerald-800">
              Giriş yaptığın mevcut kullanıcı hesabı kullanılacak.
              Şifreni tekrar girmen gerekmiyor.
            </div>
          )}

          <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <label className="flex items-start gap-2 text-[13px] leading-5">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) =>
                  setTermsAccepted(
                    event.target.checked,
                  )
                }
                className="mt-1 size-4"
              />

              <span>
                Kullanım ve Üyelik Koşulları metnini
                okudum ve kabul ediyorum. *
              </span>
            </label>

            <label className="flex items-start gap-2 text-[13px] leading-5">
              <input
                type="checkbox"
                checked={businessTermsAccepted}
                onChange={(event) =>
                  setBusinessTermsAccepted(
                    event.target.checked,
                  )
                }
                className="mt-1 size-4"
              />

              <span>
                İşletme ve Hizmet Sağlayıcı Koşulları
                metnini okudum ve kabul ediyorum. *
              </span>
            </label>
          </div>

          {error ? (
            <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                setWizardStep(3);
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
            >
              Geri
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                !termsAccepted ||
                !businessTermsAccepted
              }
              className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Devam ediliyor..."
                : "Devam Et"}
            </button>
          </div>
        </form>
      </div>
    );
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7"
    >
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
        <div className="text-xs text-muted-foreground">
          Kayıt türü:{" "}
          <strong className="text-foreground">
            {providerKind === "usta" ? "Usta" : "Esnaf / İşletme"}
          </strong>
        </div>
        <button
          type="button"
          onClick={() => { setError(""); setProviderKind(null); setWizardStep(2); }}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Hizmet türünü değiştir
        </button>
      </div>
      <div className="mb-6">
        <p className="text-sm font-semibold text-primary">
          İşletme bilgileri
        </p>
        <h2 className="mt-1 font-display text-xl font-bold">
          {providerKind === "usta" ? "Usta hesabını oluştur" : "İşletme hesabını oluştur"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          İşletme hesabı ve işletme başvurusu aynı anda oluşturulur.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            İşletme Adı *
          </label>
          <input
            className={inputClass}
            value={businessName}
            onChange={(event) =>
              setBusinessName(event.target.value)
            }
            maxLength={200}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            {providerKind === "usta" ? "Ad Soyad *" : "Yetkili Kişi Adı Soyadı *"}
          </label>
          <input
            className={inputClass}
            value={applicantName}
            onChange={(event) =>
              setApplicantName(event.target.value)
            }
            maxLength={150}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            E-posta *
          </label>
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Telefon *
          </label>
          <div className="flex">
            <span className="flex h-11 items-center rounded-l-xl border border-r-0 border-input bg-muted px-3 text-sm">
              +90
            </span>
            <input
              inputMode="numeric"
              className={`${inputClass} rounded-l-none`}
              value={formatPhone(phoneNumber)}
              onChange={(event) =>
                setPhoneNumber(event.target.value)
              }
              placeholder="5XX XXX XX XX"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            İl *
          </label>
          <Select
            value={citySlug}
            onValueChange={(value) => {
              setCitySlug(value);
              setDistrictSlug("");
            }}
            disabled={catalogLoading}
          >
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="İl seç" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.slug}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            İlçe *
          </label>
          <Select
            value={districtSlug}
            onValueChange={setDistrictSlug}
            disabled={!selectedCity}
          >
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="İlçe seç" />
            </SelectTrigger>
            <SelectContent>
              {districtOptions.map((district) => (
                <SelectItem
                  key={district.id}
                  value={district.slug}
                >
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
  <label className="mb-1 block text-xs font-semibold">
    1. Hizmet - Ana Kategori *
  </label>
  <SearchableCatalogSelect
    value={categorySlug}
    placeholder="Kategori ara veya seç"
    searchPlaceholder="Örn. hafriyat, teknoloji, market..."
    options={categories.map((category) => ({
      value: category.slug,
      label: category.name,
      keywords: category.services.join(" "),
    }))}
    onValueChange={(value) => {
      setCategorySlug(value);
      setServiceSlug("");
      setAdditionalCategorySlug("");
      setAdditionalServiceSlug("");
    }}
  />
</div>

        <div>
  <label className="mb-1 block text-xs font-semibold">
    1. Hizmet - Ana Hizmet / Alt Kategori *
  </label>
  <SearchableCatalogSelect
    value={serviceSlug}
    disabled={!selectedCategory}
    placeholder={
      selectedCategory
        ? "Hizmet ara veya seç"
        : "Önce kategori seç"
    }
    searchPlaceholder="Örn. hafriyat, ekskavatör, elektrikçi..."
    options={serviceOptions.map((service) => ({
      value: toSlug(service),
      label: service,
    }))}
    onValueChange={(value) => {
      setServiceSlug(value);
      setAdditionalCategorySlug("");
      setAdditionalServiceSlug("");
    }}
  />
</div>

        <div className="sm:col-span-2">
  <label className="mb-1 block text-xs font-semibold">
    Ek Hizmet{" "}
    <span className="font-normal text-muted-foreground">
      (isteğe bağlı, en fazla 1)
    </span>
  </label>
  <SearchableCatalogSelect
    value={additionalServiceSlug || "none"}
    disabled={!selectedCategory}
    placeholder="Ek hizmet ara veya seç"
    searchPlaceholder="Ek hizmet yazın..."
    options={[
      { value: "none", label: "Ek hizmet yok" },
      ...serviceOptions
        .filter((service) => toSlug(service) !== serviceSlug)
        .map((service) => ({
          value: toSlug(service),
          label: service,
        })),
    ]}
    onValueChange={(value) =>
      setAdditionalServiceSlug(value === "none" ? "" : value)
    }
  />
</div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Şifre *
          </label>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="new-password"
            placeholder="En az 8 karakter"
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            En az 8 karakter; büyük harf, küçük harf ve rakam içermelidir.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Şifre Tekrar *
          </label>
          <input
            type="password"
            className={inputClass}
            value={passwordAgain}
            onChange={(event) =>
              setPasswordAgain(event.target.value)
            }
            autoComplete="new-password"
          />
        </div>

        <div className="sm:col-span-2 space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span className="text-sm leading-6">
              <Link
                href="/sozlesmeler/kullanim-kosullari"
                target="_blank"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Kullanım ve Üyelik Koşulları
              </Link>{" "}
              metnini okudum ve kabul ediyorum. *
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={businessTermsAccepted}
              onChange={(event) =>
                setBusinessTermsAccepted(event.target.checked)
              }
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span className="text-sm leading-6">
              <Link
                href="/sozlesmeler/isletme-kosullari"
                target="_blank"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                İşletme ve Hizmet Sağlayıcı Koşulları
              </Link>{" "}
              metnini okudum ve kabul ediyorum. *
            </span>
          </label>

          <p className="pl-7 text-xs leading-5 text-muted-foreground">
            <Link
              href="/sozlesmeler/kvkk-aydinlatma"
              target="_blank"
              className="font-medium text-foreground underline underline-offset-4"
            >
              KVKK Aydınlatma Metni
            </Link>{" "}
            kayıt öncesinde erişiminize sunulmuştur. Bu metin bir sözleşme kabulü veya açık rıza değildir.
          </p>

          <p className="pl-7 text-xs leading-5 text-muted-foreground">
            <Link
              href="/sozlesmeler/gizlilik"
              target="_blank"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Gizlilik Politikası
            </Link>{" "}
            ve{" "}
            <Link
              href="/sozlesmeler/cerez-politikasi"
              target="_blank"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Çerez Politikası
            </Link>{" "}
            metinlerine dilediğiniz zaman ulaşabilirsiniz.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-6 w-full"
        disabled={submitting || catalogLoading}
      >
        {submitting
          ? "Kayıt oluşturuluyor..."
          : "İşletme Hesabını Oluştur ve Başvur"}
      </Button>
    </form>
  );
}
