"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import {
  getStoredSiteLocation,
  saveManualSiteLocation,
  SITE_LOCATION_EVENT,
  type SiteLocation,
} from "@/lib/site-location";

type DistrictDto = {
  id: string;
  slug: string;
  name: string;
};

type CityDto = {
  id: string;
  slug: string;
  name: string;
  districts: DistrictDto[];
};

type LocationSearchProps = {
  onSearch?: (value: {
    city: string;
    district: string;
  }) => void;
  initialCity?: string;
  initialDistrict?: string;
};

export function LocationSearch({
  onSearch,
  initialCity = "",
  initialDistrict = "",
}: LocationSearchProps) {
  const [cities, setCities] = useState<CityDto[]>([]);
  const [city, setCity] = useState(initialCity);
  const [district, setDistrict] = useState(initialDistrict);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const userChangedRef = useRef(false);

  const selectedCity = useMemo(
    () => cities.find((item) => item.slug === city) ?? null,
    [cities, city],
  );

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${apiBaseUrl}/api/locations`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json: unknown = await response.json();

        if (!Array.isArray(json)) {
          throw new Error("Konum API dizi dondurmedi.");
        }

        const data = json as CityDto[];

        if (data.length < 81) {
          throw new Error(`Eksik il listesi: ${data.length}`);
        }

        if (!active) return;

        setCities(data);

        if (!initialCity && !initialDistrict && !userChangedRef.current) {
          const stored = getStoredSiteLocation();

          if (
            stored &&
            data.some(
              (item) =>
                item.slug === stored.citySlug &&
                item.districts.some(
                  (districtItem) =>
                    districtItem.slug === stored.districtSlug,
                ),
            )
          ) {
            setCity(stored.citySlug);
            setDistrict(stored.districtSlug);
          }
        }
      } catch (err) {
        console.error("LocationSearch:", err);

        if (active) {
          setCities([]);
          setError("İl ve ilçe bilgileri yüklenemedi.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLocations();

    return () => {
      active = false;
    };
  }, [initialCity, initialDistrict]);

  useEffect(() => {
    function handleSiteLocation(event: Event) {
      if (userChangedRef.current || initialCity || initialDistrict) {
        return;
      }

      const location = (event as CustomEvent<SiteLocation>).detail;
      if (!location) return;

      setCity(location.citySlug);
      setDistrict(location.districtSlug);
    }

    window.addEventListener(SITE_LOCATION_EVENT, handleSiteLocation);

    return () => {
      window.removeEventListener(
        SITE_LOCATION_EVENT,
        handleSiteLocation,
      );
    };
  }, [initialCity, initialDistrict]);

  useEffect(() => {
    if (
      city &&
      cities.length > 0 &&
      !cities.some((item) => item.slug === city)
    ) {
      const timer = window.setTimeout(() => {
        setCity("");
        setDistrict("");
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [cities, city]);

  useEffect(() => {
    if (
      district &&
      selectedCity &&
      !selectedCity.districts.some(
        (item) => item.slug === district,
      )
    ) {
      const timer = window.setTimeout(() => setDistrict(""), 0);
      return () => window.clearTimeout(timer);
    }
  }, [district, selectedCity]);

  const districts = selectedCity?.districts ?? [];

  function rememberSelection(
    citySlug: string,
    districtSlug: string,
  ) {
    const cityItem =
      cities.find((item) => item.slug === citySlug) ?? null;

    const districtItem =
      cityItem?.districts.find(
        (item) => item.slug === districtSlug,
      ) ?? null;

    saveManualSiteLocation(
      citySlug,
      districtSlug,
      cityItem?.name ?? null,
      districtItem?.name ?? null,
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (!city || !district) return;

        rememberSelection(city, district);

        window.dispatchEvent(
          new CustomEvent("niv:home-location-filter", {
            detail: { city, district },
          }),
        );

        onSearch?.({ city, district });
      }}
      className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="min-w-0">
        <label
          htmlFor="niv-city"
          className="mb-1.5 block text-sm font-medium"
        >
          İl
        </label>

        <select
          id="niv-city"
          value={city}
          onChange={(event) => {
            userChangedRef.current = true;
            setCity(event.target.value);
            setDistrict("");
          }}
          disabled={loading}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {loading ? "İller yükleniyor..." : "İl Seç"}
          </option>

          {cities.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label
          htmlFor="niv-district"
          className="mb-1.5 block text-sm font-medium"
        >
          İlçe
        </label>

        <select
          id="niv-district"
          value={district}
          onChange={(event) => {
            userChangedRef.current = true;
            setDistrict(event.target.value);

            if (city && event.target.value) {
              rememberSelection(city, event.target.value);
            }
          }}
          disabled={loading || !selectedCity}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">İlçe Seç</option>

          {districts.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={loading || !city || !district}
      >
        <MapPin className="size-4" aria-hidden="true" />
        Hizmetleri Göster
      </Button>

      {error ? (
        <p className="text-sm text-destructive sm:col-span-3">
          {error}
        </p>
      ) : null}
    </form>
  );
}
