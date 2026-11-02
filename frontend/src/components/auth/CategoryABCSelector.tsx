"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api";

type Work = { id: string; name: string };
type Service = { id: string; name: string; works: Work[] };
type Category = {
  id: string;
  name: string;
  slug: string;
  services: Service[];
};

export type ABCSelection = {
  categoryServiceIds: string[];
  categoryLibraryWorkIds: string[];
};

type Props = {
  value: ABCSelection;
  onChange: (value: ABCSelection) => void;
  serviceLimit: number;
  workLimit: number | null;
  compact?: boolean;
  disabledWorkIds?: string[];
};


function limitReachedMessage(count: number, limit: number) {
  if (count < limit) return null;
  return (
    <p className="mt-2 text-xs text-amber-700">
      Paketiniz en fazla {limit} iş seçimine izin veriyor.
      Daha fazlası için paketinizi yükseltebilirsiniz.
    </p>
  );
}

export function CategoryABCSelector({
  value,
  onChange,
  serviceLimit,
  workLimit,
  compact = false,
  disabledWorkIds = [],
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [activeServiceId, setActiveServiceId] = useState("");
  const [search, setSearch] = useState("");

  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (query.length < 2) return [];

    return categories.flatMap((category) =>
      category.services
        .map((service) => {
          const matchingWorks = service.works.filter((work) =>
            work.name.toLocaleLowerCase("tr-TR").includes(query),
          );

          const serviceMatches = service.name
            .toLocaleLowerCase("tr-TR")
            .includes(query);

          return {
            category,
            service,
            matchingWorks,
            serviceMatches,
          };
        })
        .filter((item) =>
          item.serviceMatches || item.matchingWorks.length > 0,
        ),
    ).slice(0, 20);
  }, [categories, search]);


  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/api/categories/tree`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Kategoriler yüklenemedi.");
        return (await response.json()) as Category[];
      })
      .then(setCategories)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Kategori kütüphanesi yüklenemedi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!compact || categories.length === 0) return;

    const selectedId = value.categoryServiceIds[0];
    if (!selectedId) return;

    const category = categories.find((item) =>
      item.services.some((service) => service.id === selectedId)
    );

    if (!category) return;

    setActiveCategoryId(category.id);
    setActiveServiceId(selectedId);
  }, [compact, categories, value.categoryServiceIds]);

  const activeCategory = categories.find(
    (item) => item.id === activeCategoryId,
  );

  const activeService = activeCategory?.services.find(
    (item) => item.id === activeServiceId,
  );

  const selectedServices = useMemo(
    () =>
      categories.flatMap((category) =>
        category.services
          .filter((service) =>
            value.categoryServiceIds.includes(service.id),
          )
          .map((service) => ({
            ...service,
            categoryName: category.name,
          })),
      ),
    [categories, value.categoryServiceIds],
  );

  function toggleService(serviceId: string) {
    const selected = value.categoryServiceIds.includes(serviceId);

    if (!selected && value.categoryServiceIds.length >= serviceLimit) {
      setError(`Paketiniz en fazla ${serviceLimit} hizmet grubuna izin veriyor.`);
      return;
    }

    setError("");

    if (selected) {
      const service = categories
        .flatMap((category) => category.services)
        .find((item) => item.id === serviceId);

      const removedWorkIds = new Set(
        service?.works.map((work) => work.id) ?? [],
      );

      onChange({
        categoryServiceIds: value.categoryServiceIds.filter(
          (id) => id !== serviceId,
        ),
        categoryLibraryWorkIds: value.categoryLibraryWorkIds.filter(
          (id) => !removedWorkIds.has(id),
        ),
      });

      return;
    }

    onChange({
      ...value,
      categoryServiceIds: [...value.categoryServiceIds, serviceId],
    });
  }

  function toggleWork(workId: string) {
    if (!activeService) return;
    if (!value.categoryServiceIds.includes(activeService.id)) return;

    if (disabledWorkIds.includes(workId)) {
      setError("Bu iş başka bir hizmet kartında zaten seçilmiş.");
      return;
    }

    const selected = value.categoryLibraryWorkIds.includes(workId);

    const selectedWorkCount = activeService.works.filter((work) =>
      value.categoryLibraryWorkIds.includes(work.id),
    ).length;

    if (!selected && workLimit !== null && selectedWorkCount >= workLimit) {
      setError(`Bu hizmet grubunda en fazla ${workLimit} iş seçebilirsiniz.`);
      return;
    }

    setError("");

    onChange({
      ...value,
      categoryLibraryWorkIds: selected
        ? value.categoryLibraryWorkIds.filter((id) => id !== workId)
        : [...value.categoryLibraryWorkIds, workId],
    });
  }


  if (compact) {
    const selectedCount = activeService?.works.filter((work) =>
      value.categoryLibraryWorkIds.includes(work.id)
    ).length ?? 0;

    function selectService(category: Category, service: Service) {
      setActiveCategoryId(category.id);
      setActiveServiceId(service.id);
      setSearch("");
      setError("");

      if (!value.categoryServiceIds.includes(service.id)) {
        onChange({
          categoryServiceIds: [service.id],
          categoryLibraryWorkIds: [],
        });
      }
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Hizmet Ara</label>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Hizmet veya iş adı yazın..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
          />
          {search.trim().length >= 2 && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
              {searchResults.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">Sonuç bulunamadı.</p>
              ) : (
                searchResults.map(({ category, service }) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => selectService(category, service)}
                    className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 last:border-0"
                  >
                    <span className="block font-medium">{service.name}</span>
                    <span className="text-xs text-slate-500">{category.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {loading && <p className="text-sm text-slate-500">Yükleniyor...</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Kategori
            <select
              value={activeCategoryId}
              onChange={(event) => {
                setActiveCategoryId(event.target.value);
                setActiveServiceId("");
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm"
            >
              <option value="">Kategori seçin</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium">
            Hizmet Grubu
            <select
              value={activeServiceId}
              disabled={!activeCategory}
              onChange={(event) => {
                const service = activeCategory?.services.find(
                  (item) => item.id === event.target.value
                );
                if (activeCategory && service) {
                  selectService(activeCategory, service);
                } else {
                  setActiveServiceId("");
                }
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm disabled:opacity-50"
            >
              <option value="">Hizmet seçin</option>
              {activeCategory?.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {activeService && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Yapılan İşler</p>
            {activeService.works.length === 0 && (
              <p className="text-sm text-slate-500">Bu grupta kayıtlı iş yok.</p>
            )}
            {activeService.works.map((work) => {
              const checked = value.categoryLibraryWorkIds.includes(work.id);
              const usedInAnotherCard = disabledWorkIds.includes(work.id);
              const limitReached =
                workLimit !== null && selectedCount >= workLimit;
              const unavailable = usedInAnotherCard || (!checked && limitReached);

              return (
                <label
                  key={work.id}
                  className={`flex items-center gap-3 py-1 text-sm ${
                    unavailable ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  title={usedInAnotherCard ? "Bu iş başka bir hizmet kartında seçilmiş." : undefined}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={unavailable}
                    onChange={() => toggleWork(work.id)}
                    className="h-4 w-4 accent-slate-800"
                  />
                  <span className={unavailable ? "text-slate-400" : ""}>
                    {work.name}
                    {usedInAnotherCard && (
                      <span className="ml-2 text-xs">(Başka kartta seçili)</span>
                    )}
                  </span>
                </label>
              );
            })}
            {workLimit !== null && limitReachedMessage(selectedCount, workLimit)}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-200 bg-white p-4">
        <label className="block text-sm font-semibold text-slate-800">
          Hangi hizmeti veriyorsunuz?
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Örneğin: avize montajı, ev temizliği, klima bakımı"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-orange-400"
          />
        </label>

        {search.trim().length >= 2 ? (
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-sm text-slate-500">
                Eşleşen hizmet bulunamadı.
              </p>
            ) : (
              searchResults.map(({ category, service, matchingWorks }) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(category.id);
                    setActiveServiceId(service.id);
                    setSearch("");
                    setError("");
                  }}
                  className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-orange-400 hover:bg-orange-50"
                >
                  <span className="block text-sm font-semibold">
                    {service.name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {category.name}
                  </span>
                  {matchingWorks.length > 0 ? (
                    <span className="mt-1 block text-xs text-orange-700">
                      {matchingWorks.slice(0, 3).map((work) => work.name).join(", ")}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-sm font-semibold">
          Hizmet grubu hakkı: {value.categoryServiceIds.length}/{serviceLimit}
        </div>
        <div className="mt-1 text-xs text-slate-600">
          Bir hizmet grubunda birden fazla iş seçebilirsiniz.
          C işleri ayrıca paket hakkı tüketmez.
        </div>
      </div>

      {loading ? <p className="text-sm">Kategoriler yükleniyor...</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          A — Ana kategori
          <select
            value={activeCategoryId}
            onChange={(event) => {
              setActiveCategoryId(event.target.value);
              setActiveServiceId("");
            }}
            className="mt-2 w-full rounded-xl border p-3"
          >
            <option value="">Ana kategori seçin</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          B — Hizmet grubu
          <select
            value={activeServiceId}
            disabled={!activeCategory}
            onChange={(event) => {
              const serviceId = event.target.value;
              if (!serviceId) {
                setActiveServiceId("");
                return;
              }

              if (
                !value.categoryServiceIds.includes(serviceId) &&
                value.categoryServiceIds.length >= serviceLimit
              ) {
                setError(
                  `Paketiniz en fazla ${serviceLimit} hizmet grubuna izin veriyor.`,
                );
                return;
              }

              setActiveServiceId(serviceId);
              setError("");

              if (!value.categoryServiceIds.includes(serviceId)) {
                onChange({
                  ...value,
                  categoryServiceIds: [...value.categoryServiceIds, serviceId],
                });
              }
            }}
            className="mt-2 w-full rounded-xl border p-3"
          >
            <option value="">Hizmet grubu seçin</option>
            {activeCategory?.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {activeService ? (
        <div className="rounded-xl border p-4">
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={value.categoryServiceIds.includes(activeService.id)}
              onChange={() => toggleService(activeService.id)}
            />
            {activeService.name} grubunu ekle
          </label>

          {value.categoryServiceIds.includes(activeService.id) ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">
                C — Yaptığınız işler
                <span className="ml-2 text-xs font-normal text-slate-500">
                  (
                  {activeService.works.filter((work) =>
                    value.categoryLibraryWorkIds.includes(work.id),
                  ).length}
                  /{workLimit === null ? "Sınırsız" : workLimit})
                </span>
              </p>
              {activeService.works.map((work) => (
                <label
                  key={work.id}
                  className={`flex items-center gap-2 text-sm ${
                    workLimit !== null &&
                    !value.categoryLibraryWorkIds.includes(work.id) &&
                    activeService.works.filter((item) =>
                      value.categoryLibraryWorkIds.includes(item.id),
                    ).length >= workLimit
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={value.categoryLibraryWorkIds.includes(work.id)}
                    disabled={
                      workLimit !== null &&
                      !value.categoryLibraryWorkIds.includes(work.id) &&
                      activeService.works.filter((item) =>
                        value.categoryLibraryWorkIds.includes(item.id),
                      ).length >= workLimit
                    }
                    onChange={() => toggleWork(work.id)}
                  />
                  {work.name}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedServices.length > 0 ? (
        <div className="rounded-xl border p-4">
          <p className="mb-3 text-sm font-semibold">Seçilen hizmet grupları</p>
          {selectedServices.map((service) => (
            <div key={service.id} className="mb-2 text-sm">
              <span className="font-medium">{service.name}</span>
              <span className="text-slate-500">
                {" "}— {service.categoryName}
              </span>
              <span className="ml-2 text-xs text-slate-500">
                ({service.works.filter((work) =>
                  value.categoryLibraryWorkIds.includes(work.id),
                ).length} iş)
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
