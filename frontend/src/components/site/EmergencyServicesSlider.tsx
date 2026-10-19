"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getStoredSiteLocation, SITE_LOCATION_EVENT } from "@/lib/site-location";

type Provider = {
  id: string; slug: string; businessName: string; serviceSlug: string;
  citySlug: string; districtSlug: string; locationRank: number;
};
const scopes = ["İlçende", "İlinde", "Komşu ilde", "Türkiye"];

export function EmergencyServicesSlider() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [status, setStatus] = useState("7/24 hizmet veren işletmeler yükleniyor…");
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let controller: AbortController | undefined;
    async function load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const location = getStoredSiteLocation();
      const query = new URLSearchParams();
      if (location) {
        query.set("city", location.citySlug);
        query.set("district", location.districtSlug);
      }
      try {
        const response = await fetch(`${apiBaseUrl}/api/emergency-providers?${query}`, { signal: current.signal, cache: "no-store" });
        if (!response.ok) throw new Error("request failed");
        const data = await response.json() as { providers: Provider[] };
        if (current.signal.aborted) return;
        setProviders(data.providers);
        setStatus(data.providers.length ? "" : "Henüz 7/24 hizmet beyanı onaylı işletme bulunmuyor.");
        rail.current?.scrollTo({ left: 0 });
      } catch {
        if (current.signal.aborted) return;
        setProviders([]);
        setStatus("7/24 hizmet veren işletmeler şu anda yüklenemedi.");
      }
    }
    const refresh = () => { void load(); };
    refresh();
    window.addEventListener(SITE_LOCATION_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      controller?.abort();
      window.removeEventListener(SITE_LOCATION_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);


  useEffect(() => {
    const element = rail.current;
    if (!element || providers.length < 2) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    if (reducedMotion.matches) return;

    let frame = 0;
    let previous = 0;
    let paused = false;

    const pause = () => { paused = true; };
    const resume = () => {
      paused = false;
      previous = 0;
    };

    const animate = (time: number) => {
      const first = element.children[0] as HTMLElement | undefined;
      const next = element.children[providers.length] as HTMLElement | undefined;

      if (first && next) {
        const loopWidth = next.offsetLeft - first.offsetLeft;

        if (loopWidth > 0) {
          if (element.scrollLeft >= loopWidth * 2) {
            element.scrollLeft -= loopWidth;
          }

          if (previous && !paused && !document.hidden) {
            const delta = Math.min(time - previous, 50);
            element.scrollLeft += delta * 0.065;
          }
        }
      }

      previous = time;
      frame = requestAnimationFrame(animate);
    };

    element.addEventListener("mouseenter", pause);
    element.addEventListener("mouseleave", resume);
    element.addEventListener("touchstart", pause, { passive: true });
    element.addEventListener("touchend", resume);
    element.addEventListener("touchcancel", resume);

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("mouseenter", pause);
      element.removeEventListener("mouseleave", resume);
      element.removeEventListener("touchstart", pause);
      element.removeEventListener("touchend", resume);
      element.removeEventListener("touchcancel", resume);
    };
  }, [providers]);


  const moveRail = (direction: -1 | 1) => {
    const element = rail.current;
    if (!element) return;

    const first = element.children[0] as HTMLElement | undefined;
    const repeated = element.children[providers.length] as HTMLElement | undefined;
    if (!first || !repeated) return;

    const loopWidth = repeated.offsetLeft - first.offsetLeft;
    if (loopWidth <= 0) return;

    if (direction < 0 && element.scrollLeft < 196) {
      element.scrollLeft += loopWidth;
    }

    if (direction > 0 && element.scrollLeft >= loopWidth * 2) {
      element.scrollLeft -= loopWidth;
    }

    element.scrollBy({
      left: direction * 196,
      behavior: "instant",
    });
  };

  return (
    <section aria-labelledby="emergency-services-title" className="section-shell pt-2 pb-[2.8px]">
      <div className="rounded-3xl border border-red-100 bg-red-50/50 px-5 py-3 sm:px-7 sm:py-[14px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <h2 id="emergency-services-title" className="shrink-0 font-display text-2xl font-bold">7/24 Acil Hizmetler</h2>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">İşletmelerin kendi 7/24 hizmet beyanlarına dayanır. Uygunluk ve ulaşım süresini işletmeyle teyit edin.</p>
          </div>
        </div>
        {status ? <p role="status" className="py-6 text-sm">{status}</p> : null}
        <div className="relative">
          {providers.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Önceki işletmeler"
                className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-red-200 bg-white p-2 shadow-sm sm:-left-5"
                onClick={() => moveRail(-1)}
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Sonraki işletmeler"
                className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-red-200 bg-white p-2 shadow-sm sm:-right-5"
                onClick={() => moveRail(1)}
              >
                →
              </button>
            </>
          ) : null}
          <div ref={rail} tabIndex={0} aria-label="7/24 hizmet veren işletmeler" className="mt-4 flex gap-4 overflow-x-auto pb-3 scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 6 }, () => providers).flat().map((p, index) => <article key={`${p.id}-${index}`} className="w-[180px] shrink-0 snap-start overflow-hidden rounded-lg border bg-white">
            <Link
              href={`/isletme/${encodeURIComponent(p.slug)}`}
              aria-label={`${p.businessName} dijital vitrinini aç`}
              tabIndex={index >= providers.length ? -1 : 0}
              className="relative block h-[101px] overflow-hidden"
            >
              <Image src={`/api/provider-image/${p.id}`} alt={`${p.businessName} işletme fotoğrafı`} fill sizes="180px" className="object-cover" />
            </Link>
            <div className="p-3">
              <h3 className="font-bold text-sm">{p.businessName}</h3>
              <p className="text-xs">{p.serviceSlug.replaceAll("-", " ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.districtSlug} / {p.citySlug}</p>
            </div>
          </article>)}
          </div>
        </div>
      </div>
    </section>
  );
}
