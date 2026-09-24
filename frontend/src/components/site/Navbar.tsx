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

        <details className="group relative md:hidden">
          <summary
            className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-border [&::-webkit-details-marker]:hidden"
            aria-label="Menü"
          >
            <Menu className="size-5" />
          </summary>

          <div className="absolute right-0 top-12 z-[60] w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-background p-2 shadow-xl">
            <nav className="grid text-sm font-medium">
              <Link className="rounded-xl px-4 py-3 hover:bg-muted" href="/">
                Ana Sayfa
              </Link>
              <Link className="rounded-xl px-4 py-3 hover:bg-muted" href="/kesfet">
                Keşfet
              </Link>
              <Link className="rounded-xl px-4 py-3 hover:bg-muted" href="/kategoriler">
                Kategoriler
              </Link>
              <Link className="rounded-xl px-4 py-3 hover:bg-muted" href="/nasil-calisir">
                Nasıl Çalışır
              </Link>
            </nav>

            <div className="mt-2 border-t border-border pt-2">
              <div className="px-2 py-1">
                <AuthMenu />
              </div>
              <Link
                href="/ihtiyac-olustur"
                className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                İhtiyaç Oluştur
              </Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}