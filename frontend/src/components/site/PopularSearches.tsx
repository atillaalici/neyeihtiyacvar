"use client";

import { useEffect, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { CategoryDto } from "@/lib/categories";

type PopularSearchesProps = {
  onSelect?: (term: string) => void;
};

const defaultTerms = [
  "Elektrikçi",
  "Su Tesisatçısı",
  "Nakliye",
  "Klima Servisi",
  "Bilgisayar Servisi",
];

export function PopularSearches({
  onSelect,
}: PopularSearchesProps) {
  const [terms, setTerms] = useState<string[]>(defaultTerms);

  useEffect(() => {
    let active = true;

    async function loadPopularTerms() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/categories`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const categories = (await response.json()) as CategoryDto[];

        const rawTerms: Array<string | undefined> = [
          categories
            .find((category) => category.slug === "usta-tamir")
            ?.services.find((service) => service === "Elektrikçi"),

          categories
            .find((category) => category.slug === "usta-tamir")
            ?.services.find((service) => service === "Su tesisatçısı"),

          categories
            .find((category) => category.slug === "nakliye-tasima")
            ?.services.find((service) => service === "Evden eve nakliyat"),

          categories
            .find((category) => category.slug === "usta-tamir")
            ?.services.find((service) => service === "Klima servisi"),

          categories
            .find((category) => category.slug === "teknoloji")
            ?.services.find((service) => service === "Bilgisayar servisi"),
        ];

        const preferredTerms = rawTerms.filter(
          (term): term is string => typeof term === "string",
        );

        if (!active || preferredTerms.length === 0) {
          return;
        }

        setTerms(preferredTerms);
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
      <span className="mr-1 text-sm text-muted-foreground">
        Popüler aramalar:
      </span>

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