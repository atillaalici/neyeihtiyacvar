"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { NotificationBell } from "@/components/site/NotificationBell";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";

export function AuthMenu() {
  const router = useRouter();
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

  function handleLogout() {
    clearAuth();
    router.push("/");
    router.refresh();
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.role === "user" && (
          <Link
            href="/taleplerim"
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Taleplerim
          </Link>
        )}

        {user.role === "provider" && (
          <Link
            href="/panel"
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            İşletme Paneli
          </Link>
        )}
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Yönetim Paneli
          </Link>
        )}

        <NotificationBell />

        <Link
          href="/hesabim"
          className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          {user.displayName}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
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