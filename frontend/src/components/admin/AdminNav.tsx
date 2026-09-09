"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  Store,
  Users,
} from "lucide-react";

const items = [
  {
    href: "/admin",
    label: "Genel Bakış",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/talepler",
    label: "İhtiyaç Talepleri",
    icon: ClipboardList,
  },
  {
    href: "/admin/basvurular",
    label: "İşletme Başvuruları",
    icon: Building2,
  },
  {
    href: "/admin/isletmeler",
    label: "İşletmeler",
    icon: Store,
  },
  {
    href: "/admin/kullanicilar",
    label: "Kullanıcılar",
    icon: Users,
  },
  {
    href: "/admin/pasifler",
    label: "Pasifler",
    icon: Archive,
  },
  {
    href: "/admin/islem-gecmisi",
    label: "İşlem Geçmişi",
    icon: History,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-background">
      <div className="section-shell py-3">
        <nav
          aria-label="Yönetim menüsü"
          className="flex flex-wrap gap-2"
        >
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50",
                ].join(" ")}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
