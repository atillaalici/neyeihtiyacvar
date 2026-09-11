"use client";

import {
  FormEvent,
  Suspense,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Mail,
  Phone,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import { BusinessRegistrationForm } from "@/components/auth/BusinessRegistrationForm";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { saveAuth, type AuthResponse } from "@/lib/auth";

type AccountType = "user" | "business";
type EmailAvailability = "idle" | "checking" | "available" | "taken";

type RegisterResponse = AuthResponse & {
  verificationRequired: boolean;
  userId: string;
  email: string;
  phoneNumber: string;
  message: string;
  developmentCodes?: {
    email: string;
    phone: string;
  } | null;
};

type RegisterErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

type FieldErrors = {
  displayName?: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  passwordAgain?: string;
  agreements?: string;
};

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const incomingReturnUrl = searchParams.get("returnUrl") ?? "/";
  const initialAccountType: AccountType =
    searchParams.get("hesap") === "isletme" ? "business" : "user";

  const [accountType, setAccountType] =
    useState<AccountType>(initialAccountType);

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordAgain, setShowPasswordAgain] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);

  const [emailAvailability, setEmailAvailability] =
    useState<EmailAvailability>("idle");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [socialMessage, setSocialMessage] = useState("");
  const [showVerifyChoice, setShowVerifyChoice] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<RegisterResponse | null>(null);

  const passwordRules = useMemo(
    () => ({
      length: password.length >= 8,
      long: password.length >= 12,
      upper: /[A-ZÇĞİÖŞÜ]/.test(password),
      lower: /[a-zçğıöşü]/.test(password),
      digit: /\d/.test(password),
      symbol: /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(password),
    }),
    [password],
  );

  const passwordStrength = useMemo(() => {
    if (!password) return { label: "", level: 0 };

    let score = 0;

    if (passwordRules.length) score++;
    if (passwordRules.long) score++;
    if (passwordRules.upper && passwordRules.lower) score++;
    if (passwordRules.digit) score++;
    if (passwordRules.symbol) score++;

    if (score >= 5) return { label: "Güçlü", level: 3 };
    if (score >= 3) return { label: "Orta", level: 2 };
    return { label: "Normal", level: 1 };
  }, [password, passwordRules]);

  const returnUrl = incomingReturnUrl;

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function checkEmailAvailability() {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setEmailAvailability("idle");
      return;
    }

    setEmailAvailability("checking");
    clearFieldError("email");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/check-email?email=${encodeURIComponent(
          cleanEmail,
        )}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok) {
        setEmailAvailability("idle");
        setFieldErrors((current) => ({
          ...current,
          email: data?.message ?? "E-posta kontrol edilemedi.",
        }));
        return;
      }

      if (data.available) {
        setEmailAvailability("available");
      } else {
        setEmailAvailability("taken");
        setFieldErrors((current) => ({
          ...current,
          email:
            data?.message ??
            "Bu e-posta adresiyle daha önce hesap oluşturulmuş.",
        }));
      }
    } catch {
      setEmailAvailability("idle");
    }
  }

  function validateClient() {
    const errors: FieldErrors = {};

    if (!displayName.trim()) {
      errors.displayName = "Ad soyad alanı zorunludur.";
    }

    const digits = phoneNumber.replace(/\D/g, "");

    if (
      !(
        (digits.length === 11 && digits.startsWith("05")) ||
        (digits.length === 10 && digits.startsWith("5")) ||
        (digits.length === 12 && digits.startsWith("905"))
      )
    ) {
      errors.phoneNumber =
        "Cep telefonu 05xx xxx xx xx formatında olmalıdır.";
    }

    if (!email.trim()) {
      errors.email = "E-posta alanı zorunludur.";
    } else if (emailAvailability === "taken") {
      errors.email =
        "Bu e-posta adresiyle daha önce hesap oluşturulmuş.";
    }

    if (!passwordRules.length) {
      errors.password = "Şifre en az 8 karakter olmalıdır.";
    } else if (
      !passwordRules.upper ||
      !passwordRules.lower ||
      !passwordRules.digit
    ) {
      errors.password =
        "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.";
    }

    if (!passwordAgain) {
      errors.passwordAgain = "Şifre tekrar alanı zorunludur.";
    } else if (password !== passwordAgain) {
      errors.passwordAgain = "Şifreler birbiriyle aynı olmalıdır.";
    }

    if (!termsAccepted) {
      errors.agreements = "Devam etmek için Kullanım ve Üyelik Koşullarını kabul etmelisin."
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError(
        "Lütfen işaretlenen alanları kontrol et. Eksik veya hatalı bilgileri düzelttikten sonra tekrar dene.",
      );
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSocialMessage("");

    if (!validateClient()) return;

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          password,
          marketingAccepted,
        }),
      });

      const data = (await response.json()) as
        | RegisterResponse
        | RegisterErrorResponse;

      if (!response.ok) {
        const responseData = data as RegisterErrorResponse;

        if (responseData.errors) {
          const nextErrors: FieldErrors = {};

          for (const [key, messages] of Object.entries(
            responseData.errors,
          )) {
            const message = messages?.[0];
            if (!message) continue;

            if (key === "displayName") nextErrors.displayName = message;
            if (key === "phoneNumber") nextErrors.phoneNumber = message;
            if (key === "email") nextErrors.email = message;
            if (key === "password") nextErrors.password = message;
          }

          setFieldErrors((current) => ({
            ...current,
            ...nextErrors,
          }));
        }

        if (response.status === 409) {
          const message =
            responseData.message ??
            "Bu bilgilerle daha önce hesap oluşturulmuş.";

          if (message.toLocaleLowerCase("tr-TR").includes("e-posta")) {
            setEmailAvailability("taken");
            setFieldErrors((current) => ({
              ...current,
              email: message,
            }));
          }

          if (message.toLocaleLowerCase("tr-TR").includes("telefon")) {
            setFieldErrors((current) => ({
              ...current,
              phoneNumber: message,
            }));
          }
        }

        setError(
          responseData.message ??
            "Kayıt oluşturulamadı. Lütfen bilgilerini kontrol et.",
        );
        return;
      }

      const registerData = data as RegisterResponse;

      saveAuth(registerData);

      if (registerData.developmentCodes) {
        sessionStorage.setItem(
          "neyeihtiyacvar.devVerificationCodes",
          JSON.stringify(registerData.developmentCodes),
        );
      }

      setRegisteredUser(registerData);
      setShowVerifyChoice(true);
    } catch {
      setError(
        "Sunucuya bağlanılamadı. İnternet bağlantısını ve backend servisinin çalıştığını kontrol et.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSocial(provider: "Google" | "Apple") {
    setError("");
    setSocialMessage(
      `${provider} ile kayıt arayüzü hazır. Gerçek OAuth bağlantısı için ${provider} uygulama anahtarlarını bağlamamız gerekiyor.`,
    );
  }

  if (accountType === "business") {
    return (
      <SiteLayout>
        <section className="section-shell py-10 sm:py-14">
          <div className="mx-auto max-w-2xl">
            <div className="mb-7 text-center">
              <p className="text-sm font-semibold text-primary">
                Ücretsiz üyelik
              </p>

              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                Hesap oluştur
              </h1>

              <p className="mt-3 text-muted-foreground">
                Kullanıcı veya işletme hesabı türünü seçerek devam et.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AccountTypeButton
                active={false}
                icon={<UsersRound className="size-5" />}
                title="Kullanıcı olarak kayıt ol"
                subtitle="İhtiyaç oluştur, teklif al"
                onClick={() => setAccountType("user")}
              />

              <AccountTypeButton
                active
                icon={<Building2 className="size-5" />}
                title="İşletme olarak kayıt ol"
                subtitle="Müşterilere ulaş, işini büyüt"
                onClick={() => setAccountType("business")}
              />
            </div>

            <BusinessRegistrationForm />
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      {showVerifyChoice && registeredUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <p className="text-sm font-semibold text-primary">
              Hesabın oluşturuldu
            </p>

            <h2 className="mt-2 font-display text-2xl font-bold">
              Hesabını doğrulamak ister misin?
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Kullanıcı hesabında ihtiyaç talebi oluşturmak için e-posta
              doğrulaması gerekir. İşletme hesabında ise yayına alınmadan önce
              e-posta ve telefon doğrulamasının ikisi de tamamlanmalıdır.
            </p>

            <div className="mt-6 grid gap-2">
              <Button
                type="button"
                onClick={async () => {
                  setLoading(true);
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
                          userId: registeredUser.userId,
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
                      userId: registeredUser.userId,
                      email: registeredUser.email,
                      phone: registeredUser.phoneNumber,
                      channel: "email",
                      returnUrl,
                    });

                    router.push(`/dogrula?${params.toString()}`);
                  } catch {
                    setError("Doğrulama kodu gönderilemedi.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Şimdi Doğrula
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowVerifyChoice(false);
                  router.push(returnUrl);
                  router.refresh();
                }}
              >
                Doğrulamadan Devam Et
              </Button>
            </div>
          </div>
        </div>
      )}
      <section className="section-shell py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <div className="mb-7 text-center">
            <p className="text-sm font-semibold text-primary">
              Ücretsiz üyelik
            </p>

            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Hesap oluştur
            </h1>

            <p className="mt-3 text-muted-foreground">
              Neye İhtiyaç Var&apos;a katıl, ihtiyacını paylaş ve doğru
              işletmelere daha kolay ulaş.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <AccountTypeButton
                active={accountType === "user"}
                icon={<UsersRound className="size-5" />}
                title="Kullanıcı olarak kayıt ol"
                subtitle="İhtiyaç oluştur, teklif al"
                onClick={() => setAccountType("user")}
              />

              <AccountTypeButton
                active={false}
                icon={<Building2 className="size-5" />}
                title="İşletme olarak kayıt ol"
                subtitle="Müşterilere ulaş, işini büyüt"
                onClick={() => setAccountType("business")}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleSocial("Google")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium transition hover:bg-muted"
              >
                <span className="text-base font-bold">G</span>
                Google ile hesap aç
              </button>

              <button
                type="button"
                onClick={() => handleSocial("Apple")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium transition hover:bg-muted"
              >
                <span className="text-lg">●</span>
                Apple ile hesap aç
              </button>
            </div>

            {socialMessage && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                {socialMessage}
              </div>
            )}

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">veya</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  E-posta
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setEmailAvailability("idle");
                      clearFieldError("email");
                    }}
                    onBlur={() => void checkEmailAvailability()}
                    className={[
                      "h-11 w-full rounded-xl border bg-background pl-10 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-primary/15",
                      fieldErrors.email
                        ? "border-red-400"
                        : emailAvailability === "available"
                          ? "border-green-400"
                          : "border-input",
                    ].join(" ")}
                    placeholder="ornek@eposta.com"
                  />

                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    {emailAvailability === "checking" && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}

                    {emailAvailability === "available" && (
                      <CheckCircle2 className="size-4 text-green-600" />
                    )}

                    {emailAvailability === "taken" && (
                      <XCircle className="size-4 text-red-600" />
                    )}
                  </div>
                </div>

                <div className="mt-2 flex gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>
                    E-posta adresiniz güncel olarak kullandığınız bir adres
                    olmalı. Size özel bildirimler ve hesap bilgilendirmeleri bu
                    adresinize gönderilecektir.
                  </span>
                </div>

                {fieldErrors.email && (
                  <FieldError>{fieldErrors.email}</FieldError>
                )}

                {!fieldErrors.email &&
                  emailAvailability === "available" && (
                    <p className="mt-2 text-xs text-green-700">
                      Bu e-posta adresi kullanılabilir.
                    </p>
                  )}
              </div>

              <div>
                <label
                  htmlFor="displayName"
                  className="mb-2 block text-sm font-medium"
                >
                  Ad Soyad
                </label>

                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="displayName"
                    value={displayName}
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      clearFieldError("displayName");
                    }}
                    maxLength={150}
                    autoComplete="name"
                    className={[
                      "h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15",
                      fieldErrors.displayName
                        ? "border-red-400"
                        : "border-input",
                    ].join(" ")}
                    placeholder="Adınız ve soyadınız"
                  />
                </div>

                {fieldErrors.displayName && (
                  <FieldError>{fieldErrors.displayName}</FieldError>
                )}
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="mb-2 block text-sm font-medium"
                >
                  Cep Telefonu
                </label>

                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => {
                      setPhoneNumber(event.target.value);
                      clearFieldError("phoneNumber");
                    }}
                    autoComplete="tel"
                    inputMode="tel"
                    className={[
                      "h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15",
                      fieldErrors.phoneNumber
                        ? "border-red-400"
                        : "border-input",
                    ].join(" ")}
                    placeholder="05xx xxx xx xx"
                  />
                </div>

                {fieldErrors.phoneNumber && (
                  <FieldError>{fieldErrors.phoneNumber}</FieldError>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Şifre
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearFieldError("password");
                    }}
                    className={[
                      "h-11 w-full rounded-xl border bg-background px-3 pr-11 text-sm outline-none transition focus:ring-2 focus:ring-primary/15",
                      fieldErrors.password
                        ? "border-red-400"
                        : "border-input",
                    ].join(" ")}
                    placeholder="En az 8 karakter"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label={
                      showPassword ? "Şifreyi gizle" : "Şifreyi göster"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {password && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        Şifre gücü
                      </span>
                      <span
                        className={[
                          "font-semibold",
                          passwordStrength.level === 3
                            ? "text-green-700"
                            : passwordStrength.level === 2
                              ? "text-amber-700"
                              : "text-orange-700",
                        ].join(" ")}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={[
                            "h-1.5 rounded-full",
                            passwordStrength.level >= level
                              ? passwordStrength.level === 3
                                ? "bg-green-500"
                                : passwordStrength.level === 2
                                  ? "bg-amber-500"
                                  : "bg-primary"
                              : "bg-muted",
                          ].join(" ")}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  En az bir büyük harf, bir küçük harf ve bir rakam içermelidir.
                </p>

                {fieldErrors.password && (
                  <FieldError>{fieldErrors.password}</FieldError>
                )}
              </div>

              <div>
                <label
                  htmlFor="passwordAgain"
                  className="mb-2 block text-sm font-medium"
                >
                  Şifre Tekrar
                </label>

                <div className="relative">
                  <input
                    id="passwordAgain"
                    type={showPasswordAgain ? "text" : "password"}
                    autoComplete="new-password"
                    value={passwordAgain}
                    onChange={(event) => {
                      setPasswordAgain(event.target.value);
                      clearFieldError("passwordAgain");
                    }}
                    className={[
                      "h-11 w-full rounded-xl border bg-background px-3 pr-11 text-sm outline-none transition focus:ring-2 focus:ring-primary/15",
                      fieldErrors.passwordAgain
                        ? "border-red-400"
                        : "border-input",
                    ].join(" ")}
                    placeholder="Şifrenizi tekrar girin"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswordAgain((current) => !current)
                    }
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label={
                      showPasswordAgain
                        ? "Şifreyi gizle"
                        : "Şifreyi göster"
                    }
                  >
                    {showPasswordAgain ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {fieldErrors.passwordAgain && (
                  <FieldError>{fieldErrors.passwordAgain}</FieldError>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => {
                    setTermsAccepted(event.target.checked);
                    clearFieldError("agreements");
                  }}
                  className="mt-1 size-4 rounded border-input"
                />

                <span>
                  <Link
                    href="/sozlesmeler/kullanim-kosullari"
                    target="_blank"
                    className="font-medium text-primary hover:underline"
                  >
                    Kullanım ve Üyelik Koşulları
                  </Link>{" "}
                  metnini okudum ve kabul ediyorum.
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
                kayıt öncesinde erişiminize sunulmuştur.
                {" "}
                <Link
                  href="/sozlesmeler/gizlilik"
                  target="_blank"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Gizlilik Politikası
                </Link>
                {" ve "}
                <Link
                  href="/sozlesmeler/cerez-politikasi"
                  target="_blank"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Çerez Politikası
                </Link>
                {" bağlantıları da inceleyebilirsiniz."}
              </p>

              <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={marketingAccepted}
                  onChange={(event) =>
                    setMarketingAccepted(event.target.checked)
                  }
                  className="mt-1 size-4 rounded border-input"
                />

                <span>
                  İletişim bilgilerime kampanya, tanıtım ve reklam içerikli
                  ticari elektronik ileti gönderilmesine; bu amaçla kişisel
                  verilerimin işlenmesine izin veriyorum.
                </span>
              </label>

              {fieldErrors.agreements && (
                <FieldError>{fieldErrors.agreements}</FieldError>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                <strong className="block font-semibold">
                  Kayıt tamamlanamadı
                </strong>
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              disabled={
                loading ||
                emailAvailability === "checking" ||
                emailAvailability === "taken"
              }
            >
              {loading
                ? "Hesap oluşturuluyor..."
                : false
                  ? "İşletme hesabı aç"
                  : "E-posta ile hesap aç"}
            </Button>

            <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
              Zaten hesabın var mı?{" "}
              <Link
                href={`/giris?returnUrl=${encodeURIComponent(returnUrl)}`}
                className="font-semibold text-primary hover:underline"
              >
                Giriş yap
              </Link>
            </div>
</form>
        </div>
      </section>
    </SiteLayout>
  );
}

function AccountTypeButton({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-background hover:border-primary/40 hover:bg-muted/30",
      ].join(" ")}
    >
      <span
        className={[
          "grid size-10 shrink-0 place-items-center rounded-full",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        ].join(" ")}
      >
        {icon}
      </span>

      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function FieldError({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-red-600">
      <XCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <div className="section-shell py-16" />
        </SiteLayout>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}