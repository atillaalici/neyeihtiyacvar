"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";

function ReactivationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get("userId") ?? "";
  const email = searchParams.get("email") ?? "";
  const returnUrl = searchParams.get("returnUrl") ?? "/";

  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function sendCode() {
    if (!userId) {
      setError("Hesap bilgisi bulunamadı. Lütfen yeniden giriş yapın.");
      return;
    }

    setSending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/reactivation/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          data?.message ??
            "Etkinleştirme kodu gönderilemedi.",
        );
        return;
      }

      setCodeSent(true);
      setMessage(
        data?.message ??
          "Etkinleştirme kodu e-posta adresinize gönderildi.",
      );
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(code.trim())) {
      setError("6 haneli etkinleştirme kodunu yazın.");
      return;
    }

    setVerifying(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/reactivation/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            code: code.trim(),
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          data?.message ??
            "Hesap yeniden etkinleştirilemedi.",
        );
        return;
      }

      setMessage("Hesabınız yeniden etkinleştirildi.");

      const params = new URLSearchParams({
        returnUrl,
      });

      window.setTimeout(() => {
        router.replace(`/giris?${params.toString()}`);
      }, 1200);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <SiteLayout>
      <section className="section-shell py-12 sm:py-16">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <RefreshCw className="size-6" />
            </div>

            <h1 className="font-display text-3xl font-bold">
              Hesabınızı Etkinleştirin
            </h1>

            <p className="mt-3 text-muted-foreground">
              Bu hesap daha önce dondurulmuş. Yeniden kullanmak için
              e-posta doğrulaması yapmanız gerekiyor.
            </p>
          </div>

          <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            {email && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-4">
                <Mail className="size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Etkinleştirme kodu gönderilecek adres
                  </p>
                  <p className="truncate text-sm font-medium">
                    {email}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="flex gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {!codeSent ? (
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={sending}
                className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending
                  ? "Kod Gönderiliyor..."
                  : "Etkinleştirme Kodunu Gönder"}
              </button>
            ) : (
              <form onSubmit={verifyCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="reactivation-code"
                    className="mb-2 block text-sm font-medium"
                  >
                    6 Haneli Etkinleştirme Kodu
                  </label>

                  <input
                    id="reactivation-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      )
                    }
                    placeholder="000000"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-xl font-semibold tracking-[0.35em] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifying
                    ? "Etkinleştiriliyor..."
                    : "Hesabımı Etkinleştir"}
                </button>

                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={sending}
                  className="w-full text-sm font-medium text-primary hover:underline disabled:opacity-60"
                >
                  {sending
                    ? "Gönderiliyor..."
                    : "Yeni Kod Gönder"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

export default function ReactivationPage() {
  return (
    <Suspense fallback={null}>
      <ReactivationContent />
    </Suspense>
  );
}
