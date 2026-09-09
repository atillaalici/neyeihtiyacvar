"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
} from "@/lib/auth";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [developmentNonAdmin, setDevelopmentNonAdmin] =
    useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace(
        `/giris?returnUrl=${encodeURIComponent(pathname)}`,
      );
      return;
    }

    if (user.role === "admin") {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      setDevelopmentNonAdmin(true);
      setChecking(false);
      return;
    }

    router.replace(
      user.role === "provider" ? "/panel" : "/hesabim",
    );
  }, [pathname, router]);

  async function promoteCurrentUser() {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    setPromoting(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/development/admin/promote-current`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ??
            "Admin yetkisi verilemedi.",
        );
        return;
      }

      clearAuth();
      router.replace(
        `/giris?returnUrl=${encodeURIComponent("/admin")}`,
      );
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setPromoting(false);
    }
  }

  if (checking) {
    return (
      <div className="section-shell py-12">
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  if (developmentNonAdmin) {
    return (
      <div className="section-shell py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </div>

          <h1 className="mt-4 font-display text-2xl font-bold">
            Admin yetkisi gerekli
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Bu hesap Admin rolünde değil. Development ortamında
            geliştirme hesabını bir kez Admin yapabilirsin.
            Production ortamında bu seçenek bulunmaz.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="button"
            className="mt-5"
            disabled={promoting}
            onClick={() => void promoteCurrentUser()}
          >
            {promoting
              ? "Admin yetkisi veriliyor..."
              : "Bu Geliştirme Hesabını Admin Yap"}
          </Button>

          <p className="mt-3 text-xs text-muted-foreground">
            İşlemden sonra yeni rolün JWT'ye yansıması için
            tekrar giriş yapacaksın.
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return children;
}