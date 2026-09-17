"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type Photo = { index: number; imageUrl: string; isCover?: boolean };
type Provider = { id: string; businessName: string };

export default function BusinessPhotoManager() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [legacyOk, setLegacyOk] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    const [providerResponse, photosResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/provider-panel/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${apiBaseUrl}/api/provider-panel/image`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);

    if (providerResponse.ok) setProvider(await providerResponse.json());

    if (photosResponse.ok) {
      const data = await photosResponse.json();
      setPhotos(Array.isArray(data) ? data : []);
      setLegacyOk(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const cover = useMemo(
    () => photos.find((photo) => photo.isCover) ?? photos[0] ?? null,
    [photos],
  );

  const others = useMemo(
    () =>
      cover
        ? photos.filter((photo) => photo.index !== cover.index).slice(0, 4)
        : photos.slice(0, 4),
    [photos, cover],
  );

  const hasLegacyOnly = !!provider && photos.length === 0 && legacyOk;
  const totalCount = photos.length > 0 ? photos.length : hasLegacyOnly ? 1 : 0;
  const remaining = Math.max(0, 5 - totalCount);
  const isTeknonet =
    provider?.businessName
      ?.toLocaleLowerCase("tr-TR")
      .includes("teknonet") ?? false;

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setError("");
    setMessage("");

    if (!selected.length) return;

    if (selected.length > remaining) {
      setError(
        `En fazla 5 fotoğraf olabilir. ${remaining} fotoğraf daha ekleyebilirsiniz.`,
      );
      event.target.value = "";
      return;
    }

    const invalid = selected.find(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024,
    );

    if (invalid) {
      setError("Fotoğraflar JPG, PNG veya WebP olmalı ve her biri en fazla 5 MB olmalıdır.");
      event.target.value = "";
      return;
    }

    setFiles(selected);
    event.target.value = "";
  }

  async function upload() {
    const token = getAccessToken();
    if (!token || !files.length) return;

    setBusy(true);
    setError("");
    setMessage("");

    let uploaded = 0;

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${apiBaseUrl}/api/provider-panel/image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.message ??
              `${file.name} yüklenemedi. ${uploaded} fotoğraf yüklendi.`,
          );
        }

        uploaded++;
      }

      setFiles([]);
      setMessage(`${uploaded} fotoğraf başarıyla yüklendi.`);
      await load();
    } catch (uploadError) {
      await load();
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Fotoğraflar yüklenemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function makeCover(index: number) {
    const token = getAccessToken();
    if (!token) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/image/cover/${index}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data?.message ?? "Kapak değiştirilemedi.");

      setMessage("Kapak fotoğrafı değiştirildi.");
      await load();
    } catch (coverError) {
      setError(
        coverError instanceof Error
          ? coverError.message
          : "Kapak değiştirilemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(index: number) {
    const token = getAccessToken();
    if (
      !token ||
      !confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")
    )
      return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/image/${index}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data?.message ?? "Fotoğraf silinemedi.");

      setMessage("Fotoğraf silindi.");
      await load();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Fotoğraf silinemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!provider) return null;

  const legacyUrl = `${apiBaseUrl}/api/providers/${provider.id}/image?v=33`;
  const coverUrl = cover
    ? `${apiBaseUrl}${cover.imageUrl}?v=33-${cover.index}`
    : legacyUrl;

  return (
    <section id="isletme-fotograflari" className="w-full">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={choose}
        className="hidden"
      />

      <div
        className={`grid gap-3 ${
          isTeknonet
            ? "md:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]"
            : "lg:grid-cols-[minmax(0,1.65fr)_minmax(330px,1fr)]"
        }`}
      >
        <div className="relative min-h-[245px] overflow-hidden rounded-2xl border bg-slate-100 shadow-sm">
          {cover || hasLegacyOnly ? (
            <img
              src={coverUrl}
              onError={() => {
                if (!cover) setLegacyOk(false);
              }}
              alt={`${provider.businessName} kapak fotoğrafı`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 flex w-full flex-col items-center justify-center border-2 border-dashed border-orange-200 bg-orange-50/40 text-orange-700"
            >
              <ImagePlus size={30} />
              <b className="mt-2">Kapak Fotoğrafı Ekle</b>
            </button>
          )}

          {(cover || hasLegacyOnly) && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-black/75 px-3 py-2 text-xs font-bold text-white">
              <Star
                size={14}
                fill="currentColor"
                className="text-yellow-400"
              />
              Kapak Fotoğrafı
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {others.map((photo) => (
            <div
              key={photo.index}
              className="group relative min-h-[115px] overflow-hidden rounded-xl border bg-slate-100"
            >
              <img
                src={`${apiBaseUrl}${photo.imageUrl}?v=33-${photo.index}`}
                alt="İşletme fotoğrafı"
                className="absolute inset-0 h-full w-full object-cover"
              />

              <button
                type="button"
                title="Fotoğrafı sil"
                onClick={() => void remove(photo.index)}
                disabled={busy}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 shadow hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>

              <button
                type="button"
                onClick={() => void makeCover(photo.index)}
                disabled={busy}
                className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 px-2 py-2 text-[11px] font-bold text-white backdrop-blur hover:bg-orange-600 disabled:opacity-50"
              >
                <Star size={12} className="mr-1 inline" />
                Kapak Yap
              </button>
            </div>
          ))}

          {Array.from({
            length: Math.min(4 - others.length, remaining),
          }).map((_, index) => (
            <button
              key={`add-${index}`}
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex min-h-[115px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/30 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              <ImagePlus size={22} />
              <b className="mt-1 text-xs">Fotoğraf Ekle</b>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {totalCount}/5 fotoğraf. Küçük fotoğraflardan istediğinizi kapak
          yapabilirsiniz.
        </span>
        {remaining === 0 && (
          <b className="text-green-700">
            <Check size={13} className="mr-1 inline" />
            Fotoğraf alanı dolu
          </b>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-slate-50 p-3 text-sm">
          <span>
            <b>{files.length}</b> fotoğraf seçildi.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFiles([])}
              disabled={busy}
              className="rounded-lg border bg-white px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => void upload()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <Upload size={14} />
              {busy
                ? "Yükleniyor..."
                : `${files.length} Fotoğrafı Yükle`}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="mt-2 text-xs font-semibold text-green-700">{message}</p>
      )}
      {error && (
        <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
      )}
    </section>
  );
}

