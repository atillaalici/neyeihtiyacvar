$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"

function Write-Utf8NoBom([string]$path, [string]$content) {
    $directory = [System.IO.Path]::GetDirectoryName($path)

    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    }

    [System.IO.File]::WriteAllText(
        $path,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

$authLib = @'
export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "provider" | "admin";
};

export type AuthResponse = {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthUser;
};

const tokenKey = "neyeihtiyacvar.accessToken";
const userKey = "neyeihtiyacvar.user";
const expiresKey = "neyeihtiyacvar.expiresAtUtc";

export function saveAuth(response: AuthResponse) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(tokenKey, response.accessToken);
  localStorage.setItem(userKey, JSON.stringify(response.user));
  localStorage.setItem(expiresKey, response.expiresAtUtc);

  window.dispatchEvent(new Event("auth-changed"));
}

export function clearAuth() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  localStorage.removeItem(expiresKey);

  window.dispatchEvent(new Event("auth-changed"));
}

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem(tokenKey);
  const expiresAtUtc = localStorage.getItem(expiresKey);

  if (!token || !expiresAtUtc) {
    return null;
  }

  if (new Date(expiresAtUtc).getTime() <= Date.now()) {
    clearAuth();
    return null;
  }

  return token;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(userKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearAuth();
    return null;
  }
}
'@

$apiLib = @'
export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:5155";
'@

$loginPage = @'
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
'@

$registerPage = @'
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
'@

$accountPage = @'
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
'@

$authMenu = @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  clearAuth,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";

export function AuthMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    function sync() {
      const token = getAccessToken();
      setUser(token ? getStoredUser() : null);
    }

    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("auth-changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth-changed", sync);
    };
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/hesabim"
          className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          {user.displayName}
        </Link>

        <button
          type="button"
          onClick={() => clearAuth()}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Çıkış
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/giris"
        className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        Giriş Yap
      </Link>

      <Link
        href="/kayit"
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Kayıt Ol
      </Link>
    </div>
  );
}
'@

Write-Utf8NoBom "$root\src\lib\auth.ts" $authLib
Write-Utf8NoBom "$root\src\lib\api.ts" $apiLib
Write-Utf8NoBom "$root\src\app\giris\page.tsx" $loginPage
Write-Utf8NoBom "$root\src\app\kayit\page.tsx" $registerPage
Write-Utf8NoBom "$root\src\app\hesabim\page.tsx" $accountPage
Write-Utf8NoBom "$root\src\components\site\AuthMenu.tsx" $authMenu

Write-Host ""
Write-Host "Frontend kayit, giris ve oturum altyapisi hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Olusturulan dosyalar:" -ForegroundColor Cyan
Write-Host "  src\lib\auth.ts"
Write-Host "  src\lib\api.ts"
Write-Host "  src\app\giris\page.tsx"
Write-Host "  src\app\kayit\page.tsx"
Write-Host "  src\app\hesabim\page.tsx"
Write-Host "  src\components\site\AuthMenu.tsx"
Write-Host ""
Write-Host "NOT: AuthMenu olusturuldu fakat mevcut Navbar'a otomatik eklenmedi." -ForegroundColor Yellow
Write-Host "Navbar yapisini bozmamak icin once TypeScript kontrolu yapacagiz." -ForegroundColor Yellow
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Cyan
