"use client";

import { useState } from "react";
import Link from "next/link";
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
};

export function BusinessSidebar({ providerSlug, businessName }: BusinessSidebarProps) {
  const [open, setOpen] = useState(false);

  const items = [
    { label: "Müşteri Talepleri", href: "/panel", icon: ClipboardList },
    { label: "Tekliflerim", href: "/panel/tekliflerim", icon: FileText },
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
          {items.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
