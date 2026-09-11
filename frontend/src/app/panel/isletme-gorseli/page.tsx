"use client";

import {
  ChangeEvent,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ImagePlus,
  Move,
  RotateCcw,
  Trash2,
  Upload,
  ZoomIn,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type ProviderProfile = {
  id: string;
  businessName: string;
};

type Point = {
  x: number;
  y: number;
};

const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 700;
const ASPECT_RATIO = OUTPUT_WIDTH / OUTPUT_HEIGHT;

export default function ProviderImagePage() {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageVersion] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });

  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const positionStartRef = useRef<Point>({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const imageUrl = useMemo(() => {
    if (!provider) {
      return "";
    }

    return `${apiBaseUrl}/api/providers/${provider.id}/image?v=${imageVersion}`;
  }, [provider, imageVersion]);

  useEffect(() => {
    let active = true;

    async function load() {
      const token = getAccessToken();

      if (!token) {
        setError("Bu sayfayı kullanmak için işletme hesabınızla giriş yapmalısınız.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/provider-panel/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error();
        }

        const data = (await response.json()) as ProviderProfile;

        if (active) {
          setProvider(data);
          setImageFailed(false);
        }
      } catch {
        if (active) {
          setError("İşletme bilgileri yüklenemedi.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [sourceUrl]);

  function resetEditor() {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setMessage("");
    setError("");

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Yalnızca JPG, PNG veya WebP yükleyebilirsiniz.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Görsel en fazla 5 MB olabilir.");
      event.target.value = "";
      return;
    }

    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }

    const nextUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setSourceUrl(nextUrl);
    setNaturalSize({ width: 1, height: 1 });
    resetEditor();
  }

  function onSourceImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    setNaturalSize({
      width: event.currentTarget.naturalWidth || 1,
      height: event.currentTarget.naturalHeight || 1,
    });
  }

  function clampPosition(
    next: Point,
    nextZoom = zoom,
  ): Point {
    const frame = frameRef.current;

    if (!frame) {
      return next;
    }

    const frameWidth = frame.clientWidth;
    const frameHeight = frame.clientHeight;

    if (!frameWidth || !frameHeight) {
      return next;
    }

    const baseScale = Math.min(
      frameWidth / naturalSize.width,
      frameHeight / naturalSize.height,
    );

    const renderedWidth =
      naturalSize.width * baseScale * nextZoom;
    const renderedHeight =
      naturalSize.height * baseScale * nextZoom;

    const maxX = Math.max(0, (renderedWidth - frameWidth) / 2);
    const maxY = Math.max(0, (renderedHeight - frameHeight) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function changeZoom(value: number) {
    const nextZoom = Math.min(3, Math.max(0.5, value));
    setZoom(nextZoom);
    setPosition({ x: 0, y: 0 });
  }
  function getRenderedImageStyle() {
    if (naturalSize.width <= 1 || naturalSize.height <= 1) {
      return {
        width: "100%",
        height: "100%",
      };
    }

    const imageAspect = naturalSize.width / naturalSize.height;

    if (imageAspect >= ASPECT_RATIO) {
      return {
        width: `${zoom * 100}%`,
        height: "auto",
      };
    }

    return {
      width: "auto",
      height: `${zoom * 100}%`,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!selectedFile) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);

    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    positionStartRef.current = position;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || !selectedFile) {
      return;
    }

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;

    setPosition(
      clampPosition({
        x: positionStartRef.current.x + deltaX,
        y: positionStartRef.current.y + deltaY,
      }),
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDragging(false);
  }

  async function createCroppedBlob(): Promise<Blob> {
    if (!sourceUrl) {
      throw new Error("Görsel seçilmedi.");
    }

    const img = new Image();
    img.src = sourceUrl;
    await img.decode();

    const frame = frameRef.current;

    if (!frame) {
      throw new Error("Kırpma alanı bulunamadı.");
    }

    const frameWidth = frame.clientWidth;
    const frameHeight = frame.clientHeight;

    const baseScale = Math.min(
      frameWidth / img.naturalWidth,
      frameHeight / img.naturalHeight,
    );

    const renderScale = baseScale * zoom;
    const renderedWidth = img.naturalWidth * renderScale;
    const renderedHeight = img.naturalHeight * renderScale;

    const outputScaleX = OUTPUT_WIDTH / frameWidth;
    const outputScaleY = OUTPUT_HEIGHT / frameHeight;

    const destinationWidth = renderedWidth * outputScaleX;
    const destinationHeight = renderedHeight * outputScaleY;
    const destinationX =
      (OUTPUT_WIDTH - destinationWidth) / 2 + position.x * outputScaleX;
    const destinationY =
      (OUTPUT_HEIGHT - destinationHeight) / 2 + position.y * outputScaleY;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Görsel işlenemedi.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    context.drawImage(
      img,
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight,
    );

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Görsel oluşturulamadı."));
          }
        },
        "image/webp",
        0.9,
      );
    });
  }

  async function uploadImage() {
    if (!selectedFile) {
      setError("Önce bir görsel seçmelisiniz.");
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setError("Oturum bulunamadı.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const croppedBlob = await createCroppedBlob();

      if (croppedBlob.size > 5 * 1024 * 1024) {
        setError("İşlenen görsel 5 MB sınırını aştı.");
        return;
      }

      const form = new FormData();
      form.append(
        "file",
        croppedBlob,
        `isletme-${provider?.id ?? "gorsel"}.webp`,
      );

      const response = await fetch(`${apiBaseUrl}/api/provider-panel/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Görsel yüklenemedi.");
        return;
      }

      router.push("/hesabim");
      return;
    } catch (uploadError) {
      console.error(uploadError);
      setError("Görsel işlenirken veya yüklenirken bir sorun oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteImage() {
    const token = getAccessToken();

    if (!token) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/provider-panel/image`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Görsel silinemedi.");
        return;
      }

      setMessage(data?.message ?? "İşletme görseli silindi.");
      setImageFailed(true);
      setSelectedFile(null);

      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }

      setSourceUrl("");
      resetEditor();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14">
        <section className="mx-auto max-w-5xl rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <ImagePlus className="h-5 w-5" />
            </span>

            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                İşletme Görseli
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Fotoğrafınızı sabit profil alanına göre küçültün, büyütün ve konumlandırın.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 h-72 animate-pulse rounded-2xl bg-orange-50" />
          ) : error && !provider ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div>
                  <div
                    ref={frameRef}
                    className={`relative aspect-[16/7] w-full overflow-hidden rounded-2xl border border-orange-200 bg-slate-100 ${
                      selectedFile
                        ? dragging
                          ? "cursor-grabbing"
                          : "cursor-grab"
                        : ""
                    }`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    {selectedFile && sourceUrl ? (
                      <img
                        src={sourceUrl}
                        alt="İşletme görseli kırpma önizlemesi"
                        draggable={false}
                        onLoad={onSourceImageLoad}
                        className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                        style={{
                          ...getRenderedImageStyle(),
                          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                          transformOrigin: "center center",
                        }}
                      />
                    ) : !imageFailed && imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`${provider?.businessName ?? "İşletme"} görseli`}
                        className="h-full w-full object-cover"
                        onError={() => setImageFailed(true)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                        Henüz işletme görseli yüklenmemiş.
                      </div>
                    )}

                    {selectedFile ? (
                      <>
                        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/60" />

                        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                          <Move className="h-3.5 w-3.5" />
                          Sürükle • %100 görselin tamamı
                        </div>
                      </>
                    ) : null}
                  </div>

                  {selectedFile ? (
                    <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                      <div className="mx-auto flex max-w-xl items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => changeZoom(zoom - 0.1)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white text-xl font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
                          aria-label="Görseli küçült"
                          title="Küçült"
                        >
                          −
                        </button>

                        <ZoomIn className="h-4 w-4 shrink-0 text-orange-600" />

                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.01"
                          value={zoom}
                          onChange={(event) =>
                            changeZoom(Number(event.target.value))
                          }
                          className="w-full accent-orange-500"
                          aria-label="Görsel yakınlaştırma"
                        />

                        <span className="w-12 shrink-0 text-center text-xs font-semibold text-slate-600">
                          %{Math.round(zoom * 100)}
                        </span>

                        <button
                          type="button"
                          onClick={() => changeZoom(zoom + 0.1)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white text-xl font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
                          aria-label="Görseli büyüt"
                          title="Büyüt"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={resetEditor}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Kadrajı sıfırla
                      </button>
                    </div>
                  ) : null}

                  <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50/50 px-4 py-5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50">
                    <ImagePlus className="h-4 w-4" />
                    {selectedFile ? "Farklı Görsel Seç" : "Görsel Seç"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={chooseFile}
                    />
                  </label>

                  <p className="mt-2 text-xs text-muted-foreground">
                    JPG, PNG veya WebP • En fazla 5 MB • Profil alanı sabit 16:7 oranındadır.
                  </p>
                </div>

                <aside className="rounded-2xl border border-orange-100 bg-orange-50/40 p-5">
                  <h2 className="font-bold">{provider?.businessName}</h2>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Görsel %100 seviyesinde kadraja tam sığar. Ortadaki kontrollerle küçültüp büyütebilir, fotoğrafı sürükleyerek kadrajı ayarlayabilirsin.
                  </p>

                  <div className="mt-5 rounded-xl border border-orange-100 bg-white p-3 text-xs leading-5 text-slate-600">
                    <strong className="text-slate-800">Öneri:</strong>{" "}
                    Tabela, vitrin veya ana konu kadrajın orta bölümünde kalsın.
                  </div>

                  <button
                    type="button"
                    onClick={() => void uploadImage()}
                    disabled={saving || !selectedFile}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    {saving ? "İşleniyor..." : "Kadrajı Kaydet"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void deleteImage()}
                    disabled={saving || imageFailed}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Görseli Sil
                  </button>
                </aside>
              </div>

              {message ? (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}