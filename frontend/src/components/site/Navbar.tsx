"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { BrandLogo } from "@/components/site/BrandLogo";
import { AuthMenu } from "@/components/site/AuthMenu";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

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

        <div ref={mobileMenuRef} className="relative md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="grid size-10 place-items-center rounded-lg border border-border"
            aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>

          {mobileMenuOpen && (
            <div className="absolute right-0 top-12 z-[60] max-h-[calc(100vh-5rem)] w-[min(19rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-border bg-background p-2 shadow-xl">
              <nav className="grid text-sm font-medium">
                <Link
                  onClick={closeMobileMenu}
                  className="rounded-xl px-4 py-3 hover:bg-muted"
                  href="/"
                >
                  Ana Sayfa
                </Link>

                <Link
                  onClick={closeMobileMenu}
                  className="rounded-xl px-4 py-3 hover:bg-muted"
                  href="/kesfet"
                >
                  Keşfet
                </Link>

                <Link
                  onClick={closeMobileMenu}
                  className="rounded-xl px-4 py-3 hover:bg-muted"
                  href="/kategoriler"
                >
                  Kategoriler
                </Link>

                <Link
                  onClick={closeMobileMenu}
                  className="rounded-xl px-4 py-3 hover:bg-muted"
                  href="/nasil-calisir"
                >
                  Nasıl Çalışır
                </Link>
              </nav>

              <div className="mt-2 border-t border-border pt-2">
                <AuthMenu
                  mobile
                  onNavigate={closeMobileMenu}
                />

                <Link
                  href="/ihtiyac-olustur"
                  onClick={closeMobileMenu}
                  className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  İhtiyaç Oluştur
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
