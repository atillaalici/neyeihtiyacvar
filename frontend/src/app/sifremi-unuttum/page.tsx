"use client";

import { FormEvent, useState } from "react";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordAgain, setShowNewPasswordAgain] = useState(false);
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "İşlem tamamlanamadı.");
        return;
      }

      setDevelopmentCode(data?.developmentCode ?? null);
      setMessage(
        data?.message ??
          "E-posta adresi kayıtlıysa şifre yenileme kodu oluşturuldu.",
      );
      setStep("reset");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== newPasswordAgain) {
      setError("Yeni şifreler birbiriyle aynı olmalı.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Şifre yenilenemedi.");
        return;
      }

      setMessage("Şifren başarıyla yenilendi. Giriş sayfasına yönlendiriliyorsun.");

      setTimeout(() => {
        router.push("/giris");
      }, 1000);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <section className="section-shell py-12 sm:py-16">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold text-primary">Hesap kurtarma</p>
            <h1 className="mt-2 font-display text-3xl font-bold">
              Şifremi Unuttum
            </h1>
            <p className="mt-3 text-muted-foreground">
              E-posta adresini doğrulayarak güvenli şekilde yeni şifre belirle.
            </p>
          </div>

          {developmentCode && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Development test kodu: <strong>{developmentCode}</strong>
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

          {step === "request" ? (
            <form
              onSubmit={requestCode}
              className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  E-posta
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                  placeholder="ornek@eposta.com"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Gönderiliyor..." : "Şifre Yenileme Kodu Gönder"}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={resetPassword}
              className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <div>
                <label htmlFor="code" className="mb-2 block text-sm font-medium">
                  6 Haneli Kod
                </label>
                <input
                  id="code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="h-12 w-full rounded-xl border border-input bg-background px-3 text-center text-lg font-semibold tracking-[0.35em] outline-none focus:ring-2 focus:ring-primary/15"
                  placeholder="000000"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="mb-2 block text-sm font-medium">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                  />
                  <button
                    type="button"
                    aria-label="Şifreyi basılı tutarak göster"
                    title="Basılı tutarak şifreyi göster"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      setShowNewPassword(true);
                    }}
                    onPointerUp={() => setShowNewPassword(false)}
                    onPointerCancel={() => setShowNewPassword(false)}
                    onPointerLeave={() => setShowNewPassword(false)}
                    onBlur={() => setShowNewPassword(false)}
                    className="absolute inset-y-0 right-0 flex w-11 touch-none select-none items-center justify-center text-muted-foreground transition hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPasswordAgain" className="mb-2 block text-sm font-medium">
                  Yeni Şifre Tekrar
                </label>
                <div className="relative">
                  <input
                    id="newPasswordAgain"
                    type={showNewPasswordAgain ? "text" : "password"}
                    value={newPasswordAgain}
                    onChange={(event) => setNewPasswordAgain(event.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                  />
                  <button
                    type="button"
                    aria-label="Şifre tekrarını basılı tutarak göster"
                    title="Basılı tutarak şifreyi göster"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      setShowNewPasswordAgain(true);
                    }}
                    onPointerUp={() => setShowNewPasswordAgain(false)}
                    onPointerCancel={() => setShowNewPasswordAgain(false)}
                    onPointerLeave={() => setShowNewPasswordAgain(false)}
                    onBlur={() => setShowNewPasswordAgain(false)}
                    className="absolute inset-y-0 right-0 flex w-11 touch-none select-none items-center justify-center text-muted-foreground transition hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Şifre yenileniyor..." : "Yeni Şifreyi Kaydet"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/giris" className="font-medium text-primary hover:underline">
              Giriş sayfasına dön
            </Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}