"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CategoryABCSelector,
  type ABCSelection,
} from "@/components/auth/CategoryABCSelector";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Slot = {
  slotIndex: number;
  categoryServiceId: string;
  categoryLibraryWorkIds: string[];
};

type SavedServices = {
  slots: Slot[];
  serviceLimit: number;
  workLimit: number | null;
  version: number;
  membershipActive: boolean;
};

type Props = {
  providerId: string;
  onSaved: () => Promise<void>;
};

export function AdminProviderABCEditor({ providerId, onSaved }: Props) {
  const [data, setData] = useState<SavedServices | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expandedSlots, setExpandedSlots] = useState<number[]>([]);

  function toggleSlot(index: number) {
    setExpandedSlots((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${providerId}/abc-services`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("İşletmenin hizmetleri yüklenemedi.");
      }

      const result = (await response.json()) as SavedServices;
      setData(result);
      setSlots(result.slots);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Hizmetler yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateSlot(slotIndex: number, value: ABCSelection) {
    setMessage("");
    setSlots((current) =>
      current.map((slot) =>
        slot.slotIndex === slotIndex
          ? {
              ...slot,
              categoryServiceId: value.categoryServiceIds[0] ?? "",
              categoryLibraryWorkIds: value.categoryLibraryWorkIds,
            }
          : slot,
      ),
    );
  }

  function addSlot() {
    if (!data || slots.length >= data.serviceLimit) return;

    const used = new Set(slots.map((slot) => slot.slotIndex));
    const index = Array.from(
      { length: data.serviceLimit },
      (_, i) => i,
    ).find((i) => !used.has(i));

    if (index === undefined) return;

    setSlots((current) => [
      ...current,
      {
        slotIndex: index,
        categoryServiceId: "",
        categoryLibraryWorkIds: [],
      },
    ].sort((a, b) => a.slotIndex - b.slotIndex));

    setExpandedSlots((current) => [...current, index]);
    setMessage("");
  }

  function removeSlot(index: number) {
    setSlots((current) =>
      current.filter((slot) => slot.slotIndex !== index),
    );
    setExpandedSlots((current) =>
      current.filter((item) => item !== index),
    );
    setMessage("");
  }

  async function save() {
    if (!data || saving) return;

    setError("");
    setMessage("");

    if (!data.membershipActive) {
      setError("Aktif üyelik bulunamadı. Hizmetler değiştirilemez.");
      return;
    }

    if (slots.length === 0) {
      setError("En az bir hizmet kartı bulunmalıdır.");
      return;
    }

    if (
      slots.some(
        (slot) =>
          !slot.categoryServiceId ||
          slot.categoryLibraryWorkIds.length === 0,
      )
    ) {
      setError("Her kartta bir hizmet grubu ve en az bir iş seçilmelidir.");
      return;
    }

    const allWorks = slots.flatMap(
      (slot) => slot.categoryLibraryWorkIds,
    );

    if (new Set(allWorks).size !== allWorks.length) {
      setError("Aynı iş birden fazla hizmet kartında seçilemez.");
      return;
    }

    setSaving(true);

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${providerId}/abc-services`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: data.version,
            slots,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "Hizmetler kaydedilemedi.");
      }

      await load();
      setExpandedSlots([]);
      await onSaved();
      setMessage("A → B → C hizmetleri başarıyla kaydedildi.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kaydetme işlemi başarısız.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <div>
        <h2 className="text-xl font-bold">İşletme Hizmetleri (A → B → C)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ana kategori, hizmet grubu ve yapılan işleri düzenleyin.
          Bu bölüm genel işletme bilgilerinden bağımsız kaydedilir.
        </p>
      </div>

      {loading && <p>Hizmetler yükleniyor...</p>}

      {!loading && data && (
        <>
          <p className="text-sm text-muted-foreground">
            Hizmet kartı: {slots.length} / {data.serviceLimit}
            {" · "}
            Kart başına iş sınırı: {data.workLimit ?? "Sınırsız"}
          </p>

          {!data.membershipActive && (
            <p className="text-sm text-amber-700">
              Aktif üyelik bulunamadı. Kayıtlı hizmetler görüntülenebilir
              ancak değiştirilemez.
            </p>
          )}

          {slots.map((slot) => (
            <div
              key={slot.slotIndex}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                  aria-expanded={expandedSlots.includes(slot.slotIndex)}
                  aria-controls={`admin-service-slot-${slot.slotIndex}`}
                  onClick={() => toggleSlot(slot.slotIndex)}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      Hizmet Kartı {slot.slotIndex + 1}
                    </span>
                    {!expandedSlots.includes(slot.slotIndex) && (
                      <span className="block text-xs text-muted-foreground">
                        {slot.categoryLibraryWorkIds.length} iş seçili
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-lg">
                    {expandedSlots.includes(slot.slotIndex) ? "⌃" : "⌄"}
                  </span>
                </button>

                {data.membershipActive &&
                  expandedSlots.includes(slot.slotIndex) && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => removeSlot(slot.slotIndex)}
                    >
                      Kartı Kaldır
                    </Button>
                  )}
              </div>

              <div
                id={`admin-service-slot-${slot.slotIndex}`}
                className={expandedSlots.includes(slot.slotIndex) ? "mt-3" : "hidden"}
              >
              {data.membershipActive ? (
                <CategoryABCSelector
                  value={{
                    categoryServiceIds: slot.categoryServiceId
                      ? [slot.categoryServiceId]
                      : [],
                    categoryLibraryWorkIds: slot.categoryLibraryWorkIds,
                  }}
                  onChange={(value) => updateSlot(slot.slotIndex, value)}
                  serviceLimit={1}
                  workLimit={data.workLimit}
                  compact
                  disabledWorkIds={slots
                    .filter((other) => other.slotIndex !== slot.slotIndex)
                    .flatMap((other) => other.categoryLibraryWorkIds)}
                />
              ) : (
                <p className="text-sm">
                  Hizmet grubu: {slot.categoryServiceId}
                  {" · "}
                  Kayıtlı iş sayısı: {slot.categoryLibraryWorkIds.length}
                </p>
              )}
              </div>
            </div>
          ))}

          {data.membershipActive && (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={saving || slots.length >= data.serviceLimit}
                onClick={addSlot}
              >
                Hizmet Kartı Ekle
              </Button>

              <Button
                type="button"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Kaydediliyor..." : "Hizmetleri Kaydet"}
              </Button>
            </div>
          )}
        </>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
    </section>
  );
}
