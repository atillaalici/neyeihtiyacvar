"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";

type CatalogCategory = {
  slug: string;
  name: string;
  services: string[];
};

type SeasonalService = {
  categorySlug: string;
  categoryName: string;
  serviceSlug: string;
  serviceName: string;
};

const seasonKeywords: Record<string, string[]> = {
  winter: [
    "ısıtma", "kombi", "kalorifer", "yalıtım",
    "çatı", "oluk", "doğalgaz", "soba",
  ],
  spring: [
    "bahçe", "peyzaj", "temizlik", "boya",
    "ilaçlama", "tadilat", "klima",
  ],
  summer: [
    "klima", "soğutma", "havalandırma",
    "bahçe", "peyzaj", "havuz", "sineklik",
  ],
  autumn: [
    "kombi", "ısıtma", "çatı", "oluk",
    "yalıtım", "doğalgaz", "temizlik",
  ],
};

function currentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getServiceVisual(name: string, category: string) {
  const text = name.toLocaleLowerCase("tr-TR");
  const group = category.toLocaleLowerCase("tr-TR");

  // Özel hizmet eşleşmeleri: daha genel anahtar kelimelerden önce kontrol edilir.
  if (/petek/.test(text)) return "/mevsimsel/petek-temizligi.webp";
  if (/kombi/.test(text)) return "/mevsimsel/kombi-bakimi.webp";
  if (/doğalgaz|dogalgaz/.test(text)) return "/mevsimsel/dogalgaz-tesisati.webp";
  if (/yağmur oluğu|yağmur oluk|oluk/.test(text)) return "/mevsimsel/yagmur-olugu-temizligi.webp";
  if (/çatı|cati/.test(text)) return "/mevsimsel/cati-tamiri.webp";
  if (/su yalıtımı|su izolasyon|su geçirmez/.test(text)) return "/mevsimsel/su-yalitimi.webp";
  if (/ısı yalıtımı|ısı izolasyon|mantolama/.test(text)) return "/mevsimsel/isi-yalitimi.webp";
  if (/(pencere|kapı|kapi).*(yalıtım|izolasyon)|(yalıtım|izolasyon).*(pencere|kapı|kapi)/.test(text)) return "/mevsimsel/pencere-kapi-yalitimi.webp";
  if (/klima/.test(text)) return "/mevsimsel/klima-bakimi.webp";
  if (/soba|baca/.test(text)) return "/mevsimsel/soba-baca-temizligi.webp";
  if (/budama|bahçe|peyzaj|ağaç/.test(text)) return "/mevsimsel/bahce-agac-budama.webp";
  if (/dış cephe|duvar onarım|sıva/.test(text)) return "/mevsimsel/dis-cephe-onarimi.webp";
  if (/yalıtım|izolasyon/.test(text)) return "/mevsimsel/isi-yalitimi.webp";
  if (/ısıtma|kalorifer/.test(text)) return "/mevsimsel/kombi-bakimi.webp";

  // Katalogdaki başka hizmetlerde mevcut vitrin fotoğraflarını koru.
  if (/inşaat|yapı|çatı/.test(group)) return "/vitrin/insaat-yapi.png";
  if (/tarım|bahçe|peyzaj/.test(group)) return "/vitrin/tarim-hayvancilik.png";
  if (/temizlik|ev yaşam|ev ve yaşam/.test(group)) return "/vitrin/ev-yasam.png";
  return "/vitrin/usta-tamir.png";
}

