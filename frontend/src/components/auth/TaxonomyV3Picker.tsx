"use client";

import {
  Grid2X2,
  Layers3,
  Lightbulb,
  ListTree,
  Search,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SearchableCatalogSelect } from "@/components/auth/SearchableCatalogSelect";
import { apiBaseUrl } from "@/lib/api";
import type { CategoryDto } from "@/lib/categories";

type TaxonomyPath = {
  id: string;
  area: string;
  group: string;
  service: string;
  specialty: string;
  legacyCategorySlug: string;
  legacyServiceSlug: string;
  searchTerms?: string[];
};

type Suggestion = {
  id: string;
  area: string;
  group: string;
  service: string;
  specialty: string;
  legacyCategorySlug: string;
  legacyServiceSlug: string;
  score?: number;
  examples?: string[];
};

export type TaxonomyV3Selection = {
  area: string;
  group: string;
  service: string;
  legacyCategorySlug: string;
  legacyServiceSlug: string;
};

type Props = {
  onChange: (selection: TaxonomyV3Selection | null) => void;
  initialCategorySlug?: string;
  initialServiceSlug?: string;
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
    .trim();
}

export function TaxonomyV3Picker({
  onChange,
  initialCategorySlug = "",
  initialServiceSlug = "",
}: Props) {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [paths, setPaths] = useState<TaxonomyPath[]>([]);
  const [loading, setLoading] = useState(true);

  const [areaSlug, setAreaSlug] = useState("");
  const [groupName, setGroupName] = useState("");
  const [serviceName, setServiceName] = useState("");

  const [quickQuery, setQuickQuery] = useState("");
  const [quickSuggestions, setQuickSuggestions] = useState<Suggestion[]>([]);
  const [quickWorking, setQuickWorking] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const suppressNextQuickSearchRef = useRef(false);

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetch(`${apiBaseUrl}/api/categories`, {
        cache: "no-store",
      }),
      fetch(`${apiBaseUrl}/api/catalog/v3/paths`, {
        cache: "no-store",
      }),
    ])
      .then(async ([categoryResponse, pathResponse]) => {
        if (!categoryResponse.ok || !pathResponse.ok) {
          throw new Error("Kategori kataloğu yüklenemedi.");
        }

        const [categoryData, pathData] = await Promise.all([
          categoryResponse.json() as Promise<CategoryDto[]>,
          pathResponse.json() as Promise<TaxonomyPath[]>,
        ]);

        if (!active) {
          return;
        }

        setCategories(categoryData);
        setPaths(pathData);

        /*
         * KRITIK:
         * Wizard'da ileri/geri yapildiginda component yeniden mount olur.
         * Parent'ta saklanan categorySlug + serviceSlug ile
         * kullanicinin onceki secimi geri yuklenir.
         */
        if (initialCategorySlug) {
          setAreaSlug(initialCategorySlug);

          const savedPath =
            pathData.find(
              (path) =>
                path.legacyCategorySlug === initialCategorySlug &&
                path.legacyServiceSlug === initialServiceSlug,
            ) ??
            pathData.find(
              (path) =>
                path.legacyCategorySlug === initialCategorySlug &&
                path.legacyServiceSlug === initialServiceSlug,
            );

          if (savedPath) {
            setGroupName(savedPath.group);
            setServiceName(savedPath.service);
            suppressNextQuickSearchRef.current = true;
            setQuickQuery(savedPath.service);
            setQuickSuggestions([]);
            setQuickOpen(false);
          }
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setCategories([]);
        setPaths([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialCategorySlug, initialServiceSlug]);

  useEffect(() => {
    if (suppressNextQuickSearchRef.current) {
      suppressNextQuickSearchRef.current = false;
      return;
    }

    const clean = quickQuery.trim();

    if (clean.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      setQuickWorking(true);

      void fetch(
        `${apiBaseUrl}/api/catalog/v3/suggest?q=${encodeURIComponent(clean)}&limit=8`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      )
        .then(async (response) => {
          if (!response.ok) {
            throw new Error();
          }

          return (await response.json()) as Suggestion[];
        })
        .then((data) => {
          setQuickSuggestions(data);
          setQuickOpen(data.length > 0);
        })
        .catch((error: unknown) => {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          setQuickSuggestions([]);
          setQuickOpen(false);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setQuickWorking(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [quickQuery]);

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => category.slug === areaSlug,
      ) ?? null,
    [areaSlug, categories],
  );

  const categoryPaths = useMemo(() => {
    if (!areaSlug) {
      return [];
    }

    const categoryName = selectedCategory?.name ?? "";

    return paths.filter((path) => {
      if (path.legacyCategorySlug === areaSlug) {
        return true;
      }

      return (
        categoryName.length > 0 &&
        normalize(path.area) === normalize(categoryName)
      );
    });
  }, [areaSlug, paths, selectedCategory]);

  const groupOptions = useMemo(() => {
    const groups = Array.from(
      new Set(
        categoryPaths
          .map((path) => path.group?.trim())
          .filter(Boolean),
      ),
    );

    return groups.map((group) => ({
      value: group,
      label: group,
      keywords: categoryPaths
        .filter((path) => path.group === group)
        .flatMap((path) => [
          path.service,
          path.specialty,
          ...(path.searchTerms ?? []),
        ])
        .join(" "),
    }));
  }, [categoryPaths]);

  const groupPaths = useMemo(
    () =>
      categoryPaths.filter(
        (path) => path.group === groupName,
      ),
    [categoryPaths, groupName],
  );

  const serviceOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        groupPaths
          .map((path) => path.service?.trim())
          .filter(Boolean),
      ),
    );

    return names.map((service) => ({
      value: service,
      label: service,
      keywords: groupPaths
        .filter((path) => path.service === service)
        .flatMap((path) => [
          path.specialty,
          ...(path.searchTerms ?? []),
        ])
        .join(" "),
    }));
  }, [groupPaths]);

  function emitSelection(
    nextAreaSlug: string,
    nextGroupName: string,
    nextServiceName: string,
  ) {
    if (!nextAreaSlug || !nextGroupName || !nextServiceName) {
      onChange(null);
      return;
    }

    const category =
      categories.find(
        (item) => item.slug === nextAreaSlug,
      ) ?? null;

    const exactPath =
      paths.find(
        (path) =>
          path.legacyCategorySlug === nextAreaSlug &&
          path.group === nextGroupName &&
          path.service === nextServiceName,
      ) ??
      paths.find(
        (path) =>
          path.legacyCategorySlug === nextAreaSlug &&
          path.service === nextServiceName,
      );

    onChange({
      area: category?.name ?? exactPath?.area ?? "",
      group: nextGroupName,
      service: nextServiceName,
      legacyCategorySlug:
        exactPath?.legacyCategorySlug ?? nextAreaSlug,
      legacyServiceSlug:
        exactPath?.legacyServiceSlug ?? "",
    });
  }

  function applySuggestion(item: Suggestion) {
    setAreaSlug(item.legacyCategorySlug);
    setGroupName(item.group);
    setServiceName(item.service);

    // Programatik olarak input'u dolduruyoruz.
    // Bu degisiklik yeni bir canli arama tetiklememeli.
    suppressNextQuickSearchRef.current = true;
    setQuickQuery(item.service);
    setQuickSuggestions([]);
    setQuickOpen(false);

    onChange({
      area: item.area,
      group: item.group,
      service: item.service,
      legacyCategorySlug: item.legacyCategorySlug,
      legacyServiceSlug: item.legacyServiceSlug,
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
          <Search className="size-4 text-primary" />
          Hızlı hizmet ara
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            value={quickQuery}
            onChange={(event) => {
              const value = event.target.value;

              setQuickQuery(value);

              if (value.trim().length < 2) {
                setQuickSuggestions([]);
                setQuickOpen(false);
                setQuickWorking(false);
                return;
              }

              setQuickOpen(true);
            }}
            onFocus={() => {
              if (quickSuggestions.length > 0) {
                setQuickOpen(true);
              }
            }}
            placeholder="Örn: oto tamir, su tesisatı, bilgisayar, hafriyat, kuaför..."
            className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-primary/15"
          />

          {quickWorking ? (
            <span className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          ) : null}
        </div>

        {quickOpen ? (
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
            {quickSuggestions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Uygun hizmet bulunamadı.
              </div>
            ) : (
              quickSuggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applySuggestion(item);
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {item.service}
                    </span>

                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.area} → {item.group}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}

        <div className="mt-2 flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Hizmeti yazmaya başla; çıkan listeden seçtiğinde
            Ana Faaliyet Dalı, Hizmet Grubu ve Hizmet otomatik dolar.
          </span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <Grid2X2 className="size-4 text-muted-foreground" />
          <label className="text-xs font-semibold">
            Ana Faaliyet Dalı
          </label>
        </div>

        <SearchableCatalogSelect
          value={areaSlug}
          disabled={loading}
          placeholder="Ana faaliyet dalı seç"
          searchPlaceholder="Ana faaliyet dalı ara..."
          options={categories.map((category) => ({
            value: category.slug,
            label: category.name,
            keywords: category.services.join(" "),
          }))}
          onValueChange={(value) => {
            setAreaSlug(value);
            setGroupName("");
            setServiceName("");
            setQuickQuery("");
            onChange(null);
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <ListTree className="size-4 text-muted-foreground" />
            <label className="text-xs font-semibold">
              Hizmet Grubu
            </label>
          </div>

          <SearchableCatalogSelect
            value={groupName}
            disabled={!areaSlug || loading}
            placeholder={
              areaSlug
                ? "Hizmet grubu seç"
                : "Önce ana faaliyet dalı seç"
            }
            searchPlaceholder="Hizmet grubu ara..."
            options={groupOptions}
            onValueChange={(value) => {
              setGroupName(value);
              setServiceName("");
              setQuickQuery("");
              onChange(null);
            }}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" />
            <label className="text-xs font-semibold">
              Hizmet
            </label>
          </div>

          <SearchableCatalogSelect
            value={serviceName}
            disabled={!groupName || loading}
            placeholder={
              groupName
                ? "Hizmet seç"
                : "Önce hizmet grubu seç"
            }
            searchPlaceholder="Hizmet ara..."
            options={serviceOptions}
            onValueChange={(value) => {
              setServiceName(value);
              setQuickQuery(value);

              emitSelection(
                areaSlug,
                groupName,
                value,
              );
            }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50/50 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Layers3 className="mt-0.5 size-4 shrink-0 text-orange-600" />
          <div>
            <div className="text-xs font-bold text-foreground">
              Doğru hizmet seçimi önemli
            </div>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Seçtiğin hizmet bilgileri, işletmenin arama sonuçlarında
              doğru eşleşmesini sağlar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}