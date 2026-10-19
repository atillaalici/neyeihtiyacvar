"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { CategoryDto } from "@/lib/categories";

type Services = {
  categorySlug: string;
  serviceSlug: string;
  additionalCategorySlug: string | null;
  additionalServices: string[];
  version: number;
};

type Props = {
  profile: Services;
  onSaved: (updated: Services) => void;
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıİ]/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProviderServicesEditor({ profile, onSaved }: Props) {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<0 | 1 | null>(null);
  const [category, setCategory] = useState("");
  const [service, setService] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Kategoriler yüklenemedi.");
        return (await response.json()) as CategoryDto[];
      })
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        if (active) setError("Kategori listesi alınamadı.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const current = [
    { title: "1. Ana Hizmet", category: profile.categorySlug, service: profile.serviceSlug },
    { title: "2. Ek Hizmet", category: profile.additionalCategorySlug ?? "", service: profile.additionalServices[0] ?? "" },
  ];

  const selectedCategory = categories.find((item) => item.slug === category);
  const services = selectedCategory?.services ?? [];

  function categoryName(slug: string) {
    return categories.find((item) => item.slug === slug)?.name ?? slug;
  }

  function serviceName(categorySlug: string, serviceSlug: string) {
    const found = categories.find((item) => item.slug === categorySlug)
      ?.services.find((item) => slugify(item) === serviceSlug);
    return found ?? serviceSlug;
  }

  function begin(index: 0 | 1) {
    setEditing(index);
    setCategory(current[index].category);
    setService(current[index].service);
    setError("");
    setNotice("");
  }

  async function save() {
    if (editing === null || saving) return;
    if (!category || !service) {
      setError("Kategori ve hizmet seçmelisiniz.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Oturum bulunamadı. Yeniden giriş yapın.");
      return;
    }

    const primaryCategory = editing === 0 ? category : profile.categorySlug;
    const primaryService = editing === 0 ? service : profile.serviceSlug;
    const extraCategory = editing === 1 ? category : (profile.additionalCategorySlug ?? "");
    const extraService = editing === 1 ? service : (profile.additionalServices[0] ?? "");

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/provider-panel/me/catalog`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expectedVersion: profile.version,
          categorySlug: primaryCategory,
          serviceSlug: primaryService,
          additionalCategorySlug: extraCategory || null,
          additionalServiceSlug: extraService || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.message ?? "Hizmetler kaydedilemedi.");
        return;
      }

      onSaved({
        categorySlug: data.categorySlug,
        serviceSlug: data.serviceSlug,
        additionalCategorySlug: data.additionalCategorySlug,
        additionalServices: data.additionalServices,
        version: data.version,
      });
      setEditing(null);
      setNotice("Hizmet değişikliği kaydedildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Kayıtlı Hizmetlerim</h2>
        <span className="rounded-full bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          {(profile.serviceSlug ? 1 : 0) + (profile.additionalServices[0] ? 1 : 0)} / 2 Hizmet
        </span>
      </div>

      {notice && <p role="status" className="mt-4 text-sm text-green-700">{notice}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {current.map((item, index) => (
          <div key={item.title} className="rounded-xl border border-border p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{item.title}</h3>
              {editing !== index && (
                <button
                  type="button"
                  disabled={editing !== null || loading}
                  onClick={() => begin(index as 0 | 1)}
                  className="rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  Değiştir
                </button>
              )}
            </div>

            {editing === index ? (
              <div className="mt-4 space-y-4">
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">Kategori</span>
                  <select
                    value={category}
                    onChange={(event) => { setCategory(event.target.value); setService(""); }}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3"
                  >
                    <option value="">Kategori seçin</option>
                    {categories.map((option) => (
                      <option key={option.slug} value={option.slug}>{option.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">Hizmet</span>
                  <select
                    value={service}
                    onChange={(event) => setService(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3"
                  >
                    <option value="">Hizmet seçin</option>
                    {services.map((name) => (
                      <option key={name} value={slugify(name)}>{name}</option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving || !category || !service}
                    onClick={() => void save()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => { setEditing(null); setError(""); }}
                    className="rounded-lg border border-input px-4 py-2 text-sm disabled:opacity-50"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">Kategori</p>
                <p className="mt-1 font-medium">{item.category ? categoryName(item.category) : "Seçilmemiş"}</p>
                <p className="mt-3 text-xs text-muted-foreground">Hizmet</p>
                <p className="mt-1 font-medium">
                  {item.service ? serviceName(item.category, item.service) : "Seçilmemiş"}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
