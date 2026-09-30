"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type Photo = {
  index: number;
  imageUrl: string;
  isCover: boolean;
};

type Props = {
  providerId: string;
  businessName: string;
};

export function AdminBusinessPhotoManager({
  providerId,
  businessName,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${providerId}/images`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("İşletme fotoğrafları yüklenemedi.");
      }

      const data = (await response.json()) as Photo[];
      setPhotos(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "İşletme fotoğrafları yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPhotos();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPhotos]);

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Yalnızca JPG, PNG veya WebP fotoğraf yükleyebilirsiniz.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Fotoğraf en fazla 5 MB olabilir.");
      return;
    }

    if (photos.length >= 5) {
      setError("Bir işletme en fazla 5 fotoğraf kullanabilir.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${providerId}/images`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? "Fotoğraf yüklenemedi.");
      }

      await loadPhotos();
      setMessage("Fotoğraf başarıyla yüklendi.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Fotoğraf yüklenemedi.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function makeCover(index: number) {
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${providerId}/images/cover/${index}`,
        { method: "PUT" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? "Kapak fotoğrafı değiştirilemedi.");
      }

      await loadPhotos();
      setMessage("Kapak fotoğrafı değiştirildi.");
    } catch (coverError) {
      setError(
        coverError instanceof Error
          ? coverError.message
          : "Kapak fotoğrafı değiştirilemedi.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function deletePhoto(index: number) {
    if (!window.confirm("Bu işletme fotoğrafını silmek istiyor musunuz?")) {
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${providerId}/images/${index}`,
        { method: "DELETE" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? "Fotoğraf silinemedi.");
      }

      await loadPhotos();
      setMessage("Fotoğraf silindi.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Fotoğraf silinemedi.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold">İşletme Görselleri</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dijital vitrinde gösterilecek fotoğrafları yönetin. En fazla 5 fotoğraf.
          </p>
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={working || photos.length >= 5}
            onChange={uploadPhoto}
          />

          <Button
            type="button"
            variant="outline"
            disabled={working || photos.length >= 5}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            Fotoğraf Ekle
          </Button>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="aspect-[4/3] animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <button
          type="button"
          disabled={working}
          onClick={() => inputRef.current?.click()}
          className="mt-5 flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center transition hover:bg-muted/40 disabled:cursor-not-allowed"
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="mt-2 font-medium">Henüz fotoğraf yok</span>
          <span className="mt-1 text-sm text-muted-foreground">
            İlk fotoğraf otomatik olarak kapak fotoğrafı olur.
          </span>
        </button>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {photos.map((photo) => (
              <div
                key={photo.index}
                className="overflow-hidden rounded-xl border border-border bg-background"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  <img
                    src={`${apiBaseUrl}${photo.imageUrl}?v=${photo.index}-${photo.isCover ? "cover" : "image"}`}
                    alt={`${businessName} işletme fotoğrafı`}
                    className="h-full w-full object-cover"
                  />

                  {photo.isCover && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-xs font-semibold shadow">
                      <Star className="h-3 w-3 fill-current" />
                      Kapak
                    </span>
                  )}
                </div>

                <div className="flex gap-2 p-2">
                  {!photo.isCover && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-0 flex-1"
                      disabled={working}
                      onClick={() => void makeCover(photo.index)}
                    >
                      Kapak Yap
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={photo.isCover ? "w-full" : ""}
                    disabled={working}
                    onClick={() => void deletePhoto(photo.index)}
                    aria-label="Fotoğrafı sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {photos.length}/5 fotoğraf
          </p>
        </>
      )}
    </section>
  );
}
