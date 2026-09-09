"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { saveAuth, type AuthResponse } from "@/lib/auth";

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get("userId") ?? "";
  const email = searchParams.get("email") ?? "";
  const phone = searchParams.get("phone") ?? "";
  const returnUrl = searchParams.get("returnUrl") ?? "/";

  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [working, setWorking] = useState<"email" | "phone" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devCodes, setDevCodes] = useState<{ email?: string; phone?: string } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("neyeihtiyacvar.devVerificationCodes");

    if (!raw) return;

    try {
      setDevCodes(JSON.parse(raw));
    } catch {
      setDevCodes(null);
    }
  }, []);

  async function verify(channel: "email" | "phone", code: string) {
    setWorking(channel);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/verification/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, channel, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Doğrulama yapılamadı.");
        return;
      }

      const nextEmailVerified =
        "emailVerified" in data ? Boolean(data.emailVerified) : emailVerified;
      const nextPhoneVerified =
        "phoneVerified" in data ? Boolean(data.phoneVerified) : phoneVerified;

      setEmailVerified(nextEmailVerified);
      setPhoneVerified(nextPhoneVerified);

      if ("accessToken" in data) {
        saveAuth(data as AuthResponse);
        sessionStorage.removeItem("neyeihtiyacvar.devVerificationCodes");
        router.push(returnUrl);
        router.refresh();
        return;
      }

      setMessage(
        channel === "email"
          ? "E-posta adresin doğrulandı."
          : "Telefon numaran doğrulandı.",
      );
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWorking(null);
    }
  }

  async function resend(channel: "email" | "phone") {
    setWorking(channel);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/verification/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, channel }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Yeni kod gönderilemedi.");
        return;
      }

      if (data?.developmentCode) {
        setDevCodes((current) => ({
          ...(current ?? {}),
          [channel]: data.developmentCode,
        }));
      }

      setMessage(data?.message ?? "Yeni kod oluşturuldu.");
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
            <p className="text-sm font-semibold text-primary">Hesap güvenliği</p>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Bilgilerini Doğrula
            </h1>
            <p className="mt-3 text-muted-foreground">
              Hesabını kullanmaya başlamadan önce e-posta ve telefonunu doğrula.
            </p>
          </div>

          {devCodes && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Development test kodları:</strong>{" "}
              E-posta: {devCodes.email ?? "-"} · Telefon: {devCodes.phone ?? "-"}
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

          <div className="grid gap-5">
            <VerificationCard
              title="E-posta Doğrulama"
              destination={email}
              verified={emailVerified}
              code={emailCode}
              setCode={setEmailCode}
              working={working === "email"}
              onVerify={() => void verify("email", emailCode)}
              onResend={() => void resend("email")}
            />

            <VerificationCard
              title="Telefon Doğrulama"
              destination={phone}
              verified={phoneVerified}
              code={phoneCode}
              setCode={setPhoneCode}
              working={working === "phone"}
              onVerify={() => void verify("phone", phoneCode)}
              onResend={() => void resend("phone")}
            />
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Kodlar 10 dakika geçerlidir. Yeni kod isteme işlemleri arasında
            güvenlik nedeniyle kısa bir bekleme süresi vardır.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

function VerificationCard({
  title,
  destination,
  verified,
  code,
  setCode,
  working,
  onVerify,
  onResend,
}: {
  title: string;
  destination: string;
  verified: boolean;
  code: string;
  setCode: (value: string) => void;
  working: boolean;
  onVerify: () => void;
  onResend: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{destination}</p>
        </div>

        <span
          className={
            verified
              ? "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
              : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
          }
        >
          {verified ? "Doğrulandı" : "Bekliyor"}
        </span>
      </div>

      {!verified && (
        <>
          <input
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6 haneli kod"
            className="mt-5 h-12 w-full rounded-xl border border-input bg-background px-4 text-center text-lg font-semibold tracking-[0.35em] outline-none focus:ring-2 focus:ring-primary/15"
          />

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              disabled={working || code.length !== 6}
              onClick={onVerify}
            >
              {working ? "Kontrol ediliyor..." : "Doğrula"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={working}
              onClick={onResend}
            >
              Yeni Kod İste
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<SiteLayout><div className="section-shell py-16" /></SiteLayout>}>
      <VerifyPageContent />
    </Suspense>
  );
}