"use client";

import {
  PackageOpen,
  ShoppingCart,
  Sparkles,
  Wrench,
  Search,
  ClipboardPenLine,
  ShieldCheck,
  UsersRound,
  MessageSquareText,
  Clock3,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { apiBaseUrl } from "@/lib/api";
import { QuoteRequestModal } from "@/components/site/QuoteRequestModal";
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
  serviceGroupName?: string;
  id: string;
  label: string;
  keywords: string[];
  categorySlug?: string;
  serviceSlug?: string;
  intent: IntentType;
  score?: number;
};

type PopularSearchApiItem = {
  term: string | null;
  count: number;
};

type WeightedPopularSuggestion = SmartSuggestion & {
  popularity: number;
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
    categorySlug: "nakliye-ve-hafriyat",
    serviceSlug: "evden-eve-nakliyat",
    intent: "service",
  },
  {
    id: "hafriyat",
    label: "Hafriyat / kazı işi yaptırmak istiyorum",
    keywords: ["hafriyat", "kazı", "kepçe", "ekskavatör", "moloz"],
    categorySlug: "nakliye-ve-hafriyat",
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

export function HeroSearch({
  popup = false,
  searchOnly = false,
  onQuoteSubmitted,
}: {
  popup?: boolean;
  searchOnly?: boolean;
  onQuoteSubmitted?: () => void;
} = {}) {
  const searchApiBaseUrl = apiBaseUrl;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const searchSourceRef = useRef<"enter" | "button" | "typing">("button");

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedWork, setSelectedWork] = useState<SmartSuggestion | null>(null);
  const [quoteWork, setQuoteWork] = useState<SmartSuggestion | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("quoteResume") !== "1") {
      return;
    }

    const raw = sessionStorage.getItem("neyeihtiyacvar.quoteDraft");
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      if (
        typeof draft.workId !== "string" ||
        typeof draft.workName !== "string"
      ) {
        return;
      }

      setQuoteWork({
        id: `db:${draft.workId}`,
        label: draft.workName,
        keywords: [draft.workName],
        intent: "service",
        serviceGroupName: draft.serviceGroupName,
      });
    } catch {
      sessionStorage.removeItem("neyeihtiyacvar.quoteDraft");
    }
  }, []);
  const [popularSearches, setPopularSearches] = useState<
    WeightedPopularSuggestion[]
  >([]);

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
        `${searchApiBaseUrl}/api/search/intents/db-suggest?q=${encodeURIComponent(clean)}&limit=5`,
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
  }, [query, searchApiBaseUrl]);

  useEffect(() => {
    let active = true;

    async function loadPopularSearches() {
      try {
        const response = await fetch(
          `${searchApiBaseUrl}/api/analytics/popular-searches`,
          { cache: "no-store" },
        );
        if (!response.ok) return;

        const rows = (await response.json()) as PopularSearchApiItem[];
        // Mobil/ilk sayfa yukunu sinirla:
        // Ekranda en fazla 5 populer hizmet kullandigimiz icin
        // 20 ayri niyet cozme istegi gonderme.
        const sourceRows = rows
          .filter((row) => (row.term?.trim().length ?? 0) >= 2 && row.count > 0)
          .slice(0, 5);

        const resolved = await Promise.all(
          sourceRows.map(async (row) => {
            const term = row.term?.trim() ?? "";
            const r = await fetch(
              `${searchApiBaseUrl}/api/search/intents/db-suggest?q=${encodeURIComponent(term)}&limit=3`,
              { cache: "no-store" },
            );
            if (!r.ok) return null;
            const suggestions = (await r.json()) as SmartSuggestion[];
            const suggestion = suggestions[0];
            if (!suggestion?.categorySlug || !suggestion?.serviceSlug) return null;
            return { ...suggestion, popularity: row.count } as WeightedPopularSuggestion;
          }),
        );

        const grouped = new Map<string, WeightedPopularSuggestion>();
        for (const item of resolved) {
          if (!item) continue;
          const key = `${item.categorySlug}|${item.serviceSlug}`;
          const current = grouped.get(key);
          if (current) current.popularity += item.popularity;
          else grouped.set(key, { ...item });
        }

        const next = Array.from(grouped.values())
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 5);

        if (active && next.length > 0) setPopularSearches(next);
      } catch {
        // Veri yoksa varsayilan populer hizmetler kullanilir.
      }
    }

    void loadPopularSearches();
    return () => { active = false; };
  }, [searchApiBaseUrl]);

  const librarySuggestions =
    query.trim().length >= 2
      ? remoteSuggestions
      : [];

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
      .slice(0, 5);
  }, [librarySuggestions]);

  async function goToSearch(
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

    let resolvedSuggestion = suggestion;

    if (suggestion) {
      try {
        const response = await fetch(
          `${searchApiBaseUrl}/api/search/intents/db-suggest?q=${encodeURIComponent(suggestion.label)}&limit=4`,
          { cache: "no-store" },
        );

        if (response.ok) {
          const matches = (await response.json()) as SmartSuggestion[];
          const exact =
            matches.find(
              (item) => normalize(item.label) === normalize(suggestion.label),
            ) ?? matches[0];

          if (exact?.categorySlug && exact?.serviceSlug) {
            resolvedSuggestion = exact;
          }
        }
      } catch {
        // API gecici olarak erisilemezse mevcut oneriyle devam et.
      }
    }

    const params = new URLSearchParams();
    params.set("q", clean);

    if (resolvedSuggestion?.categorySlug) {
      params.set("kategori", resolvedSuggestion.categorySlug);
    }

    if (resolvedSuggestion?.serviceSlug) {
      params.set("hizmet", resolvedSuggestion.serviceSlug);
    }

    if (resolvedSuggestion?.intent) {
      params.set("niyet", resolvedSuggestion.intent);
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
    if (!suggestion.id.startsWith("db:")) return;

    setQuery(suggestion.label);
    setFocused(false);
    setSelectedWork(suggestion);
  }

  const showSuggestions =
    focused &&
    query.trim().length >= 2 &&
    visibleSuggestions.length > 0;

  const displayedPopularSearches: WeightedPopularSuggestion[] =
    popularSearches.length > 0
      ? popularSearches
      : [
          { id: "p-elektrik", label: "Elektrikçi", keywords: ["Elektrikçi"], categorySlug: "usta-tamir", serviceSlug: "elektrikci", intent: "service", score: 100, popularity: 0 },
          { id: "p-su", label: "Su tesisatçısı", keywords: ["Su tesisatçısı"], categorySlug: "usta-tamir", serviceSlug: "su-tesisatcisi", intent: "service", score: 100, popularity: 0 },
          { id: "p-nakliye", label: "Evden eve nakliyat", keywords: ["Evden eve nakliyat"], categorySlug: "nakliye-ve-hafriyat", serviceSlug: "evden-eve-nakliyat", intent: "service", score: 100, popularity: 0 },
          { id: "p-klima", label: "Klima servisi", keywords: ["Klima servisi"], categorySlug: "usta-tamir", serviceSlug: "klima-servisi", intent: "service", score: 100, popularity: 0 },
          { id: "p-bilgisayar", label: "Bilgisayar servisi", keywords: ["Bilgisayar servisi"], categorySlug: "teknoloji-yazilim", serviceSlug: "bilgisayar-servisi", intent: "service", score: 100, popularity: 0 },
        ];

  return (
    <section
      className={popup || searchOnly ? "relative isolate overflow-visible bg-transparent" : "relative z-[60] isolate overflow-visible border-b border-border bg-cream bg-no-repeat h-auto min-h-0"}
      style={popup || searchOnly ? undefined : {
        backgroundImage: "url('/Hero/hero-tokalasma.png')",
        backgroundPosition: "right center",
        backgroundSize: "cover",
      }}
    >
      <div
        aria-hidden="true"
        className={popup || searchOnly ? "hidden" : "pointer-events-none absolute inset-x-0 top-0 h-[360px] opacity-55"}
        style={{
          background:
            "radial-gradient(65% 72% at 50% 8%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 74%)",
        }}
      />
      <div className={popup || searchOnly ? "relative p-0" : "section-shell relative pt-8 pb-8 sm:pt-14 sm:pb-10"}>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col">
          

          <p className={popup || searchOnly ? "hidden" : "relative z-10 ml-0 text-left text-[13px] font-bold uppercase tracking-[0.04em] text-[#0B1930] sm:ml-0 sm:text-[17px] mb-3 sm:mb-4"}>
            Türkiye&apos;nin yerel ihtiyaç platformu
          </p>
          <div className={popup || searchOnly ? "hidden" : "relative z-10 mt-0 flex w-fit max-w-full items-center justify-start gap-2 sm:mt-0 sm:gap-3"}>
<h1 className="whitespace-nowrap font-display text-[clamp(29.9px,5.6vw,56.35px)] font-bold leading-none tracking-[-0.04em] text-[#0B1930] sm:text-[clamp(41.4px,4.2vw,69.0px)]">
              Neye <span className="text-primary">ihtiyaç</span> var?
            </h1>
          </div>
          <p className={popup || searchOnly ? "hidden" : "relative z-10 ml-0 max-w-[600px] text-left text-[13px] font-semibold leading-snug text-[#0B1930] sm:ml-0 sm:text-[19px] mt-3 sm:mt-4"}>
            İhtiyacını anlat, sana uygun işletmeyi bulalım.
          </p>


          <form
            ref={formRef}
            role="search"
            onSubmit={submit}
            className={popup || searchOnly ? "relative w-full" : "relative mt-3 w-full max-w-[760px] sm:mt-3"}
          >
            <label htmlFor="ihtiyac-arama" className="sr-only">
              İhtiyacını yaz
            </label>

            <div className="flex min-w-0 items-center rounded-[12px] border-2 border-slate-300 bg-white px-2 py-1 shadow-2xl sm:rounded-[12px] sm:px-3 sm:py-1">
              <img
                src="/brand/neyeihtiyacvar-logo.png"
                alt=""
                aria-hidden="true"
                className="ml-1 size-5 shrink-0 object-contain sm:ml-3 sm:size-7"
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
                onFocus={() => {
                  setFocused(true);

                  if (window.matchMedia("(max-width: 639px)").matches) {
                    window.setTimeout(() => {
                      const form = formRef.current;
                      if (!form) return;

                      const navbarHeight = 64;
                      const gap = 8;
                      const targetTop =
                        window.scrollY +
                        form.getBoundingClientRect().top -
                        navbarHeight -
                        gap;

                      window.scrollTo({
                        top: Math.max(0, targetTop),
                        behavior: "smooth",
                      });
                    }, 250);
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => setFocused(false), 150);
                }}
                autoComplete="off"
                placeholder="Neye ihtiyac var? Birkaç kelimeyle yaz..."
                className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[14px] outline-none placeholder:text-muted-foreground sm:h-9 sm:px-4 sm:text-[16px]"
              />

              <button
                type="submit"
                onClick={() => {
                  searchSourceRef.current = "button";
                }}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-primary px-5 text-[14px] font-semibold text-primary-foreground transition hover:bg-primary/90 sm:h-9 sm:px-7 sm:text-[15px]"
              >
                <Search className="size-5" aria-hidden="true" />
                Ara
              </button>
            </div>

            {showSuggestions ? (
              <div
                className="absolute inset-x-0 top-[calc(100%+10px)] z-50 max-h-[calc(100dvh-190px)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background text-left shadow-2xl sm:max-h-none sm:overflow-hidden"
                role="listbox"
                aria-label="İhtiyaç önerileri"
              >
                <div className="border-b border-border bg-muted/30 px-5 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Sparkles className="size-4 text-primary" aria-hidden="true" />
                    İhtiyacına uygun seçeneği seç
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
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                          <Icon
                            className="block size-5 shrink-0 text-white"
                            strokeWidth={2.25}
                            aria-hidden="true"
                          />
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

          {selectedWork ? (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedWork(null);
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="selected-work-title"
                className="w-full max-w-md rounded-2xl border border-border bg-background p-6 text-foreground shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Seçilen hizmet
                    </p>
                    <h2
                      id="selected-work-title"
                      className="mt-2 text-2xl font-bold"
                    >
                      {selectedWork.label}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedWork.serviceGroupName ?? ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Pencereyi kapat"
                    onClick={() => setSelectedWork(null)}
                    className="rounded-lg px-2 py-1 text-xl text-muted-foreground hover:bg-muted"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set("q", selectedWork.label);
                      params.set("workId", selectedWork.id.replace(/^db:/, ""));
                      setSelectedWork(null);
                      router.push(`/kesfet?${params.toString()}`);
                    }}
                    className="rounded-xl border border-border px-4 py-4 text-left font-semibold transition hover:bg-muted"
                  >
                    İşletmeleri Gör
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteWork(selectedWork);
                      setSelectedWork(null);
                    }}
                    className="rounded-xl bg-primary px-4 py-4 text-left font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Teklif Al
                  </button>
                </div>
              </div>
            </div>
          ) : null}

        </div>
      </div>

      {quoteWork ? (
        <QuoteRequestModal
          key={quoteWork.id}
          open={true}
          onClose={() => setQuoteWork(null)}
          onSubmitted={onQuoteSubmitted}
          workId={quoteWork.id.replace(/^db:/, "")}
          workName={quoteWork.label}
          serviceGroupName={quoteWork.serviceGroupName}
        />
      ) : null}
    </section>
  );
}