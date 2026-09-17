"use client";

import {
  PackageOpen,
  ShoppingCart,
  Sparkles,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiBaseUrl } from "@/lib/api";
import { trackPlatformAnalytics } from "@/lib/platform-analytics";
import {
  useEffect,
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";

type IntentType =
  | "repair"
  | "sale"
  | "rental"
  | "service";

type SmartSuggestion = {
  id: string;
  label: string;
  keywords: string[];
  categorySlug?: string;
  serviceSlug?: string;
  intent: IntentType;
  score?: number;
};

const smartSuggestions: SmartSuggestion[] = [
  {
    id: "priz-ariza",
    label: "Priz arızalı / çalışmıyor",
    keywords: ["priz", "piriz", "priz arızalı", "priz çalışmıyor"],
    categorySlug: "usta-tamir",
    serviceSlug: "elektrikci",
    intent: "repair",
  },
  {
    id: "priz-satin-al",
    label: "Priz satın almak istiyorum",
    keywords: ["priz", "piriz", "priz satın al", "priz lazım"],
    categorySlug: "ev-yasam",
    serviceSlug: "yapi-market",
    intent: "sale",
  },
  {
    id: "musluk-ariza",
    label: "Musluk su kaçırıyor / arızalı",
    keywords: ["musluk", "musluk kaçırıyor", "batarya kaçırıyor"],
    categorySlug: "usta-tamir",
    serviceSlug: "su-tesisatcisi",
    intent: "repair",
  },
  {
    id: "musluk-satin-al",
    label: "Musluk / batarya satın almak istiyorum",
    keywords: ["musluk", "batarya", "musluk satın al", "batarya satın al"],
    categorySlug: "ev-yasam",
    serviceSlug: "yapi-market",
    intent: "sale",
  },
  {
    id: "matkap-satin-al",
    label: "Matkap satın almak istiyorum",
    keywords: ["matkap", "şarjlı matkap", "darbeli matkap"],
    categorySlug: "ev-yasam",
    serviceSlug: "yapi-market",
    intent: "sale",
  },
  {
    id: "matkap-kirala",
    label: "Matkap / ekipman kiralamak istiyorum",
    keywords: ["matkap", "matkap kirala", "ekipman kirala"],
    categorySlug: "kiralama",
    serviceSlug: "ekipman-kiralama",
    intent: "rental",
  },
  {
    id: "kablo-satin-al",
    label: "Elektrik kablosu satın almak istiyorum",
    keywords: ["kablo", "elektrik kablosu", "3x2.5", "3x1.5"],
    categorySlug: "ev-yasam",
    serviceSlug: "yapi-market",
    intent: "sale",
  },
  {
    id: "kablo-cekilecek",
    label: "Elektrik hattı / kablo çektirmek istiyorum",
    keywords: ["kablo", "hat çek", "elektrik hattı", "kablo çektir"],
    categorySlug: "usta-tamir",
    serviceSlug: "elektrikci",
    intent: "repair",
  },
  {
    id: "sigorta-ariza",
    label: "Elektrik sigortası sürekli atıyor",
    keywords: ["sigorta", "sigorta atıyor", "şalter atıyor"],
    categorySlug: "usta-tamir",
    serviceSlug: "elektrikci",
    intent: "repair",
  },
  {
    id: "sigorta-satin-al",
    label: "Elektrik sigortası satın almak istiyorum",
    keywords: ["sigorta", "otomatik sigorta", "kaçak akım rölesi"],
    categorySlug: "ev-yasam",
    serviceSlug: "yapi-market",
    intent: "sale",
  },
  {
    id: "boya-usta",
    label: "Evimi / iş yerimi boyatmak istiyorum",
    keywords: ["boya", "boyacı", "ev boya", "duvar boya"],
    categorySlug: "usta-tamir",
    serviceSlug: "boyaci",
    intent: "repair",
  },
  {
    id: "boya-satin-al",
    label: "Boya ve boya malzemesi satın almak istiyorum",
    keywords: ["boya", "boya al", "rulo", "fırça"],
    categorySlug: "ev-yasam",
    serviceSlug: "yapi-market",
    intent: "sale",
  },
  {
    id: "fayans-usta",
    label: "Fayans / seramik döşetmek istiyorum",
    keywords: ["fayans", "seramik", "fayans döşeme"],
    categorySlug: "usta-tamir",
    serviceSlug: "fayans-seramik-ustasi",
    intent: "repair",
  },
  {
    id: "fayans-satin-al",
    label: "Fayans / seramik satın almak istiyorum",
    keywords: ["fayans", "seramik", "fayans satın al"],
    categorySlug: "ev-yasam",
    serviceSlug: "yapi-market",
    intent: "sale",
  },
  {
    id: "cimento-satin-al",
    label: "Çimento / yapı malzemesi satın almak istiyorum",
    keywords: ["çimento", "cimento", "kum", "bims", "tuğla", "briket"],
    categorySlug: "ev-yasam",
    serviceSlug: "yapi-market",
    intent: "sale",
  },
  {
    id: "klima-servis",
    label: "Klima arızası / bakım servisi arıyorum",
    keywords: ["klima", "klima arızalı", "klima bakım", "klima soğutmuyor"],
    categorySlug: "usta-tamir",
    serviceSlug: "klima-servisi",
    intent: "repair",
  },
  {
    id: "bilgisayar-servis",
    label: "Bilgisayar teknik servisi arıyorum",
    keywords: ["bilgisayar", "pc", "bilgisayar açılmıyor", "format"],
    categorySlug: "teknoloji-yazilim",
    serviceSlug: "bilgisayar-teknik-servisi",
    intent: "repair",
  },
  {
    id: "telefon-servis",
    label: "Cep telefonu tamiri yaptırmak istiyorum",
    keywords: ["telefon", "telefon ekran", "telefon tamir", "şarj olmuyor"],
    categorySlug: "teknoloji-yazilim",
    serviceSlug: "cep-telefonu-tamiri",
    intent: "repair",
  },
  {
    id: "ev-tasima",
    label: "Evden eve nakliyat arıyorum",
    keywords: ["ev taşı", "nakliye", "eşya taşı", "evden eve"],
    categorySlug: "nakliye-hafriyat",
    serviceSlug: "evden-eve-nakliyat",
    intent: "service",
  },
  {
    id: "hafriyat",
    label: "Hafriyat / kazı işi yaptırmak istiyorum",
    keywords: ["hafriyat", "kazı", "kepçe", "ekskavatör", "moloz"],
    categorySlug: "nakliye-hafriyat",
    serviceSlug: "hafriyat",
    intent: "service",
  },
];

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .trim();
}

