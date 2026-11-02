"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import {
  CategoryABCSelector,
  type ABCSelection,
} from "@/components/auth/CategoryABCSelector";

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

type CategoryTree = {
  id: string;
  name: string;
  services: {
    id: string;
    name: string;
    works: { id: string; name: string }[];
  }[];
};

type SavedServices = ABCSelection & {
  slots: {
    slotIndex: number;
    categoryServiceId: string;
    categoryLibraryWorkIds: string[];
  }[];
  serviceLimit: number;
  workLimit: number | null;
  version: number;
  membershipActive: boolean;
};

type Slot = {
  selection: ABCSelection;
  filled: boolean;
};

const emptySelection = (): ABCSelection => ({
  categoryServiceIds: [],
  categoryLibraryWorkIds: [],
});

function makeSlots(count: number): Slot[] {
  return Array.from({ length: count }, () => ({
    selection: emptySelection(),
    filled: false,
  }));
}

export function ProviderServicesEditor({ profile, onSaved }: Props) {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [serviceLimit, setServiceLimit] = useState(0);
  const [workLimit, setWorkLimit] = useState<number | null>(3);
  const [membershipActive, setMembershipActive] = useState(false);
  const [version, setVersion] = useState(profile.version);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<ABCSelection>(emptySelection());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = getAccessToken();
        if (!token) throw new Error("Oturum bulunamadı.");

        const [treeResponse, savedResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/categories/tree`, {
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/provider-panel/me/abc-services`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);

        if (!treeResponse.ok || !savedResponse.ok) {
          throw new Error("Hizmet bilgileri yüklenemedi.");
        }

        const tree = (await treeResponse.json()) as CategoryTree[];
        const saved = (await savedResponse.json()) as SavedServices;

        if (cancelled) return;

        const groups = tree.flatMap(category => category.services);
        const validGroupIds = new Set(groups.map(group => group.id));
        const count = Math.max(saved.serviceLimit, saved.slots.length);
        const nextSlots = makeSlots(count);

        saved.slots.forEach(savedSlot => {
          const { slotIndex, categoryServiceId, categoryLibraryWorkIds } = savedSlot;
          if (slotIndex < 0 || slotIndex >= count) return;
          if (!validGroupIds.has(categoryServiceId)) return;

          const group = groups.find(item => item.id === categoryServiceId);
          if (!group) return;

          const allowedWorkIds = new Set(group.works.map(work => work.id));

          nextSlots[slotIndex] = {
            filled: true,
            selection: {
              categoryServiceIds: [categoryServiceId],
              categoryLibraryWorkIds: categoryLibraryWorkIds.filter(
                id => allowedWorkIds.has(id)
              ),
            },
          };
        });

        setCategories(tree);
        setSlots(nextSlots);
        setServiceLimit(saved.serviceLimit);
        setWorkLimit(saved.workLimit);
        setMembershipActive(saved.membershipActive);
        setVersion(saved.version);
        setDirty(false);
        setMessage("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Yükleme hatası.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  function openEditor(index: number) {
    if (!membershipActive || index >= serviceLimit) return;

    const slot = slots[index];

    setDraft({
      categoryServiceIds: [...slot.selection.categoryServiceIds],
      categoryLibraryWorkIds: [...slot.selection.categoryLibraryWorkIds],
    });

    setEditing(index);
    setError("");
    setMessage("");
  }

  function addSelection() {
    if (editing === null) return;

    if (
      draft.categoryServiceIds.length !== 1 ||
      draft.categoryLibraryWorkIds.length === 0
    ) {
      setError("Bir hizmet grubu ve en az bir iş seçin.");
      return;
    }

    const usedWorkIds = new Set(
      slots.flatMap((slot, index) =>
        index === editing ? [] : slot.selection.categoryLibraryWorkIds
      )
    );

    if (draft.categoryLibraryWorkIds.some(id => usedWorkIds.has(id))) {
      setError("Bu iş başka bir hizmet kartında zaten seçilmiş.");
      return;
    }

    setSlots(current => current.map((slot, index) =>
      index === editing
        ? {
            filled: true,
            selection: {
              categoryServiceIds: [...draft.categoryServiceIds],
              categoryLibraryWorkIds: [...draft.categoryLibraryWorkIds],
            },
          }
        : slot
    ));

    setDirty(true);
    setEditing(null);
    setError("");
  }

  async function save() {
    if (!dirty || saving || !membershipActive) return;

    const selected = slots.filter(slot => slot.filled);

    if (selected.length === 0) {
      setError("En az bir hizmet seçmelisiniz.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token = getAccessToken();
      if (!token) throw new Error("Oturum bulunamadı.");

      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/me/abc-services`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expectedVersion: version,
            categoryServiceIds: selected.flatMap(
              slot => slot.selection.categoryServiceIds
            ),
            categoryLibraryWorkIds: selected.flatMap(
              slot => slot.selection.categoryLibraryWorkIds
            ),
            slots: slots.flatMap((slot, slotIndex) =>
              slot.filled
                ? [{
                    slotIndex,
                    categoryServiceId: slot.selection.categoryServiceIds[0],
                    categoryLibraryWorkIds:
                      slot.selection.categoryLibraryWorkIds,
                  }]
                : []
            ),
          }),
        }
      );

      const result = await response.json() as {
        message?: string;
        version?: number;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "Hizmetler kaydedilemedi.");
      }

      if (typeof result.version !== "number") {
        throw new Error(
          "Kayıt yanıtı doğrulanamadı. Yeniden kaydetmeden önce sayfayı yenileyin."
        );
      }

      setVersion(result.version);
      setDirty(false);
      setMessage("Hizmetleriniz kaydedildi.");
      onSaved({ ...profile, version: result.version });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt hatası.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Kayıtlı Hizmetlerim</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Hizmetler yükleniyor...
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Kayıtlı Hizmetlerim</h2>
        <span className="text-sm text-muted-foreground">
          {slots.filter(slot => slot.filled).length}/{serviceLimit}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {slots.map((slot, index) => (
          <div
            key={index}
            className="flex min-h-48 flex-col rounded-xl border border-border p-4"
          >
            <h3 className="font-semibold">{index + 1}. Hizmet</h3>

            <div className="mt-4 flex-1 text-sm">
              {slot.filled ? (
                categories.flatMap(category =>
                  category.services
                    .filter(service =>
                      slot.selection.categoryServiceIds.includes(service.id)
                    )
                    .map(service => (
                      <div key={service.id} className="space-y-2">
                        <p className="font-medium">{category.name}</p>
                        <p className="font-medium">{service.name}</p>
                        <p className="pt-1 font-semibold">Yapılan İşler</p>
                        <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                          {service.works
                            .filter(work =>
                              slot.selection.categoryLibraryWorkIds.includes(work.id)
                            )
                            .map(work => (
                              <li key={work.id}>{work.name}</li>
                            ))}
                        </ol>
                      </div>
                    ))
                )
              ) : (
                <p className="text-muted-foreground">
                  Henüz hizmet seçilmedi.
                </p>
              )}
            </div>

            {index < serviceLimit && membershipActive && (
              <button
                type="button"
                onClick={() => openEditor(index)}
                className="mt-4 self-end rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {slot.filled ? "Güncelle" : "+ Hizmet Ekle"}
              </button>
            )}
          </div>
        ))}
      </div>

      {!membershipActive && (
        <p className="mt-4 text-sm text-amber-700">
          Aktif üyelik bulunamadı. Hizmet düzenlemek için üyeliğinizi kontrol edin.
        </p>
      )}

      {dirty && (
        <p className="mt-4 text-sm text-amber-700">
          Kaydedilmemiş değişiklikleriniz var.
        </p>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving || !membershipActive}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      {editing !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Hizmet güncelle"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editing + 1}. Hizmet
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Kapat"
                className="rounded-lg px-3 py-1 text-xl hover:bg-muted"
              >
                ×
              </button>
            </div>

            <CategoryABCSelector
              value={draft}
              onChange={setDraft}
              serviceLimit={1}
              workLimit={workLimit}
              disabledWorkIds={slots.flatMap((slot, index) =>
                index === editing ? [] : slot.selection.categoryLibraryWorkIds
              )}
              compact
            />

            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={addSelection}
                disabled={
                  draft.categoryServiceIds.length !== 1 ||
                  draft.categoryLibraryWorkIds.length === 0
                }
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Ekle
              </button>
              {(
                draft.categoryServiceIds.length !== 1 ||
                draft.categoryLibraryWorkIds.length === 0
              ) && (
                <p className="text-xs text-red-600">
                  Seçim kontrolü: {draft.categoryServiceIds.length} hizmet grubu,
                  {" "}{draft.categoryLibraryWorkIds.length} iş seçili.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
        <p>Önceki kayıt: {profile.categorySlug} / {profile.serviceSlug}</p>
        {profile.additionalServices.length > 0 && (
          <p className="mt-1">
            Ek hizmet: {profile.additionalCategorySlug ?? "-"} /{" "}
            {profile.additionalServices.join(", ")}
          </p>
        )}
      </div>
    </section>
  );
}
