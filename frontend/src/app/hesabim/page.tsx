"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";
import { apiBaseUrl } from "@/lib/api";

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const token = getAccessToken();

      if (!token) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setUser(getStoredUser());

      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (response.status === 401) {
          clearAuth();

          if (active) {
            setUser(null);
          }

          return;
        }

        if (!response.ok) {
          throw new Error("Hesap bilgileri alınamadı.");
        }

        const data = (await response.json()) as AuthUser;

        if (active) {
          setUser(data);
        }
      } catch {
        if (active) {
          setError("Hesap bilgileri yüklenemedi.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, []);

  function logout() {
    clearAuth();
    router.push("/");
    router.refresh();
  }

  return (
    <SiteLayout>
      <section className="section-shell py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Hesabım
          </h1>

          {loading && (
            <div className="mt-8 h-52 animate-pulse rounded-2xl border border-border bg-card" />
          )}

          {!loading && !user && (
            <div className="mt-8 rounded-2xl border border-border bg-card p-8 shadow-soft">
              <h2 className="font-display text-xl font-semibold">
                Oturum açık değil
              </h2>

              <p className="mt-2 text-muted-foreground">
                Hesap bilgilerini görmek için giriş yap.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/giris"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Giriş Yap
                </Link>

                <Link
                  href="/kayit"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
                >
                  Kayıt Ol
                </Link>
              </div>
            </div>
          )}

          {!loading && user && (
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Ad Soyad</dt>
                  <dd className="mt-1 font-medium">{user.displayName}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">E-posta</dt>
                  <dd className="mt-1 font-medium">{user.email}</dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">Rol</dt>
                  <dd className="mt-1 font-medium">{user.role}</dd>
                </div>
              </dl>

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {user.role === "provider" && (
                  <Link
                    href="/panel"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    İşletme Paneli
                  </Link>
                )}

                {user.role === "admin" && (
                  <Link
                    href="/admin/isletmeler"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Admin Paneli
                  </Link>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={logout}
                >
                  Çıkış Yap
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}