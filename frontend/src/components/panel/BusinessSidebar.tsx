"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  FileText,
  MessageCircle,
  Wrench,
  Store,
  BarChart3,
  CreditCard,
  Settings,
  Menu,
  X,
} from "lucide-react";

type BusinessSidebarProps = {
  providerSlug: string;
  businessName: string;
  activeNeedCount?: number;
  completedNeedCount?: number;
};

export function BusinessSidebar({
  providerSlug,
  businessName,
  activeNeedCount,
  completedNeedCount,
}: BusinessSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const completedSelected = searchParams.get("sekme") === "sonuclanan";

  const items = [
    { label: "Müşteri Talepleri", href: "/panel", icon: ClipboardList },
    { label: "Tekliflerim", href: "/panel/tekliflerim", icon: FileText },
    { label: "Aktif Taleplerim", href: "/panel/taleplerim", icon: ClipboardList, count: activeNeedCount },
    { label: "Sonuçlanan Taleplerim", href: "/panel/taleplerim?sekme=sonuclanan", icon: ClipboardList, count: completedNeedCount },
    { label: "Mesajlarım", href: "/panel/mesajlarim", icon: MessageCircle },
    { label: "Hizmetlerim", href: "/panel/hizmetlerim", icon: Wrench },
    { label: "Dijital Vitrinim", href: "/panel/profil", icon: Store },
    { label: "İstatistikler", href: "/panel/istatistikler", icon: BarChart3 },
    { label: "Üyeliğim", href: "/panel/uyeligim", icon: CreditCard },
    { label: "Ayarlar", href: "/panel/ayarlar", icon: Settings },
  ];

  return (
    <div className="lg:w-64 lg:shrink-0 lg:self-stretch lg:border-r lg:border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="business-sidebar-navigation"
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 font-semibold lg:hidden"
      >
        İşletme Menüsü
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      <nav
        id="business-sidebar-navigation"
        aria-label="İşletme paneli menüsü"
        className={`${open ? "block" : "hidden"} p-3 lg:sticky lg:top-4 lg:block`}
      >
        <div className="mb-3 border-b border-border px-3 py-4">
          <h2 className="break-words text-lg font-bold text-foreground">
            {businessName}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            İşletme Yönetimi
          </p>
        </div>

        <div className="space-y-1">
          {items.map(({ label, href, icon: Icon, ...item }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={
                href.startsWith("/panel/taleplerim")
                  ? pathname === "/panel/taleplerim" &&
                    (href.includes("sekme=sonuclanan") === completedSelected)
                    ? "page"
                    : undefined
                  : pathname === href
                    ? "page"
                    : undefined
              }
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                (href.startsWith("/panel/taleplerim")
                  ? pathname === "/panel/taleplerim" &&
                    (href.includes("sekme=sonuclanan") === completedSelected)
                  : pathname === href)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{label}</span>
              {"count" in item && item.count !== undefined && (
                <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                  {item.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
