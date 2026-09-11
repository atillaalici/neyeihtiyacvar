"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getStoredUser } from "@/lib/auth";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PopularSearches } from "./PopularSearches";

const examples = [
  "Ã–rneÄŸin: Evime gÃ¼venilir bir elektrikÃ§i lazÄ±m...",
  "Ã–rneÄŸin: BilgisayarÄ±m aÃ§Ä±lmÄ±yor...",
  "Ã–rneÄŸin: YarÄ±n ev taÅŸÄ±yacaÄŸÄ±m...",
  "Ã–rneÄŸin: Klima bakÄ±mÄ±na ihtiyacÄ±m var...",
  "Ã–rneÄŸin: DÃ¼ÄŸÃ¼n iÃ§in fotoÄŸrafÃ§Ä± arÄ±yorum...",
];

const maxNeedSearchLength = 200;

export function HeroSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const rotating = !focused && query.length === 0;

  function submit(value: string) {
    const cleanQuery = value.trim();

    if (!cleanQuery) {
      inputRef.current?.focus();
      return;
    }

    const params = new URLSearchParams();
    params.set("q", cleanQuery);

    const storedUser = getStoredUser();

    if (storedUser?.citySlug && storedUser?.districtSlug) {
      params.set("il", storedUser.citySlug);
      params.set("ilce", storedUser.districtSlug);
    } else {
      params.set("yakinda", "1");
    }

    router.push(`/kesfet?${params.toString()}`);
  }

  useEffect(() => {
    if (!rotating) {
      return;
    }

    const timer = window.setInterval(() => {
      setVisible(false);

      window.setTimeout(() => {
        setIndex((current) => (current + 1) % examples.length);
        setVisible(true);
      }, 300);
    }, 3800);

    return () => {
      window.clearInterval(timer);
    };
  }, [rotating]);

  return (
    <section className="relative overflow-hidden border-b border-border bg-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] opacity-70"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)",
        }}
      />

      <div className="section-shell relative py-6 sm:py-8 lg:py-10 text-center sm:py-16">
        <p className="rise inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
          TÃ¼rkiye&apos;nin yerel ihtiyaÃ§ platformu
        </p>

        <div className="flex items-center justify-center gap-2 sm:gap-3">

          <div className="mx-auto inline-flex max-w-full items-center justify-center gap-[clamp(0.9rem,1.6vw,1.5rem)]">
            <Image
              src="/brand/neyeihtiyacvar-logo.png"
              alt=""
              width={112}
              height={112}
              priority
              className="block size-[clamp(5rem,7.5vw,7.25rem)] shrink-0 object-contain"
            />
            <h1 className="m-0 whitespace-nowrap font-display text-[clamp(2.8rem,6vw,5rem)] font-bold leading-none tracking-tight">
              Neye <span className="text-primary">ihtiyaÃ§</span> var?
            </h1>
          </div>
        </div>

        <p className="rise mx-auto mt-4 max-w-[60ch] text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          Ä°htiyacÄ±nÄ± anlat, sana en uygun kiÅŸi, iÅŸletme veya hizmeti bulalÄ±m.
        </p>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            submit(query);
          }}
          className="rise mx-auto mt-7 max-w-2xl"
        >
          <label
            htmlFor="ihtiyac-arama"
            className="sr-only"
          >
            Ä°htiyacÄ±nÄ± yaz
          </label>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2 shadow-soft transition-all duration-200 focus-within:border-primary sm:flex-row sm:items-center">
            <div className="relative flex min-w-0 flex-1 items-center gap-2.5 px-3">
              <Sparkles
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />

              <input
                id="ihtiyac-arama"
                ref={inputRef}
                type="search"
                maxLength={maxNeedSearchLength}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                onFocus={() => {
                  setFocused(true);
                }}
                onBlur={() => {
                  setFocused(false);
                }}
                placeholder={
                  focused
                    ? "Ä°htiyacÄ±nÄ± kendi cÃ¼mlenle yaz..."
                    : ""
                }
                className="w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground"
              />

              {rotating && (
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute left-[2.6rem] truncate text-base text-muted-foreground transition-opacity duration-300 ${
                    visible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {examples[index]}
                </span>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full shrink-0 sm:w-auto"
            >
              Ä°htiyacÄ±mÄ± Bul
            </Button>
          </div>
        </form>

        <p className="rise mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles
            className="size-3.5 text-primary"
            aria-hidden="true"
          />
          NasÄ±l anlatacaÄŸÄ±nÄ± dÃ¼ÅŸÃ¼nme, ihtiyacÄ±nÄ± kendi cÃ¼mlenle yaz.
        </p>

        <PopularSearches
          onSelect={(term) => {
            setQuery(term);
            submit(term);
          }}
        />
      </div>
    </section>
  );
}
