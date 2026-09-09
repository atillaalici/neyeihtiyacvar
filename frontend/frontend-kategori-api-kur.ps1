$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"

New-Item -ItemType Directory -Force "$root\src\lib" | Out-Null
New-Item -ItemType Directory -Force "$root\src\components\site" | Out-Null

@'
import type { LucideIcon } from "lucide-react";
import {
  Wrench,
  Home,
  Truck,
  Laptop,
  Car,
  GraduationCap,
  PartyPopper,
  LayoutGrid,
} from "lucide-react";

export type CategoryDto = {
  id: string;
  slug: string;
  name: string;
  services: string[];
};

export type CategoryViewModel = CategoryDto & {
  icon: LucideIcon;
};

const categoryIcons: Record<string, LucideIcon> = {
  "usta-tamir": Wrench,
  "ev-yasam": Home,
  "nakliye-tasima": Truck,
  teknoloji: Laptop,
  otomotiv: Car,
  egitim: GraduationCap,
  organizasyon: PartyPopper,
  diger: LayoutGrid,
};

export function withCategoryIcons(
  categories: CategoryDto[],
): CategoryViewModel[] {
  return categories.map((category) => ({
    ...category,
    icon: categoryIcons[category.slug] ?? LayoutGrid,
  }));
}
'@ | Set-Content -Encoding UTF8 "$root\src\lib\categories.ts"

@'
import Link from "next/link";

import type { CategoryViewModel } from "@/lib/categories";

export function CategoryCard({
  category,
}: {
  category: CategoryViewModel;
}) {
  const Icon = category.icon;

  return (
    <Link
      href={`/kategoriler#${category.slug}`}
      className="home-category-card group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lift"
    >
      <span className="grid size-13 place-items-center rounded-xl bg-accent/70 text-accent-foreground transition-colors duration-200 group-hover:bg-accent group-hover:text-primary">
        <Icon
          className="size-6"
          aria-hidden="true"
        />
      </span>

      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight transition-colors duration-200 group-hover:text-primary">
        {category.name}
      </h3>

      <ul className="mt-3 space-y-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground/90">
        {category.services.slice(0, 4).map((service) => (
          <li key={service}>
            {service}
          </li>
        ))}
      </ul>

      {category.services.length > 4 && (
        <span className="mt-auto pt-3 text-xs font-medium text-primary/80 transition-colors duration-200 group-hover:text-primary">
          +{category.services.length - 4} hizmet daha
        </span>
      )}
    </Link>
  );
}
'@ | Set-Content -Encoding UTF8 "$root\src\components\site\CategoryCard.tsx"

@'
"use client";

import { useEffect, useState } from "react";

import { CategoryCard } from "./CategoryCard";
import { apiBaseUrl } from "@/lib/api";
import {
  type CategoryDto,
  type CategoryViewModel,
  withCategoryIcons,
} from "@/lib/categories";

export function CategoryGrid({
  withHeading = true,
}: {
  withHeading?: boolean;
}) {
  const [categories, setCategories] = useState<CategoryViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${apiBaseUrl}/api/categories`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Kategori verileri alınamadı.");
        }

        const data = (await response.json()) as CategoryDto[];

        if (!active) {
          return;
        }

        setCategories(withCategoryIcons(data));
      } catch {
        if (!active) {
          return;
        }

        setError("Kategoriler yüklenemedi.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      id="kategoriler"
      className="section-shell py-12 sm:py-16"
    >
      {withHeading && (
        <header className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-balance sm:text-4xl">
            Ne arıyorsan burada
          </h2>

          <p className="mt-2.5 text-muted-foreground">
            İhtiyacına uygun kategoriyi seç veya yukarıya neye ihtiyacın olduğunu yaz.
          </p>
        </header>
      )}

      {loading && (
        <div className="mt-8 grid auto-rows-fr grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="mt-8 text-sm text-red-600">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-8 grid auto-rows-fr grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
            />
          ))}
        </div>
      )}
    </section>
  );
}
'@ | Set-Content -Encoding UTF8 "$root\src\components\site\CategoryGrid.tsx"

@'
"use client";

import { useEffect, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { CategoryDto } from "@/lib/categories";

type PopularSearchesProps = {
  onSelect?: (term: string) => void;
};

export function PopularSearches({
  onSelect,
}: PopularSearchesProps) {
  const [terms, setTerms] = useState<string[]>([
    "Elektrikçi",
    "Su Tesisatçısı",
    "Nakliye",
    "Klima Servisi",
    "Bilgisayar Servisi",
  ]);

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

        const preferredTerms = [
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
        ].filter((term): term is string => Boolean(term));

        if (!active || preferredTerms.length === 0) {
          return;
        }

        setTerms(preferredTerms);
      } catch {
        // Varsayılan terimler kullanılmaya devam eder.
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
'@ | Set-Content -Encoding UTF8 "$root\src\components\site\PopularSearches.tsx"

Write-Host ""
Write-Host "Kategori bilesenleri artik /api/categories endpointinden besleniyor." -ForegroundColor Green
Write-Host ""
Write-Host "Kalan categories.ts kullanimlari:" -ForegroundColor Yellow

$matches = Get-ChildItem "$root\src" -Recurse -Include *.ts,*.tsx |
    Select-String -Pattern '@/data/categories'

if ($matches) {
    $matches | ForEach-Object {
        Write-Host "$($_.Path):$($_.LineNumber) $($_.Line.Trim())"
    }
} else {
    Write-Host "Kalan kullanim yok. src\data\categories.ts artik silinebilir." -ForegroundColor Green
}

Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Cyan