function iconForIntent(intent: IntentType) {
  if (intent === "sale") {
    return ShoppingCart;
  }

  if (intent === "rental") {
    return PackageOpen;
  }

  return Wrench;
}

function intentText(intent: IntentType) {
  if (intent === "sale") {
    return "Satın alma";
  }

  if (intent === "rental") {
    return "Kiralama";
  }

  if (intent === "repair") {
    return "Tamir / hizmet";
  }

  return "Hizmet";
}

export function HeroSearch() {
  const searchApiBaseUrl = apiBaseUrl || "http://localhost:5155";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSourceRef = useRef<"enter" | "button" | "typing">("button");

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const clean = normalize(query);

    if (clean.length < 2) {
      return [];
    }

    return smartSuggestions
      .map((item) => {
        const exactKeyword = item.keywords.some(
          (keyword) => normalize(keyword) === clean,
        );

        const startsWith = item.keywords.some(
          (keyword) => normalize(keyword).startsWith(clean),
        );

        const includes = item.keywords.some(
          (keyword) =>
            normalize(keyword).includes(clean) ||
            clean.includes(normalize(keyword)),
        );

        const labelMatch = normalize(item.label).includes(clean);

        const score =
          exactKeyword ? 100 : startsWith ? 80 : includes ? 60 : labelMatch ? 40 : 0;

        return {
          item,
          score,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((entry) => entry.item);
  }, [query]);
  const [remoteSuggestions, setRemoteSuggestions] =
    useState<SmartSuggestion[]>([]);

  useEffect(() => {
    const clean = query.trim();

    if (clean.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      fetch(
        `${searchApiBaseUrl}/api/search/intents/db-suggest?q=${encodeURIComponent(clean)}&limit=8`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error("Arama kutuphanesi alinamadi.");
          }

          return response.json();
        })
        .then((data: SmartSuggestion[]) => {
          setRemoteSuggestions(
            (Array.isArray(data) ? data : [])
              .slice()
              .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
          );
        })
        .catch((error: unknown) => {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          setRemoteSuggestions([]);
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const librarySuggestions =
    query.trim().length >= 2 &&
    remoteSuggestions.length > 0
      ? remoteSuggestions
      : suggestions;

  // Son kullanıcıya gösterilecek önerileri görünen etiket üzerinden tekilleştir.
  // Aynı ihtiyacın backend'de farklı kayıt/id/serviceSlug ile dönmesi UI'da tekrar oluşturmaz.
  const visibleSuggestions = useMemo(() => {
    const unique = new Map<string, SmartSuggestion>();

    for (const suggestion of librarySuggestions) {
      const key = normalize(suggestion.label);
      const current = unique.get(key);

      if (!current || (suggestion.score ?? 0) > (current.score ?? 0)) {
        unique.set(key, suggestion);
      }
    }

    return Array.from(unique.values())
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 8);
  }, [librarySuggestions]);

  function goToSearch(
    value: string,
    suggestion?: SmartSuggestion,
    source: "enter" | "button" | "typing" = "button",
  ) {
    const clean = value.trim();

    if (!clean) {
      inputRef.current?.focus();
      return;
    }

    trackPlatformAnalytics({
      eventType: "search_submit",
      searchTerm: clean,
      source,
    });

    const params = new URLSearchParams();
    params.set("q", clean);

    if (suggestion?.categorySlug) {
      params.set("kategori", suggestion.categorySlug);
    }

    if (suggestion?.serviceSlug) {
      params.set("hizmet", suggestion.serviceSlug);
    }

    if (suggestion?.intent) {
      params.set("niyet", suggestion.intent);
    }

    router.push(`/kesfet?${params.toString()}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const first = visibleSuggestions[0];
    const second = visibleSuggestions[1];
    const ambiguousTop =
      Boolean(first && second) &&
      (first?.score ?? 0) >= 70 &&
      ((first?.score ?? 0) - (second?.score ?? 0)) < 12;

    if (ambiguousTop) {
      setFocused(true);
      return;
    }

    if (visibleSuggestions.length === 1) {
      goToSearch(
        visibleSuggestions[0].label,
        visibleSuggestions[0],
        searchSourceRef.current,
      );
      return;
    }

    goToSearch(query, undefined, searchSourceRef.current);
  }

  function chooseSuggestion(suggestion: SmartSuggestion) {
    setQuery(suggestion.label);
    setFocused(false);
    goToSearch(suggestion.label, suggestion, "typing");
  }

  const showSuggestions =
    focused &&
    query.trim().length >= 2 &&
    visibleSuggestions.length > 0;

  return (
    <section className="relative overflow-visible border-b border-border bg-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] opacity-55"
        style={{
          background:
            "radial-gradient(65% 72% at 50% 8%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 74%)",
        }}
      />

      <div className="section-shell relative py-14 sm:py-20">
        <div className="mx-auto max-w-[1120px]">
          <div className="flex justify-center">
            <span className="inline-flex items-center rounded-full border border-border bg-background/95 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-primary shadow-sm sm:text-xs">
              Türkiye&apos;nin yerel ihtiyaç platformu
            </span>
          </div>

          <div className="mx-auto mt-3 flex max-w-[1120px] items-center justify-center gap-4 sm:gap-6">
            <div className="relative h-[126px] w-[126px] shrink-0 sm:h-[148px] sm:w-[148px]">
              <Image
                src="/brand/neyeihtiyacvar-logo.png"
                alt="neyeihtiyacvar.com"
                fill
                priority
                sizes="138px"
                className="object-contain"
              />
            </div>

            <h1 className="whitespace-nowrap font-display text-[68px] font-bold leading-none tracking-[-0.05em] text-foreground sm:text-[80px]">
              Neye <span className="text-primary">ihtiyaç</span> var?
            </h1>
          </div>

          <p className="mx-auto mt-4 max-w-[920px] text-center text-[20px] leading-8 text-muted-foreground sm:text-[22px]">
            İhtiyacını anlat, sana en uygun kişi, işletme veya hizmeti bulalım.
          </p>

          <form
            role="search"
            onSubmit={submit}
            className="relative mx-auto mt-10 max-w-[1120px]"
          >
            <label htmlFor="ihtiyac-arama" className="sr-only">
              İhtiyacını yaz
            </label>

            <div className="flex items-center rounded-[24px] border border-border bg-background px-3 py-2.5 shadow-lg ring-1 ring-black/[0.02]">
              <Sparkles
                className="ml-3 size-7 shrink-0 text-primary"
                aria-hidden="true"
              />

              <input
                ref={inputRef}
                id="ihtiyac-arama"
                value={query}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    searchSourceRef.current = "enter";
                  }
                }}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => setFocused(false), 150);
                }}
                autoComplete="off"
                placeholder="Örneğin: Bilgisayarım açılmıyor..."
                className="h-14 min-w-0 flex-1 bg-transparent px-4 text-[19px] outline-none placeholder:text-muted-foreground sm:text-[21px]"
              />

              <button
                type="submit"
                onClick={() => {
                  searchSourceRef.current = "button";
                }}
                className="inline-flex h-14 shrink-0 items-center justify-center rounded-[18px] bg-primary px-9 text-[18px] font-semibold text-primary-foreground transition hover:bg-primary/90 sm:px-11 sm:text-[20px]"
              >
                İhtiyacımı Bul
              </button>
            </div>

            {showSuggestions ? (
              <div
                className="absolute inset-x-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-border bg-background text-left shadow-2xl"
                role="listbox"
                aria-label="İhtiyaç önerileri"
              >
                <div className="border-b border-border bg-muted/30 px-5 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Sparkles className="size-4 text-primary" aria-hidden="true" />
                    Ne yapmak istediğini seç
                  </div>
                </div>

                <div className="p-2">
                  {visibleSuggestions.map((suggestion) => {
                    const Icon = iconForIntent(suggestion.intent);

                    return (
                      <button
                        key={suggestion.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseSuggestion(suggestion)}
                        className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition hover:bg-muted"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-foreground">
                            {suggestion.label}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">
                            {intentText(suggestion.intent)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </form>

          <p className="mx-auto mt-6 flex max-w-[900px] items-center justify-center gap-2 text-center text-[17px] text-muted-foreground sm:text-[18px]">
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            Nasıl anlatacağını düşünme, ihtiyacını kendi cümlenle yaz.
          </p>

          <div className="mx-auto mt-8 flex max-w-[1220px] flex-wrap items-center justify-center gap-4">
            <span className="text-[17px] text-muted-foreground sm:text-[18px]">
              Popüler aramalar:
            </span>

            {["Elektrikçi", "Su tesisatçısı", "Evden eve nakliyat", "Klima servisi", "Bilgisayar servisi"].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    goToSearch(item, undefined, "button");
                  }}
                  className="rounded-full border border-border bg-background px-6 py-2.5 text-[16px] text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-primary sm:text-[17px]"
                >
                  {item}
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}