$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"

New-Item -ItemType Directory -Force "$root\src\lib" | Out-Null
New-Item -ItemType Directory -Force "$root\src\components\site" | Out-Null

@'
export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:5155";
'@ | Set-Content -Encoding UTF8 "$root\src\lib\api.ts"

@'
"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiBaseUrl } from "@/lib/api";

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

  const selectedCity = useMemo(
    () => cities.find((candidate) => candidate.slug === city) ?? null,
    [cities, city],
  );

  const districts = selectedCity?.districts ?? [];

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${apiBaseUrl}/api/locations`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Konum verileri alınamadı.");
        }

        const data = (await response.json()) as CityDto[];

        if (!active) {
          return;
        }

        setCities(data);
      } catch {
        if (!active) {
          return;
        }

        setError("İl ve ilçe bilgileri yüklenemedi.");
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
  }, []);

  useEffect(() => {
    if (!city || cities.length === 0) {
      return;
    }

    const cityExists = cities.some((candidate) => candidate.slug === city);

    if (!cityExists) {
      setCity("");
      setDistrict("");
    }
  }, [cities, city]);

  useEffect(() => {
    if (!district || !selectedCity) {
      return;
    }

    const districtExists = selectedCity.districts.some(
      (candidate) => candidate.slug === district,
    );

    if (!districtExists) {
      setDistrict("");
    }
  }, [district, selectedCity]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (!city || !district) {
          return;
        }

        onSearch?.({
          city,
          district,
        });
      }}
      className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="min-w-0">
        <label
          htmlFor="il-sec"
          className="mb-1.5 block text-sm font-medium"
        >
          İl
        </label>

        <Select
          value={city}
          onValueChange={(value: string) => {
            setCity(value);
            setDistrict("");
          }}
          disabled={loading}
        >
          <SelectTrigger
            id="il-sec"
            className="w-full"
          >
            <SelectValue
              placeholder={loading ? "İller yükleniyor..." : "İl Seç"}
            />
          </SelectTrigger>

          <SelectContent>
            {cities.map((candidate) => (
              <SelectItem
                key={candidate.id}
                value={candidate.slug}
              >
                {candidate.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0">
        <label
          htmlFor="ilce-sec"
          className="mb-1.5 block text-sm font-medium"
        >
          İlçe
        </label>

        <Select
          value={district}
          onValueChange={(value: string) => {
            setDistrict(value);
          }}
          disabled={loading || !selectedCity}
        >
          <SelectTrigger
            id="ilce-sec"
            className="w-full"
          >
            <SelectValue placeholder="İlçe Seç" />
          </SelectTrigger>

          <SelectContent>
            {districts.map((districtItem) => (
              <SelectItem
                key={districtItem.id}
                value={districtItem.slug}
              >
                {districtItem.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={loading || !city || !district}
      >
        <MapPin
          className="size-4"
          aria-hidden="true"
        />
        Hizmetleri Göster
      </Button>

      {error && (
        <p className="text-sm text-red-600 sm:col-span-3">
          {error}
        </p>
      )}
    </form>
  );
}
'@ | Set-Content -Encoding UTF8 "$root\src\components\site\LocationSearch.tsx"

Write-Host ""
Write-Host "Ana sayfa konum alani artik /api/locations endpointinden besleniyor." -ForegroundColor Green
Write-Host ""
Write-Host "Kalan locations.ts kullanimlari:" -ForegroundColor Yellow

$matches = Get-ChildItem "$root\src" -Recurse -Include *.ts,*.tsx |
    Select-String -Pattern '@/data/locations'

if ($matches) {
    $matches | ForEach-Object {
        Write-Host "$($_.Path):$($_.LineNumber) $($_.Line.Trim())"
    }
} else {
    Write-Host "Kalan kullanim yok. src\data\locations.ts artik silinebilir." -ForegroundColor Green
}

Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Cyan
