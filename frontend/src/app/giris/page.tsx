"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { saveAuth, type AuthResponse } from "@/lib/auth";

type VerificationRequiredResponse = {
  code: "verification_required";
  userId: string;
  email: string;
  phoneNumber: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  message: string;
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          rememberMe,
        }),
      });

      if (response.status === 401) {
        setError("E-posta veya şifre hatalı.");
        return;
      }

      const data = await response.json();

      if (
        response.status === 403 &&
        data?.code === "verification_required"
      ) {
        const verification = data as VerificationRequiredResponse;

        const params = new URLSearchParams({
          userId: verification.userId,
          email: verification.email,
          phone: verification.phoneNumber ?? "",
          returnUrl,
        });

        router.push(`/dogrula?${params.toString()}`);
        return;
      }

      if (!response.ok) {
        setError(data?.message ?? "Giriş yapılamadı.");
        return;
      }

      saveAuth(data as AuthResponse);
      router.push(returnUrl);
      router.refresh();
    } catch {
      setError("Sunucuya bağlanılamadı. Backend bağlantısını kontrol et.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <section className="section-shell py-12 sm:py-16">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold text-primary">Tekrar hoş geldin</p>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Giriş Yap
            </h1>
            <p className="mt-3 text-muted-foreground">
              Taleplerine, bildirimlerine ve işletme bağlantılarına kaldığın
              yerden devam et.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
          >
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="ornek@eposta.com"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-medium">
                  Şifre
                </label>
                <Link
                  href="/sifremi-unuttum"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Şifremi Unuttum
                </Link>
              </div>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="Şifren"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="size-4 rounded border-input"
              />
              Beni hatırla
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Hesabın yok mu?{" "}
              <Link
                href={`/kayit?returnUrl=${encodeURIComponent(returnUrl)}`}
                className="font-medium text-primary hover:underline"
              >
                Ücretsiz Üye Ol
              </Link>
            </p>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<SiteLayout><div className="section-shell py-16" /></SiteLayout>}>
      <LoginPageContent />
    </Suspense>
  );
}