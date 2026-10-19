"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type Work = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type Service = {
  id: string;
  name: string;
  isActive: boolean;
  works: Work[];
};

type Category = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  services: Service[];
};

const trSort = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "tr-TR", { sensitivity: "base" });

export default function CategoryLibraryPage() {
  const [data, setData] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newCategory, setNewCategory] = useState("");
  const [newService, setNewService] = useState("");
  const [newWork, setNewWork] = useState("");
  const [editor, setEditor] = useState<null | { level: "A" | "B" | "C"; id: string; name: string }>(null);
  const [editName, setEditName] = useState("");

  const categories = useMemo(
    () => data
      
      .sort(trSort),
    [data]
  );
  const category = data.find(x => x.id === categoryId);
  const services = useMemo(
    () => [...(category?.services ?? [])].sort(trSort),
    [category]
  );
  const service = services.find(x => x.id === serviceId);
  const works = useMemo(
    () => [...(service?.works ?? [])].sort(trSort),
    [service]
  );

  const headers = useCallback((): HeadersInit => {
    const token = getAccessToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    const response = await fetch(
      `${apiBaseUrl}/api/admin/category-library`,
      { headers: headers(), cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`Kategori listesi yüklenemedi (${response.status}).`);
    }

    const result = await response.json() as Category[];
    setData(result);
  }, [headers]);

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/admin/category-library`,
          { headers: headers(), cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`Kategori listesi yüklenemedi (${response.status}).`);
        }
        const result = await response.json() as Category[];
        if (active) {
          setData(result);
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Yükleme hatası.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialLoad();
    return () => { active = false; };
  }, [headers]);

  async function request(path: string, method: string, body?: object) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: headers(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `İşlem başarısız (${response.status}).`);
    }

    return response;
  }

  async function execute(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name) return;

    void execute(async () => {
      const response = await request(
        "/api/admin/category-library/categories", "POST", { name }
      );
      const created = await response.json() as { id: string };
      setNewCategory("");
      setCategoryId(created.id);
      setServiceId("");
      setMessage("Ana kategori eklendi.");
    });
  }

  function toggleCategory(item: Category) {
    const isActive = !item.isActive;
    if (!window.confirm(
      `"${item.name}" ${isActive ? "aktif" : "pasif"} yapılsın mı?`
    )) return;

    void execute(async () => {
      await request(
        `/api/admin/category-library/categories/${item.id}/status`,
        "PATCH", { isActive }
      );
      setMessage("Ana kategori durumu güncellendi.");
    });
  }

  function addService() {
    const name = newService.trim();
    if (!categoryId || !name) return;

    void execute(async () => {
      const response = await request(
        "/api/admin/category-library/services",
        "POST", { categoryId, name }
      );
      const created = await response.json() as { id: string };
      setNewService("");
      setServiceId(created.id);
      setMessage("Alt kategori eklendi.");
    });
  }

  function toggleService(item: Service) {
    const isActive = !item.isActive;
    if (!window.confirm(
      `"${item.name}" ${isActive ? "aktif" : "pasif"} yapılsın mı?`
    )) return;

    void execute(async () => {
      await request(
        `/api/admin/category-library/services/${item.id}/status`,
        "PATCH", { isActive }
      );
      setMessage("Alt kategori durumu güncellendi.");
    });
  }

  function addWork() {
    const name = newWork.trim();
    if (!serviceId || !name) return;

    void execute(async () => {
      await request(
        "/api/admin/category-library/works",
        "POST", { categoryServiceId: serviceId, name }
      );
      setNewWork("");
      setMessage("Hizmet eklendi.");
    });
  }

  function toggleWork(item: Work) {
    void execute(async () => {
      await request(
        `/api/admin/category-library/works/${item.id}`,
        "PUT",
        {
          name: item.name,
          sortOrder: item.sortOrder,
          isActive: !item.isActive,
        }
      );
      setMessage("Hizmet durumu güncellendi.");
    });
  }

  const inputClass = "h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm";
  const buttonClass = "shrink-0 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40";

  function openEditor(level: "A" | "B" | "C") {
    const items = level === "A" ? categories : level === "B" ? services : works;
    if (items.length === 0) return;
    const selectedId = level === "A" ? categoryId : level === "B" ? serviceId : "";
    const selected = items.find(x => x.id === selectedId) ?? items[0];
    setEditor({ level, id: selected.id, name: selected.name });
    setEditName(selected.name);
  }

  function saveEdit() {
    if (!editor || editName.trim().length < 2 || busy) return;
    const { level, id } = editor;
    const name = editName.trim();
    const work = works.find(x => x.id === id);
    if (level === "C" && !work) return;
    void execute(async () => {
      if (level === "A") {
        await request(`/api/admin/category-library/categories/${id}`, "PUT", { name });
      } else if (level === "B") {
        await request(`/api/admin/category-library/services/${id}`, "PUT", { name });
      } else if (work) {
        await request(`/api/admin/category-library/works/${id}`, "PUT", {
          name, sortOrder: work.sortOrder, isActive: work.isActive,
        });
      }
      setEditor(null);
      setMessage("Değişiklik kaydedildi.");
    });
  }

  const listRow = "block w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted";

  return (
    <SiteLayout>
      <AdminNav />
      <section className="section-shell py-6 sm:py-8">
        <h1 className="font-display text-3xl font-bold">Kategori Kütüphanesi</h1>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">Ana Kategori → Alt Kategori → Hizmet · Türkçe alfabetik sıralama</p>
        {message && <div role="status" className="mb-4 rounded-xl border bg-card p-3 text-sm">{message}</div>}
        {loading && <p className="mb-3 text-sm">Kategoriler yükleniyor...</p>}
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-3 text-lg font-bold">1. Ana Kategori (A)</h2>
            <div className="mb-4 flex items-center gap-2">
              <input className={inputClass} value={newCategory} maxLength={120}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCategory(); }}
                placeholder="Yeni ana kategori" />
              <button className={buttonClass} disabled={busy || !newCategory.trim()} onClick={addCategory}>Ekle</button>
              <button className={buttonClass} disabled={busy || categories.length === 0} onClick={() => openEditor("A")}>Düzenle</button>
            </div>
            <div className="max-h-[650px] overflow-y-auto">
              {categories.map(item => (
                <button key={item.id} type="button"
                  className={`${listRow} ${categoryId === item.id ? "bg-primary/10 font-semibold" : ""} ${!item.isActive ? "text-muted-foreground" : ""}`}
                  title={item.name} onClick={() => { setCategoryId(item.id); setServiceId(""); }}>
                  {item.name}{!item.isActive ? " (Pasif)" : ""}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-1 text-lg font-bold">2. Alt Kategori (B)</h2>
            <p className="mb-3 truncate text-xs text-muted-foreground">{category?.name ?? "Önce ana kategori seçin."}</p>
            <div className="mb-4 flex items-center gap-2">
              <input className={inputClass} value={newService} maxLength={150}
                disabled={!categoryId || busy} onChange={e => setNewService(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addService(); }}
                placeholder="Yeni alt kategori" />
              <button className={buttonClass} disabled={busy || !categoryId || !newService.trim()} onClick={addService}>Ekle</button>
              <button className={buttonClass} disabled={busy || services.length === 0} onClick={() => openEditor("B")}>Düzenle</button>
            </div>
            <div className="max-h-[650px] overflow-y-auto">
              {services.map(item => (
                <button key={item.id} type="button"
                  className={`${listRow} ${serviceId === item.id ? "bg-primary/10 font-semibold" : ""} ${!item.isActive ? "text-muted-foreground" : ""}`}
                  title={item.name} onClick={() => setServiceId(item.id)}>
                  {item.name}{!item.isActive ? " (Pasif)" : ""}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-1 text-lg font-bold">3. Hizmet (C)</h2>
            <p className="mb-3 truncate text-xs text-muted-foreground">{service?.name ?? "Önce alt kategori seçin."}</p>
            <div className="mb-4 flex items-center gap-2">
              <input className={inputClass} value={newWork} maxLength={200}
                disabled={!serviceId || busy} onChange={e => setNewWork(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addWork(); }}
                placeholder="Yeni hizmet" />
              <button className={buttonClass} disabled={busy || !serviceId || !newWork.trim()} onClick={addWork}>Ekle</button>
              <button className={buttonClass} disabled={busy || works.length === 0} onClick={() => openEditor("C")}>Düzenle</button>
            </div>
            <div className="max-h-[650px] overflow-y-auto">
              {works.map(item => (
                <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <input type="checkbox" checked={item.isActive} disabled={busy}
                    onChange={() => toggleWork(item)} aria-label={`${item.name} aktif`} className="size-4 shrink-0 accent-primary" />
                  <span className={`truncate ${!item.isActive ? "text-muted-foreground" : ""}`} title={item.name}>{item.name}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </section>

      {editor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setEditor(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="category-edit-title" className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
            <h2 id="category-edit-title" className="mb-4 text-xl font-bold">{editor.level === "A" ? "Ana Kategori" : editor.level === "B" ? "Alt Kategori" : "Hizmet"} Düzenle</h2>
            <label className="mb-2 block text-sm font-medium" htmlFor="edit-select">Düzenlenecek başlık</label>
            <select id="edit-select" className="mb-4 h-11 w-full rounded-lg border bg-background px-3 text-sm" value={editor.id}
              onChange={e => {
                const items = editor.level === "A" ? categories : editor.level === "B" ? services : works;
                const item = items.find(x => x.id === e.target.value);
                if (item) { setEditor({ ...editor, id: item.id, name: item.name }); setEditName(item.name); }
              }}>
              {(editor.level === "A" ? categories : editor.level === "B" ? services : works).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <label className="mb-2 block text-sm font-medium" htmlFor="edit-name">Yeni isim</label>
            <input id="edit-name" className="mb-5 h-11 w-full rounded-lg border bg-background px-3 text-sm" value={editName}
              maxLength={editor.level === "A" ? 120 : editor.level === "B" ? 150 : 200}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveEdit(); }} />
            <div className="flex justify-end gap-2">
              <button className={buttonClass} disabled={busy} onClick={() => setEditor(null)}>İptal</button>
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                disabled={busy || editName.trim().length < 2} onClick={saveEdit}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
