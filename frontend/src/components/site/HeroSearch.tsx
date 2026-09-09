"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PopularSearches } from "./PopularSearches";

const examples = [
  "Örneğin: Evime güvenilir bir elektrikçi lazım...",
  "Örneğin: Bilgisayarım açılmıyor...",
  "Örneğin: Yarın ev taşıyacağım...",
  "Örneğin: Klima bakımına ihtiyacım var...",
  "Örneğin: Düğün için fotoğrafçı arıyorum...",
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

    router.push(
      `/kesfet?q=${encodeURIComponent(cleanQuery)}`,
    );
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

      <div className="section-shell relative py-10 text-center sm:py-16">
        <p className="rise inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
          Türkiye&apos;nin yerel ihtiyaç platformu
        </p>

        <h1 className="rise mx-auto mt-5 max-w-[16ch] font-display text-4xl leading-[1.1] font-bold text-balance sm:text-6xl">
          Neye ihtiyac <span className="text-primary">var?</span>
        </h1>

        <p className="rise mx-auto mt-4 max-w-[60ch] text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          İhtiyacını anlat, sana en uygun kişi, işletme veya hizmeti bulalım.
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
            İhtiyacını yaz
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
                    ? "İhtiyacını kendi cümlenle yaz..."
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
              İhtiyacımı Bul
            </Button>
          </div>
        </form>

        <p className="rise mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles
            className="size-3.5 text-primary"
            aria-hidden="true"
          />
          Nasıl anlatacağını düşünme, ihtiyacını kendi cümlenle yaz.
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
