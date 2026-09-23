"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Building2, ChevronLeft, ChevronRight, Clock3, ExternalLink, Heart,
  Image as ImageIcon, MapPin, MessageCircle, Navigation, Phone,
  Share2, Star, X
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const DetailMap = dynamic(
  () => import("@/components/location/ProviderDetailMap"),
  { ssr: false },
);

type Provider = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription?: string | null;
  description?: string | null;
  categorySlug?: string;
  serviceSlug?: string;
  additionalServices?: string[];
  citySlug?: string;
  districtSlug?: string;
  publicPhone?: string | null;
  publicWhatsapp?: string | null;
  publicAddress?: string | null;
  workingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  favoriteCount?: number;
  rating?: number;
  reviewCount?: number;
};

type GalleryPhoto = {
  index: number;
  imageUrl: string;
  isCover?: boolean;
};

const label = (value?: string) =>
  value
    ? value
        .replaceAll("-", " ")
        .replace(/\b\w/g, (char) => char.toLocaleUpperCase("tr-TR"))
    : "-";

const digits = (value?: string | null) => value?.replace(/\D/g, "") ?? "";

function absoluteImageUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function ProviderDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const token = getAccessToken();
        const response = await fetch(
          `${apiBaseUrl}/api/providers/${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : undefined,
          },
        );

        if (!response.ok) {
          if (active) setProvider(null);
          return;
        }

        const data = (await response.json()) as Provider;
        if (!active) return;
        setProvider(data);

        if (data.id) {
          const galleryResponse = await fetch(
            `${apiBaseUrl}/api/providers/${data.id}/images`,
            { cache: "no-store" },
          );

          if (galleryResponse.ok) {
            const items = (await galleryResponse.json()) as GalleryPhoto[];
            if (active && Array.isArray(items)) setGallery(items);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  const photos = useMemo(() => {
    const ordered = [...gallery].sort((a, b) => {
      if (a.isCover && !b.isCover) return -1;
      if (!a.isCover && b.isCover) return 1;
      return a.index - b.index;
    });
    return ordered.slice(0, 5).map((item) => absoluteImageUrl(item.imageUrl));
  }, [gallery]);

  const currentPhoto = photos.length > 0 ? Math.min(photo, photos.length - 1) : 0;

  const isAuthenticated = Boolean(getAccessToken());
  const phone = isAuthenticated ? digits(provider?.publicPhone) : "";
  const whatsapp = isAuthenticated
    ? digits(provider?.publicWhatsapp || provider?.publicPhone)
    : "";

  function requireAuthForContact() {
    const returnUrl = `/isletme/${slug}?contact=1`;
    router.push(`/giris?returnUrl=${encodeURIComponent(returnUrl)}`);
  }
  const hasMap =
    provider?.latitude != null &&
    provider?.longitude != null &&
    Number.isFinite(provider.latitude) &&
    Number.isFinite(provider.longitude);

  const next = () => {
    if (photos.length) setPhoto((current) => (current + 1) % photos.length);
  };

  const prev = () => {
    if (photos.length) {
      setPhoto((current) => (current - 1 + photos.length) % photos.length);
    }
  };

  async function share() {
    const data = {
      title: provider?.businessName ?? "İşletme",
      url: location.href,
    };
    if (navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(location.href);
  }

  if (loading) {
    return (
      <SiteLayout>
        <main className="mx-auto max-w-7xl p-6">
          <div className="h-[620px] animate-pulse rounded-3xl bg-slate-100" />
        </main>
      </SiteLayout>
    );
  }

  if (!provider) {
    return (
      <SiteLayout>
        <main className="mx-auto max-w-7xl p-10 text-center">
          <h1 className="text-2xl font-bold">İşletme bulunamadı</h1>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main className="min-h-screen bg-[#f7f9fb] text-slate-900">
        <section className="border-b bg-white">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[340px_1fr_300px]">
            <div className="relative h-[245px] overflow-hidden rounded-2xl bg-slate-100">
              {photos.length ? (
                <img
                  onClick={() => setLightbox(true)}
                  src={photos[currentPhoto]}
                  alt={provider.businessName}
                  className="h-full w-full cursor-zoom-in object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <ImageIcon size={46} />
                </div>
              )}

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Önceki fotoğraf"
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/65 p-2 text-white"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    type="button"
                    aria-label="Sonraki fotoğraf"
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/65 p-2 text-white"
                  >
                    <ChevronRight />
                  </button>
                </>
              )}

              {!!photos.length && (
                <span className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white">
                  {currentPhoto + 1}/{photos.length}
                </span>
              )}
            </div>

            <div className="py-1">
              <h1 className="text-3xl font-black">{provider.businessName}</h1>
              <p className="mt-1 font-semibold text-slate-600">
                {label(provider.serviceSlug)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Star className="fill-amber-400 text-amber-400" size={20} />
                <b>{provider.rating ?? "Yeni"}</b>
                {provider.reviewCount != null && (
                  <span className="text-sm text-slate-500">
                    ({provider.reviewCount} değerlendirme)
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700">
                  Açık
                </span>
                {provider.workingHours && (
                  <span className="flex items-center gap-1 text-sm text-slate-600">
                    <Clock3 size={16} />
                    {provider.workingHours}
                  </span>
                )}
              </div>
              <p className="mt-4 max-w-2xl leading-6 text-slate-600">
                {provider.shortDescription ||
                  provider.description ||
                  "İşletme bilgilerini, hizmetlerini, fotoğraflarını ve konumunu inceleyebilirsiniz."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFavorite((value) => !value)}
                  className="flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-3 font-semibold"
                >
                  <Heart
                    className={
                      favorite ? "fill-red-500 text-red-500" : "text-red-500"
                    }
                    size={19}
                  />
                  Favorilere Ekle
                </button>
                <button
                  type="button"
                  onClick={() => void share()}
                  className="flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-3 font-semibold"
                >
                  <Share2 size={18} />
                  Paylaş
                </button>
              </div>

              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={requireAuthForContact}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white"
                >
                  <Phone size={19} />
                  İletişim İçin Giriş Yap
                </button>
              ) : (
                <>
                  {phone && (
                    <a href={`tel:+${phone}`} className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white">
                      <Phone size={19} />
                      {provider.publicPhone}
                    </a>
                  )}
                  {whatsapp && (
                    <a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}`} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 font-bold text-white">
                      <MessageCircle size={20} />
                      WhatsApp&apos;tan Yaz
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-4 px-4 py-5">
          <div className="flex items-end justify-center gap-12 border-b bg-white px-5 pt-1">
            <a
              href="#degerlendirmeler"
              className="flex items-center gap-2 border-b-2 border-transparent px-1 py-3 text-sm font-bold text-slate-600 transition hover:border-orange-500 hover:text-orange-600"
            >
              <Star size={17} className="text-amber-500" />
              Değerlendirmeler
            </a>
            <a
              href="#konum"
              className="flex items-center gap-2 border-b-2 border-orange-500 px-1 py-3 text-sm font-bold text-orange-600"
            >
              <MapPin size={17} />
              Konum
            </a>
          </div>

          <section
            id="konum"
            className="scroll-mt-20 grid overflow-hidden rounded-2xl border bg-white shadow-sm lg:grid-cols-[420px_1fr]"
          >
            <div className="space-y-5 p-6">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <MapPin className="text-emerald-600" />
                  Konum
                </h2>
                <p className="ml-8 text-sm text-slate-500">
                  Kolayca bulun, bize ulaşın
                </p>
              </div>

              <Info
                icon={Building2}
                title="Adres"
                value={provider.publicAddress || "-"}
              />
              <Info
                icon={MapPin}
                title="İl"
                value={label(provider.citySlug)}
              />
              <Info
                icon={Navigation}
                title="İlçe"
                value={label(provider.districtSlug)}
              />

              <div className="flex gap-3">
                <MapPin className="mt-1 shrink-0 text-slate-500" size={20} />
                <div>
                  <b className="text-sm">Enlem / Boylam</b>
                  <div className="mt-1 text-sm leading-5 text-slate-700">
                    {hasMap
                      ? `${provider.latitude!.toFixed(6)}, ${provider.longitude!.toFixed(6)}`
                      : "Konum bilgisi henüz eklenmemiş"}
                  </div>
                </div>
              </div>

              {hasMap ? (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${provider.latitude},${provider.longitude}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white"
                >
                  <Navigation size={19} />
                  Yol Tarifi Al
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white opacity-50"
                >
                  <Navigation size={19} />
                  Yol Tarifi Al
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {hasMap ? (
                  <>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${provider.latitude},${provider.longitude}`}
                      className="flex items-center justify-center gap-2 rounded-xl border bg-white p-3 text-center text-sm font-semibold"
                    >
                      <ExternalLink size={16} />
                      Google Maps&apos;te Aç
                    </a>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://maps.apple.com/?ll=${provider.latitude},${provider.longitude}`}
                      className="flex items-center justify-center gap-2 rounded-xl border bg-white p-3 text-center text-sm font-semibold"
                    >
                      <ExternalLink size={16} />
                      Apple Harita&apos;da Aç
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled
                      className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border bg-slate-50 p-3 text-center text-sm font-semibold text-slate-400"
                    >
                      <ExternalLink size={16} />
                      Google Maps&apos;te Aç
                    </button>
                    <button
                      type="button"
                      disabled
                      className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border bg-slate-50 p-3 text-center text-sm font-semibold text-slate-400"
                    >
                      <ExternalLink size={16} />
                      Apple Harita&apos;da Aç
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs leading-5 text-slate-600">
                <b className="text-slate-700">Not:</b> Yol tarifi butonu ile
                bulunduğunuz konuma göre işletmeye en hızlı rotayı
                oluşturabilirsiniz.
              </div>
            </div>

            <div className="min-h-[430px] bg-slate-100">
              {hasMap ? (
                <DetailMap
                  latitude={provider.latitude!}
                  longitude={provider.longitude!}
                  businessName={provider.businessName}
                />
              ) : (
                <div className="flex h-full min-h-[430px] items-center justify-center text-slate-500">
                  İşletme konumu henüz eklenmemiş.
                </div>
              )}
            </div>
          </section>

          <section
            id="fotograflar"
            className="scroll-mt-20 rounded-2xl border bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <ImageIcon className="text-emerald-600" />
                  Fotoğraflar
                </h2>
                <p className="text-sm text-slate-500">
                  İşletmemizden kareler
                </p>
              </div>
              <span className="rounded-xl border px-4 py-2 text-sm font-semibold">
                Tüm Fotoğrafları Gör ({photos.length})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {photos.length ? (
                photos.map((image, index) => (
                  <button
                    type="button"
                    key={image}
                    onClick={() => {
                      setPhoto(index);
                      setLightbox(true);
                    }}
                    className="h-36 overflow-hidden rounded-xl"
                  >
                    <img
                      src={image}
                      alt={`${provider.businessName} fotoğraf ${index + 1}`}
                      className="h-full w-full object-cover transition hover:scale-105"
                    />
                  </button>
                ))
              ) : (
                <div className="col-span-full rounded-xl bg-slate-50 p-10 text-center text-slate-500">
                  İşletme henüz fotoğraf eklememiş.
                </div>
              )}
            </div>
          </section>

          <section
            id="degerlendirmeler"
            className="scroll-mt-20 rounded-2xl border bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <Star className="fill-amber-400 text-amber-400" />
                  Değerlendirmeler
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Müşterilerin işletme hakkındaki görüşleri
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-5 py-3 text-center">
                <div className="text-2xl font-black">
                  {provider.rating ?? "Yeni"}
                </div>
                <div className="text-xs text-slate-500">
                  {provider.reviewCount ?? 0} değerlendirme
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-dashed p-8 text-center text-slate-500">
              {(provider.reviewCount ?? 0) > 0
                ? "Değerlendirmeler burada listelenecek."
                : "Bu işletme için henüz değerlendirme yapılmamış."}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-emerald-800">
                  Yakındaki İşletmeler
                </h2>
                <p className="text-sm text-slate-500">
                  Bu işletmeye yakın diğer işletmeleri keşfedin.
                </p>
              </div>
              <a
                href="/kesfet"
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                Tümünü Gör →
              </a>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Nearby />
              <Nearby />
              <Nearby />
            </div>
          </section>
        </div>

        {lightbox && photos.length > 0 && (
          <div
            className="fixed inset-0 z-[99999] isolate flex items-center justify-center bg-black/90 p-5"
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              aria-label="Fotoğraf görünümünü kapat"
              className="absolute right-5 top-5 text-white"
              onClick={() => setLightbox(false)}
            >
              <X size={34} />
            </button>
            <button
              type="button"
              aria-label="Önceki fotoğraf"
              onClick={(event) => {
                event.stopPropagation();
                prev();
              }}
              className="absolute left-5 rounded-full bg-white/15 p-3 text-white"
            >
              <ChevronLeft size={32} />
            </button>
            <img
              onClick={(event) => event.stopPropagation()}
              src={photos[currentPhoto]}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            <button
              type="button"
              aria-label="Sonraki fotoğraf"
              onClick={(event) => {
                event.stopPropagation();
                next();
              }}
              className="absolute right-5 rounded-full bg-white/15 p-3 text-white"
            >
              <ChevronRight size={32} />
            </button>
          </div>
        )}
      </main>
    </SiteLayout>
  );
}

function Info({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof MapPin;
  title: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-1 text-slate-500" size={20} />
      <div>
        <b className="text-sm">{title}</b>
        <div className="mt-1 text-sm leading-5 text-slate-700">{value}</div>
      </div>
    </div>
  );
}

function Nearby() {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <div className="h-14 w-20 rounded-lg bg-slate-100" />
      <div className="min-w-0 flex-1">
        <b className="block truncate">Yakındaki İşletme</b>
        <span className="text-sm text-slate-500">
          Yakınınızdaki hizmet
        </span>
      </div>
      <MapPin size={16} className="text-slate-500" />
    </div>
  );
}

