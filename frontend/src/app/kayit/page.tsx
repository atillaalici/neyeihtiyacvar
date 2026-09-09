"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { saveAuth, type AuthResponse } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password !== passwordAgain) {
      setError("Şifreler birbiriyle aynı olmalı.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Kayıt oluşturulamadı.");
        return;
      }

      saveAuth(data as AuthResponse);

      router.push("/");
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
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Kayıt Ol
            </h1>

            <p className="mt-3 text-muted-foreground">
              İhtiyaçlarını oluşturmak ve hizmet verenlerle bağlantı kurmak için hesabını oluştur.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
          >
            <div>
              <label
                htmlFor="displayName"
                className="mb-2 block text-sm font-medium"
              >
                Ad Soyad
              </label>

              <input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={150}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="Adın ve soyadın"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                E-posta
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="ornek@eposta.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Şifre
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="En az 8 karakter"
              />

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam kullan.
              </p>
            </div>

            <div>
              <label
                htmlFor="passwordAgain"
                className="mb-2 block text-sm font-medium"
              >
                Şifre Tekrar
              </label>

              <input
                id="passwordAgain"
                type="password"
                autoComplete="new-password"
                value={passwordAgain}
                onChange={(event) => setPasswordAgain(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="Şifreni tekrar yaz"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Zaten hesabın var mı?{" "}
              <Link
                href="/giris"
                className="font-medium text-primary hover:underline"
              >
                Giriş Yap
              </Link>
            </p>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}