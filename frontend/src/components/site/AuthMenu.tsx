"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { AdminNotificationBadge } from "@/components/admin/AdminNotificationBadge";
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
          {user.role === "admin" && (
            <Link
              href="/admin"
              onClick={handleNavigate}
              className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted"
            >
              <span className="inline-flex items-center gap-2">
                Yönetim Paneli
                <AdminNotificationBadge type="total" />
              </span>
            </Link>
          )}

          <div className="flex items-center gap-1 px-2 py-1">
            <MessageBell />
          </div>

          {user.role === "provider" ? (
            <Link
              href="/panel"
              onClick={handleNavigate}
              className="flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
            >
              {user.displayName}
            </Link>
          ) : (
          <Link
            href={user.role === "admin" ? "/panel" : "/taleplerim"}
            onClick={handleNavigate}
            className="flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
          >
            {user.displayName}
          </Link>

          )}

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
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <span className="relative inline-block">
              Yönetim Paneli
              <span className="absolute -right-3 -top-3">
                <AdminNotificationBadge type="total" />
              </span>
            </span>
          </Link>
        )}

        <MessageBell />
        <NotificationBell />

        {user.role === "provider" ? (
          <Link
            href="/panel"
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            {user.displayName}
          </Link>
        ) : (
        <Link
          href={user.role === "admin" ? "/panel" : "/taleplerim"}
          className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          {user.displayName}
        </Link>

        )}

        <button
          type="button"
          onClick={handleLogout}
          className="min-w-[110px] rounded-md bg-orange-600 px-5 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-700"
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


      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/giris"
        className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        Giriş Yap
      </Link>


    </div>
  );
}
