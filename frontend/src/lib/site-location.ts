import { apiBaseUrl } from "@/lib/api";

export const LOCATION_PREFERENCE_KEY = "niv_location_preference";
export const CURRENT_LOCATION_KEY = "niv_current_location";
export const SITE_LOCATION_KEY = "niv_site_location";
export const SITE_LOCATION_EVENT = "niv:site-location";

export type SiteLocation = {
  citySlug: string;
  districtSlug: string;
  cityName?: string | null;
  districtName?: string | null;
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  updatedAt: number;
};

type StoredCoordinates = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  updatedAt?: number;
};

type ResolvedLocation = {
  found: boolean;
  citySlug: string | null;
  cityName: string | null;
  districtSlug: string | null;
  districtName: string | null;
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function getStoredSiteLocation(): SiteLocation | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(SITE_LOCATION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SiteLocation>;

    if (
      typeof parsed.citySlug !== "string" ||
      !parsed.citySlug ||
      typeof parsed.districtSlug !== "string" ||
      !parsed.districtSlug
    ) {
      return null;
    }

    return {
      citySlug: parsed.citySlug,
      districtSlug: parsed.districtSlug,
      cityName: parsed.cityName ?? null,
      districtName: parsed.districtName ?? null,
      latitude:
        typeof parsed.latitude === "number" ? parsed.latitude : undefined,
      longitude:
        typeof parsed.longitude === "number" ? parsed.longitude : undefined,
      accuracy:
        typeof parsed.accuracy === "number" ? parsed.accuracy : undefined,
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveSiteLocation(location: SiteLocation) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      SITE_LOCATION_KEY,
      JSON.stringify(location),
    );

    window.dispatchEvent(
      new CustomEvent<SiteLocation>(SITE_LOCATION_EVENT, {
        detail: location,
      }),
    );
  } catch {}
}

export function saveCurrentCoordinates(
  latitude: number,
  longitude: number,
  accuracy?: number | null,
) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      CURRENT_LOCATION_KEY,
      JSON.stringify({
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        updatedAt: Date.now(),
      }),
    );
  } catch {}
}

export function getStoredCoordinates(): StoredCoordinates | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(CURRENT_LOCATION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredCoordinates;

    if (
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function resolveCoordinates(
  latitude: number,
  longitude: number,
): Promise<SiteLocation | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  const response = await fetch(
    `${apiBaseUrl}/api/recommendations/location?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as ResolvedLocation;

  if (!data.found || !data.citySlug || !data.districtSlug) {
    return null;
  }

  return {
    citySlug: data.citySlug,
    districtSlug: data.districtSlug,
    cityName: data.cityName,
    districtName: data.districtName,
    latitude,
    longitude,
    updatedAt: Date.now(),
  };
}

export async function resolveAndSaveCoordinates(
  latitude: number,
  longitude: number,
  accuracy?: number | null,
): Promise<SiteLocation | null> {
  saveCurrentCoordinates(latitude, longitude, accuracy);

  const resolved = await resolveCoordinates(latitude, longitude);
  if (!resolved) return null;

  const location: SiteLocation = {
    ...resolved,
    accuracy: accuracy ?? null,
  };

  saveSiteLocation(location);
  return location;
}

export function saveManualSiteLocation(
  citySlug: string,
  districtSlug: string,
  cityName?: string | null,
  districtName?: string | null,
) {
  if (!citySlug || !districtSlug) return;

  saveSiteLocation({
    citySlug,
    districtSlug,
    cityName: cityName ?? null,
    districtName: districtName ?? null,
    updatedAt: Date.now(),
  });
}
