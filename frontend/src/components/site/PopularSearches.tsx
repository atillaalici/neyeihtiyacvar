"use client";

import { useEffect, useState } from "react";

import { apiBaseUrl } from "@/lib/api";

type PopularSearchesProps = {
  onSelect?: (term: string) => void;
};

type PopularSearchItem = {
  term: string | null;
  count: number;
};

const defaultTerms = [
  "Elektrikçi",
  "Su Tesisatçısı",
  "Nakliye",
  "Klima Servisi",
  "Bilgisayar Servisi",
];

export function PopularSearches({ onSelect }: PopularSearchesProps) {
  const [terms, setTerms] = useState<string[]>(defaultTerms);

  useEffect(() => {
    let active = true;

    async function loadPopularTerms() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/analytics/popular-searches`, {
          cache: "no-store",
        });

        if (!response.ok) return;

        const items = (await response.json()) as PopularSearchItem[];
        const dynamicTerms = items
          .map((item) => item.term?.trim() ?? "")
          .filter((term) => term.length >= 2)
          .slice(0, 8);

        if (active && dynamicTerms.length > 0) {
          setTerms(dynamicTerms);
        }
      } catch {
        // API erişilemezse varsayılan terimler kullanılmaya devam eder.
      }
    }

    void loadPopularTerms();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="rise mt-5 flex flex-wrap items-center justify-center gap-2">
      <span className="mr-1 text-sm text-muted-foreground">Popüler aramalar:</span>
      {terms.map((term) => (
        <button
          key={term}
          type="button"
          onClick={() => onSelect?.(term)}
          className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:border-primary hover:bg-accent hover:text-primary"
        >
          {term}
        </button>
      ))}
    </div>
  );
}
