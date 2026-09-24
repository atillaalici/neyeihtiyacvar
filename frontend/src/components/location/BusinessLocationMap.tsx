"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LocationValue = {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  districtCandidates?: string[];
};

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (value: LocationValue) => void;
};

const defaultCenter: [number, number] = [39.0, 35.0];

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

async function reverseGeocode(lat: number, lon: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=tr`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );

    if (!response.ok) return undefined;

    const data = (await response.json()) as {
      display_name?: string;
      address?: {
        province?: string;
        state?: string;
        city?: string;
        town?: string;
        county?: string;
        municipality?: string;
        city_district?: string;
        district?: string;
      };
    };

    const details = data.address;

    return {
      address: data.display_name,
      city: details?.province ?? details?.state ?? details?.city,
      district:
        details?.county ??
        details?.city_district ??
        details?.municipality ??
        details?.district ??
        details?.town,
      districtCandidates: [
        details?.county,
        details?.city_district,
        details?.municipality,
        details?.district,
        details?.town,
        details?.city,
      ].filter((value): value is string => Boolean(value)),
    };
  } catch {
    return undefined;
  }
}

function ClickHandler({
  select,
}: {
  select: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(event) {
      select(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapViewport({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const map = useMap();
  const lastPosition = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();

      if (latitude === null || longitude === null) {
        if (lastPosition.current === null) {
          map.setView(defaultCenter, 6, { animate: false });
        }
        return;
      }

      const next = `${latitude.toFixed(7)}:${longitude.toFixed(7)}`;
      if (lastPosition.current === next) return;

      lastPosition.current = next;
      map.setView([latitude, longitude], 17, { animate: false });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [map, latitude, longitude]);

  return null;
}

export default function BusinessLocationMap({
  latitude,
  longitude,
  onChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lastLookup = useRef(0);
  const requestId = useRef(0);

  async function select(lat: number, lon: number) {
    const currentRequest = ++requestId.current;

    setBusy(true);
    setMessage("Adres bulunuyor...");

    const now = Date.now();
    const wait = Math.max(0, 1100 - (now - lastLookup.current));

    if (wait) {
      await new Promise((resolve) => window.setTimeout(resolve, wait));
    }

    lastLookup.current = Date.now();

    const location = await reverseGeocode(lat, lon);

    if (currentRequest !== requestId.current) return;

    onChange({
      latitude: lat,
      longitude: lon,
      address: location?.address,
      city: location?.city,
      district: location?.district,
      districtCandidates: location?.districtCandidates,
    });

    setBusy(false);
    setMessage(
      location?.address
        ? "Konum, il, ilçe ve adres alındı."
        : "Konum alındı; adresi elle kontrol edin.",
    );
  }

  function currentLocation() {
    if (!navigator.geolocation) {
      setMessage("Bu cihaz konum özelliğini desteklemiyor.");
      return;
    }

    setBusy(true);
    setMessage("Konum alınıyor...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void select(
          position.coords.latitude,
          position.coords.longitude,
        );
      },
      () => {
        setBusy(false);
        setMessage(
          "Konum alınamadı. Tarayıcı konum iznini kontrol edin.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border">
        <MapContainer
          center={defaultCenter}
          zoom={6}
          scrollWheelZoom
          className="h-[330px] w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewport
            latitude={latitude}
            longitude={longitude}
          />

          <ClickHandler
            select={(lat, lon) => {
              void select(lat, lon);
            }}
          />

          {latitude !== null && longitude !== null ? (
            <Marker
              position={[latitude, longitude]}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend(event) {
                  const point = event.target.getLatLng();
                  void select(point.lat, point.lng);
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <button
          type="button"
          onClick={currentLocation}
          disabled={busy}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "İşleniyor..." : "📍 Mevcut Konumumu Kullan"}
        </button>

        <p className="text-xs leading-5 text-muted-foreground">
          Haritaya tıklayabilir veya işaretçiyi sürükleyebilirsiniz.
        </p>

        {message ? (
          <p className="text-xs font-medium leading-5 text-muted-foreground">
            {message}
          </p>
        ) : null}

        {latitude !== null && longitude !== null ? (
          <p className="text-xs font-medium leading-5 text-green-700">
            Konum seçildi ve kaydetmeye hazır.
          </p>
        ) : (
          <p className="text-xs font-medium leading-5 text-amber-700">
            Henüz harita konumu seçilmedi.
          </p>
        )}
      </div>
    </div>
  );
}
