"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { saveAuth, type AuthResponse } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        }),
      });

      if (response.status === 401) {
        setError("E-posta veya şifre hatalı.");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Giriş yapılamadı.");
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
              Giriş Yap
            </h1>

            <p className="mt-3 text-muted-foreground">
              Hesabına giriş yap ve Neye İhtiyaç Var'ı kullanmaya devam et.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
          >
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="Şifren"
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
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Hesabın yok mu?{" "}
              <Link
                href="/kayit"
                className="font-medium text-primary hover:underline"
              >
                Kayıt Ol
              </Link>
            </p>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}