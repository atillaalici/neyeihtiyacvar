"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  function handleLogout() {
    setAccountMenuOpen(false);
    clearAuth();
    router.push("/");
    router.refresh();
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
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

        <div ref={accountMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
          >
            <span>{user.displayName}</span>
            <ChevronDown
              className={`size-4 transition-transform ${
                accountMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {accountMenuOpen && (
            <div
              className="absolute right-0 top-full z-[100] mt-2 w-48 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-xl"
              role="menu"
            >
              <Link
                href="/hesabim"
                onClick={() => setAccountMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                role="menuitem"
              >
                Hesabım
              </Link>

              <Link
                href="/taleplerim"
                onClick={() => setAccountMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                role="menuitem"
              >
                Taleplerim
              </Link>

              <div
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm text-muted-foreground opacity-70"
                title="Favoriler özelliği yakında"
              >
                <span>Favorilerim</span>
                <span className="text-[10px] font-semibold uppercase">
                  Yakında
                </span>
              </div>
            </div>
          )}
        </div>

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
