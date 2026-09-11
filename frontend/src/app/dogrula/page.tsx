"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone, ShieldCheck } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import {
  getAccessToken,
  saveAuth,
  type AuthResponse,
  type AuthUser,
} from "@/lib/auth";

type VerificationChannel = "email" | "phone";

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Kanal parametresi yoksa güvenli varsayılan olarak e-posta açılır.
  // Böylece bu sayfada hiçbir zaman iki doğrulama kartı birden görünmez.
  const channel: VerificationChannel =
    searchParams.get("channel") === "phone" ? "phone" : "email";

  const queryUserId = searchParams.get("userId") ?? "";
  const queryEmail = searchParams.get("email") ?? "";
  const queryPhone = searchParams.get("phone") ?? "";
  const returnUrl = searchParams.get("returnUrl") ?? "/hesabim";

  const [account, setAccount] = useState<AuthUser | null>(null);
  const [code, setCode] = useState("");
  const [working, setWorking] = useState<"verify" | "resend" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const token = getAccessToken();

      if (token) {
        try {
          const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          });

          if (response.ok) {
            const data = (await response.json()) as AuthUser;

            if (active) {
              setAccount(data);
            }
          }
        } catch {
          // Sorgu parametreleri yedek kaynak olarak kullanılacak.
        }
      }

      const raw = sessionStorage.getItem(
        "neyeihtiyacvar.devVerificationCodes",
      );

      if (!raw || !active) {
        return;
      }

      try {
        const parsed = JSON.parse(raw) as {
          email?: string;
          phone?: string;
        };

        setDevelopmentCode(parsed[channel] ?? null);
      } catch {
        setDevelopmentCode(null);
      }
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, [channel]);

  const userId = account?.id ?? queryUserId;

  const destination = useMemo(() => {
    if (channel === "email") {
      return account?.email ?? queryEmail;
    }

    return account?.phoneNumber ?? queryPhone;
  }, [account, channel, queryEmail, queryPhone]);

  const alreadyVerified =
    channel === "email"
      ? Boolean(account?.emailVerified)
      : Boolean(account?.phoneVerified);

  const title =
    channel === "email" ? "E-posta Doğrulama" : "Telefon Doğrulama";

  const description =
    channel === "email"
      ? "E-posta adresine gönderilen 6 haneli doğrulama kodunu gir."
      : "Telefon numarana gönderilen 6 haneli doğrulama kodunu gir.";

  const Icon = channel === "email" ? Mail : Phone;

  async function verify() {
    if (!userId) {
      setError("Hesap bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      return;
    }

    setWorking("verify");
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/verification/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            channel,
            code,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Doğrulama yapılamadı.");
        return;
      }

      if ("accessToken" in data) {
        saveAuth(data as AuthResponse);
      }

      sessionStorage.removeItem("neyeihtiyacvar.devVerificationCodes");

      setMessage(
        channel === "email"
          ? "E-posta adresin doğrulandı."
          : "Telefon numaran doğrulandı.",
      );

      router.push(returnUrl);
      router.refresh();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWorking(null);
    }
  }

  async function resend() {
    if (!userId) {
      setError("Hesap bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      return;
    }

    if (channel === "phone" && !destination) {
      setError(
        "Hesabında telefon numarası bulunmuyor. Önce Hesabım > Düzenle bölümünden telefon numarası ekle.",
      );
      return;
    }

    setWorking("resend");
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/verification/resend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            channel,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Yeni kod gönderilemedi.");
        return;
      }

      if (data?.developmentCode) {
        setDevelopmentCode(String(data.developmentCode));
      }

      setMessage(data?.message ?? "Yeni doğrulama kodu oluşturuldu.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWorking(null);
    }
  }

  if (!userId) {
    return (
      <SiteLayout>
        <section className="section-shell py-16">
          <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            Doğrulama bilgisi bulunamadı. Lütfen tekrar giriş yap.
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="section-shell py-12 sm:py-16">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold text-primary">
              Hesap güvenliği
            </p>

            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              {title}
            </h1>

            <p className="mt-3 text-muted-foreground">{description}</p>
          </div>

          {developmentCode && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Development test kodu:</strong> {developmentCode}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold">
                    {title}
                  </h2>

                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {destination ||
                      (channel === "phone"
                        ? "Telefon numarası bulunmuyor"
                        : "E-posta adresi bulunmuyor")}
                  </p>
                </div>
              </div>

              <span
                className={
                  alreadyVerified
                    ? "inline-flex shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                    : "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                }
              >
                {alreadyVerified ? (
                  <>
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Doğrulandı
                  </>
                ) : (
                  "Bekliyor"
                )}
              </span>
            </div>

            {!alreadyVerified && (
              <>
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6 haneli kod"
                  className="mt-5 h-12 w-full rounded-xl border border-input bg-background px-4 text-center text-lg font-semibold tracking-[0.35em] outline-none focus:ring-2 focus:ring-primary/15"
                />

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    disabled={
                      working !== null ||
                      code.length !== 6 ||
                      (channel === "phone" && !destination)
                    }
                    onClick={() => void verify()}
                  >
                    {working === "verify"
                      ? "Kontrol ediliyor..."
                      : "Doğrula"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      working !== null ||
                      (channel === "phone" && !destination)
                    }
                    onClick={() => void resend()}
                  >
                    {working === "resend"
                      ? "Kod isteniyor..."
                      : "Yeni Kod İste"}
                  </Button>
                </div>
              </>
            )}
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Kodlar 2 dakika geçerlidir. Yeni kod isteme işlemleri arasında
            güvenlik nedeniyle kısa bir bekleme süresi vardır.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <SiteLayout>
          <div className="section-shell py-16" />
        </SiteLayout>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}