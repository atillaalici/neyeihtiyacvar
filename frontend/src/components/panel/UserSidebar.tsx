"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken, getStoredUser, type AuthUser } from "@/lib/auth";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  MessageCircle,
  UserRound,
  CreditCard,
  Settings,
  Menu,
  X,
} from "lucide-react";

type UserSidebarProps = {
  activeNeedCount?: number;
  completedNeedCount?: number;
};

export function UserSidebar({
  activeNeedCount,
  completedNeedCount,
}: UserSidebarProps = {}) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const completedSelected = searchParams.get("sekme") === "sonuclanan";

  useEffect(() => {
    function syncUser() {
      setUser(getAccessToken() ? getStoredUser() : null);
    }

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("auth-changed", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("auth-changed", syncUser);
    };
  }, []);

  const initials = (user?.displayName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("") || "K";

  const items = [
    {
      label: "Aktif Talepler",
      href: "/taleplerim",
      icon: ClipboardList,
      count: activeNeedCount,
    },
    {
      label: "Sonuçlanan Talepler",
      href: "/taleplerim?sekme=sonuclanan",
      icon: ClipboardList,
      count: completedNeedCount,
    },
    { label: "Mesajlarım", href: "/mesajlarim", icon: MessageCircle },
    { label: "Üyeliğim", href: "/uyeligim", icon: CreditCard },
    { label: "Ayarlarım", href: "/ayarlar", icon: Settings },
  ];

  return (
    <div className="lg:w-64 lg:shrink-0 lg:self-stretch lg:border-r lg:border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="user-sidebar-navigation"
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 font-semibold lg:hidden"
      >
        Kullanıcı Menüsü
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      <nav
        id="user-sidebar-navigation"
        aria-label="Kullanıcı paneli menüsü"
        className={`${open ? "block" : "hidden"} p-3 lg:sticky lg:top-4 lg:block`}
      >
        <div className="mb-3 flex items-center gap-3 border-b border-border px-3 py-4">
          <div className="relative grid size-[60px] shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-lg font-bold text-primary">
            {initials}
            {user && !photoFailed && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={user.id}
                src={`${apiBaseUrl}/api/users/${user.id}/profile-image`}
                alt="Profil fotoğrafı"
                className="absolute inset-0 size-full object-cover"
                onError={() => setPhotoFailed(true)}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-foreground">
              {user?.displayName || "Kullanıcı"}
            </div>
            <div className="mt-1 text-xs font-medium text-muted-foreground">
              Kullanıcı Paneli
            </div>
          </div>
        </div>

        <div className="space-y-1">
          {items.map(({ label, href, icon: Icon, count }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={
                pathname === href.split("?")[0] &&
                (href.includes("sekme=sonuclanan")
                  ? typeof window !== "undefined" &&
                    new URLSearchParams(window.location.search).get("sekme") === "sonuclanan"
                  : href === "/taleplerim"
                    ? typeof window !== "undefined" &&
                      new URLSearchParams(window.location.search).get("sekme") !== "sonuclanan"
                    : true)
                  ? "page"
                  : undefined
              }
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                (pathname === "/taleplerim"
                  ? href === (completedSelected
                      ? "/taleplerim?sekme=sonuclanan"
                      : "/taleplerim")
                  : pathname === href)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{label}</span>
              {count !== undefined && (
                <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                  {count}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