export function SeasonalNeedsSlider() {
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [status, setStatus] = useState("Mevsimsel hizmetler yükleniyor…");
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/categories`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("Katalog alınamadı.");

        const data = (await response.json()) as CatalogCategory[];
        if (controller.signal.aborted) return;

        setCatalog(data);
        setStatus("");
      } catch {
        if (controller.signal.aborted) return;
        setStatus("Mevsimsel hizmetler şu anda yüklenemedi.");
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const services = useMemo(() => {
    const all = catalog.flatMap((category) =>
      category.services.map((serviceName) => ({
        categorySlug: category.slug,
        categoryName: category.name,
        serviceSlug: slugify(serviceName),
        serviceName,
      })),
    );

    if (currentSeason() === "autumn") {
      const autumnServices = [
        ["Kombi Bakımı", "Kombi servisi"],
        ["Petek Temizliği", ""],
        ["Doğalgaz Tesisatı", "Doğalgaz Tesisatçısı"],
        ["Çatı Tamiri", "Çatı Ustası"],
        ["Su Yalıtımı", "İzolasyon ve yalıtım"],
        ["Isı Yalıtımı", "İzolasyon ve yalıtım"],
        ["Pencere ve Kapı Yalıtımı", "PVC pencere ve kapı"],
        ["Klima Bakımı", "Klima servisi"],
        ["Soba ve Baca Temizliği", "Baca temizliği"],
        ["Bahçe ve Ağaç Budama", "Bahçe İşleri"],
        ["Dış Cephe ve Duvar Onarımı", ""],
      ];

      return autumnServices.map(([displayName, catalogName]) => {
        const match = all.find(
          (service) =>
            service.serviceName.toLocaleLowerCase("tr-TR") ===
            catalogName.toLocaleLowerCase("tr-TR"),
        );

        return {
          categorySlug: match?.categorySlug ?? "",
          categoryName: match?.categoryName ?? "",
          serviceSlug: match?.serviceSlug ?? "",
          serviceName: displayName,
        };
      });
    }

    const keywords = seasonKeywords[currentSeason()];

    return all
      .map((service) => {
        const normalized = service.serviceName.toLocaleLowerCase("tr-TR");
        const score = keywords.reduce(
          (total, keyword) =>
            total + (normalized.includes(keyword) ? 1 : 0),
          0,
        );

        return { ...service, score };
      })
      .filter((service) => service.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.serviceName.localeCompare(b.serviceName, "tr"),
      )
      .slice(0, 12);
  }, [catalog]);

  useEffect(() => {
    const element = rail.current;
    const section = element?.closest("section");
    if (!element || !section || services.length < 2) return;

    const motion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (motion.matches) return;

    let frame = 0;
    let previous = 0;
    let hovering = false;
    let touching = false;

    const onEnter = () => { hovering = true; };
    const onLeave = () => {
      hovering = false;
      previous = 0;
    };
    const onTouchStart = () => { touching = true; };
    const onTouchEnd = () => {
      touching = false;
      previous = 0;
    };

    const animate = (time: number) => {
      if (previous > 0 && !hovering && !touching &&
          !document.hidden) {
        const delta = Math.min(time - previous, 50);

        // İki aynı kart grubu arasındaki tam mesafe.
        const distance = element.scrollWidth / 2;

        if (distance > 0) {
          element.scrollLeft += delta * 0.065;

          if (element.scrollLeft >= distance) {
            element.scrollLeft -= distance;
          }
        }
      }

      previous = time;
      frame = window.requestAnimationFrame(animate);
    };

    section.addEventListener("mouseenter", onEnter);
    section.addEventListener("mouseleave", onLeave);
    element.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      section.removeEventListener("mouseenter", onEnter);
      section.removeEventListener("mouseleave", onLeave);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [services]);


  const moveRail = (direction: -1 | 1) => {
    const element = rail.current;
    if (!element) return;

    const first = element.children[0] as HTMLElement | undefined;
    const repeated = element.children[services.length] as HTMLElement | undefined;
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
    <section aria-labelledby="seasonal-needs-title" className="section-shell pt-[2.8px] pb-2">
      <div className="rounded-3xl border border-amber-100 bg-amber-50/50 px-5 py-3 sm:px-7 sm:py-[14px]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
          <h2
            id="seasonal-needs-title"
            className="shrink-0 font-display text-2xl font-bold"
          >
            Mevsimin İhtiyaçları
          </h2>
          <p className="text-sm text-muted-foreground">
            Bu mevsimde ihtiyaç duyabileceğin hizmetleri keşfet.
          </p>
        </div>

        {status ? <p role="status" className="py-6 text-sm">{status}</p> : null}

        {!status && services.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Bu mevsime uygun hizmet henüz bulunamadı.
          </p>
        ) : null}

        {services.length > 0 ? (
          <div className="relative">
            {services.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Önceki mevsimsel hizmetler"
                  className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-amber-200 bg-white p-2 shadow-sm sm:-left-5"
                  onClick={() => moveRail(-1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Sonraki mevsimsel hizmetler"
                  className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-amber-200 bg-white p-2 shadow-sm sm:-right-5"
                  onClick={() => moveRail(1)}
                >
                  →
                </button>
              </>
            ) : null}

            <div
              ref={rail}
              tabIndex={0}
              aria-label="Mevsimsel hizmetler"
              className="mt-4 flex gap-4 overflow-x-auto pb-3 scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {[...services, ...services].map((service, index) => {
                const params = new URLSearchParams();
                if (service.categorySlug && service.serviceSlug) {
                  params.set("kategori", service.categorySlug);
                  params.set("hizmet", service.serviceSlug);
                }

                const image = getServiceVisual(
                  service.serviceName,
                  service.categoryName,
                );

                return (
                  <Link
                    key={`${service.serviceName}-${index}`}
                    aria-hidden={index >= services.length}
                    tabIndex={index >= services.length ? -1 : 0}
                    href={`/kesfet?${params.toString()}`}
                    className="group w-[180px] shrink-0 snap-start overflow-hidden rounded-md border border-amber-100 bg-white transition hover:border-amber-300 hover:shadow-md"
                  >
                    <div className="relative h-[130px] overflow-hidden bg-amber-50">
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="180px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    <div className="flex min-h-[70px] flex-col p-3">
                      <span className="line-clamp-2 text-sm font-bold leading-5">
                        {service.serviceName}
                      </span>
                      <span className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {service.categoryName}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
