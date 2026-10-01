"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { NotificationBell } from "@/components/site/NotificationBell";
import { MessageBell } from "@/components/site/MessageBell";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";

type AuthMenuProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function AuthMenu({
  mobile = false,
  onNavigate,
}: AuthMenuProps) {
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
    function handlePointerDown(event: PointerEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function handleNavigate() {
    setAccountMenuOpen(false);
    onNavigate?.();
  }

  function handleLogout() {
    setAccountMenuOpen(false);
    clearAuth();
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (user) {
    if (mobile) {
      return (
        <div className="grid gap-1">
          {user.role === "provider" && (
            <Link
              href="/panel"
              onClick={handleNavigate}
              className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted"
            >
              İşletme Paneli
            </Link>
          )}

          {user.role === "admin" && (
            <Link
              href="/admin"
              onClick={handleNavigate}
              className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted"
            >
              Yönetim Paneli
            </Link>
          )}

          <div className="flex items-center gap-1 px-2 py-1">
            <MessageBell />
            <NotificationBell />
          </div>

          <div ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
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
                className="mx-2 mb-1 grid rounded-xl border border-border bg-muted/30 p-1"
                role="menu"
              >
                <Link
                  href="/hesabim"
                  onClick={handleNavigate}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-background"
                  role="menuitem"
                >
                  Hesabım
                </Link>

                <Link
                  href="/taleplerim"
                  onClick={handleNavigate}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-background"
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
            className="rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
          >
            Çıkış
          </button>
        </div>
      );
    }

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

        <MessageBell />
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

  if (mobile) {
    return (
      <div className="grid">
        <Link
          href="/giris"
          onClick={onNavigate}
          className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted"
        >
          Giriş Yap
        </Link>

        <Link
          href="/kayit"
          onClick={onNavigate}
          className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted"
        >
          Kayıt Ol
        </Link>
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
