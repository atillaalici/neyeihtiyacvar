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
      className="section-shell py-6 sm:py-8 lg:py-10"
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
