import { BrandLogo } from "@/components/site/BrandLogo";
import Link from "next/link";
import { Menu } from "lucide-react";

import { AuthMenu } from "@/components/site/AuthMenu";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur responsive-site-navbar">
      <div className="section-shell flex h-16 items-center justify-between gap-4">
        <BrandLogo />

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/">Ana Sayfa</Link>
          <Link href="/kesfet">Keşfet</Link>
          <Link href="/kategoriler">Kategoriler</Link>
          <Link href="/nasil-calisir">Nasıl Çalışır</Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <AuthMenu />

          <Link
            href="/ihtiyac-olustur"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            İhtiyaç Oluştur
          </Link>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg border border-border md:hidden"
          aria-label="Menü"
        >
          <Menu className="size-5" />
        </button>
      </div>
    </header>
  );
}