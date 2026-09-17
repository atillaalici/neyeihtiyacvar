"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  latitude: number;
  longitude: number;
  businessName: string;
};

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapViewport({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], 16, { animate: false });

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [map, latitude, longitude]);

  return null;
}

export default function ProviderDetailMap({
  latitude,
  longitude,
  businessName,
}: Props) {
  const position: [number, number] = [latitude, longitude];

  return (
    <div className="relative z-0 h-full min-h-[430px] w-full overflow-hidden">
      <MapContainer
        center={position}
        zoom={16}
        scrollWheelZoom
        className="h-full min-h-[430px] w-full"
      >
        <MapViewport latitude={latitude} longitude={longitude} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={position}
          icon={markerIcon}
          title={businessName}
        />
      </MapContainer>
    </div>
  );
}
