"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type SearchableCatalogOption = {
  value: string;
  label: string;
  keywords?: string;
};

type Props = {
  value: string;
  options: SearchableCatalogOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyText?: string;
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function SearchableCatalogSelect({
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder = "Yazmaya başlayın...",
  disabled = false,
  emptyText = "Eşleşen seçenek bulunamadı.",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected =
    options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());

    if (!needle) {
      return options.slice(0, 80);
    }

    return options
      .filter((option) =>
        normalize(
          `${option.label} ${option.keywords ?? ""}`,
        ).includes(needle),
      )
      .slice(0, 80);
  }, [options, query]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () =>
      document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        className={[
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm outline-none transition",
          "focus:border-primary focus:ring-2 focus:ring-primary/15",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "hover:border-primary/45",
        ].join(" ")}
      >
        <span
          className={
            selected ? "truncate" : "truncate text-muted-foreground"
          }
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && !disabled ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          <div className="border-b border-border p-2">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-2">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="grid size-6 place-items-center rounded-md hover:bg-muted"
                  aria-label="Aramayı temizle"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filtered.map((option) => {
                const active = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onValueChange(option.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm",
                      active
                        ? "bg-primary/10 font-semibold text-primary"
                        : "hover:bg-muted",
                    ].join(" ")}
                  >
                    <span className="truncate">
                      {option.label}
                    </span>

                    {active ? (
                      <Check className="size-4 shrink-0" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}