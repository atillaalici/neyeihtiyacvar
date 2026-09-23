"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

import "leaflet/dist/leaflet.css";
type Provider = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription?: string | null;
  categorySlug?: string | null;
  serviceSlug?: string | null;
  citySlug?: string | null;
  districtSlug?: string | null;
  publicPhone?: string | null;
  publicWhatsapp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isVerifiedBusiness?: boolean;
  publicationStatus?: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5155";

function prettySlug(value?: string | null) {
  if (!value) return "";
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function HomeProvidersMapClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<LeafletMarker[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");

  useEffect(() => {
    const handler = (event: Event) => {
      const e = event as CustomEvent<{ city?: string; district?: string }>;
      setCityFilter(e.detail?.city ?? "");
      setDistrictFilter(e.detail?.district ?? "");
    };
    window.addEventListener("niv:home-location-filter", handler as EventListener);
    return () =>
      window.removeEventListener("niv:home-location-filter", handler as EventListener);
  }, []);

  const filteredProviders = useMemo(
    () =>
      providers.filter((provider) => {
        if (cityFilter && provider.citySlug !== cityFilter) return false;
        if (districtFilter && provider.districtSlug !== districtFilter) return false;
        return true;
      }),
    [providers, cityFilter, districtFilter],
  );

  const mappedProviders = useMemo(
    () =>
      filteredProviders.filter(
        (p) =>
          typeof p.latitude === "number" &&
          Number.isFinite(p.latitude) &&
          typeof p.longitude === "number" &&
          Number.isFinite(p.longitude),
      ),
    [filteredProviders],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(`${API_BASE}/api/providers`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Provider API HTTP ${response.status}`);
        }

        const data = (await response.json()) as Provider[];
        if (!cancelled) setProviders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Home providers map API error:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || loading || error) return;

    let disposed = false;

    async function createMap() {
      const L = await import("leaflet");
      if (disposed || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      markerRefs.current = [];

      const map = L.map(containerRef.current, {
        center: [37.074, 36.246],
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      mappedProviders.forEach((provider) => {
        const lat = provider.latitude as number;
        const lng = provider.longitude as number;
        const safeName = escapeHtml(provider.businessName);
        const category = prettySlug(provider.categorySlug);
        const service = prettySlug(provider.serviceSlug);
        const detailParts = [category, service].filter(Boolean);
        const safeDetails = escapeHtml(detailParts.join(" · "));
        const safeSlug = encodeURIComponent(provider.slug);

        const icon = L.divIcon({
          className: "niv-business-marker",
          html: `
            <div class="niv-marker-wrap">
              <div class="niv-marker-label">${safeName}</div>
              <div class="niv-marker-pin">
                <span></span>
              </div>
            </div>
          `,
          iconSize: [44, 54],
          iconAnchor: [22, 50],
          popupAnchor: [0, -48],
        });

        const marker = L.marker([lat, lng], {
          icon,
          title: provider.businessName,
          riseOnHover: true,
        }).addTo(map);

        marker.bindPopup(
          `
            <div class="niv-map-popup">
              <strong>${safeName}</strong>
              ${safeDetails ? `<div>${safeDetails}</div>` : ""}
              <a href="/isletme/${safeSlug}">İşletmeyi Gör →</a>
            </div>
          `,
          {
            closeButton: true,
            offset: [0, -4],
          },
        );

        markerRefs.current.push(marker);
        bounds.extend([lat, lng]);
      });

      if (mappedProviders.length === 1) {
        map.setView(
          [
            mappedProviders[0].latitude as number,
            mappedProviders[0].longitude as number,
          ],
          14,
        );
      } else if (mappedProviders.length > 1 && bounds.isValid()) {
        map.fitBounds(bounds.pad(0.35), {
          maxZoom: 14,
        });
      }

            const refreshMapSize = () => map.invalidateSize({ animate: false });
      window.setTimeout(refreshMapSize, 0);
      window.setTimeout(refreshMapSize, 150);
      window.setTimeout(refreshMapSize, 500);
    }

    void createMap();

    return () => {
      disposed = true;
      markerRefs.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mappedProviders, loading, error]);

  if (loading) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-2xl border bg-[#fffdf9] text-sm text-muted-foreground">
        İşletme konumları yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-2xl border bg-[#fffdf9] text-sm text-muted-foreground">
        İşletme konumları şu anda yüklenemedi.
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .niv-business-marker {
          background: transparent !important;
          border: 0 !important;
        }

        .niv-marker-wrap {
          position: relative;
          width: 44px;
          height: 54px;
        }

        .niv-marker-pin {
          position: absolute;
          left: 7px;
          bottom: 4px;
          width: 30px;
          height: 30px;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          background: #f97316;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
          transform: rotate(-45deg);
        }

        .niv-marker-pin span {
          position: absolute;
          left: 8px;
          top: 8px;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #ffffff;
        }

        .niv-marker-label {
          position: absolute;
          z-index: 5;
          left: 22px;
          bottom: 48px;
          transform: translateX(-50%);
          width: max-content;
          max-width: 210px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.96);
          padding: 5px 9px;
          color: #0f172a;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.1;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.14);
          pointer-events: none;
        }

        .niv-map-popup {
          min-width: 180px;
          color: #0f172a;
        }

        .niv-map-popup strong {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
        }

        .niv-map-popup div {
          margin-bottom: 9px;
          color: #64748b;
          font-size: 12px;
        }

        .niv-map-popup a {
          display: inline-block;
          border-radius: 8px;
          background: #f97316;
          padding: 7px 10px;
          color: white !important;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none !important;
        }

        @media (max-width: 640px) {
          .niv-marker-label {
            max-width: 125px;
            font-size: 10px;
            padding: 4px 6px;
          }
        }
      `}</style>

      <div
        ref={containerRef}
        className="leaflet-container w-full overflow-hidden rounded-2xl border bg-[#fffdf9]"
        style={{ width: "100%", height: "420px", minHeight: "420px" }}
        aria-label={`${mappedProviders.length} işletmenin harita konumu`}
      />
    </>
  );
}