"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Building2, LocateFixed, Save } from "lucide-react";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const BusinessLocationMap = dynamic(
  () => import("@/components/location/BusinessLocationMap"),
  { ssr: false },
);

type District = { id: string; name: string; slug: string };
type City = { id: string; name: string; slug: string; districts: District[] };

type ProviderProfile = {
  id: string;
  businessName: string;
  categoryName?: string | null;
  serviceName?: string | null;
  categorySlug?: string | null;
  serviceSlug?: string | null;
  description?: string | null;
  publicPhone?: string | null;
  publicWhatsapp?: string | null;
  publicAddress?: string | null;
  citySlug?: string | null;
  districtSlug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  workingHours?: string | null;
  experienceYears?: number | null;
  emergencyService?: boolean;
  onsiteService?: boolean;
};

type MapLocation = {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  districtCandidates?: string[];
};

function normalizeLocationName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/\b(ili|ilcesi|ilçe|merkez ilce|merkez ilçesi)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  const a = normalizeLocationName(left);
  const b = normalizeLocationName(right);
  return a === b || a.includes(b) || b.includes(a);
}

async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=tr`,
      { headers: { Accept: "application/json" } },
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

export default function BusinessAccountManager() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [publicPhone, setPublicPhone] = useState("");
  const [publicWhatsapp, setPublicWhatsapp] = useState("");
  const [publicAddress, setPublicAddress] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const selectedCity = useMemo(
    () => cities.find((city) => city.slug === citySlug) ?? null,
    [cities, citySlug],
  );

  const selectedDistrict = useMemo(
    () =>
      selectedCity?.districts.find((district) => district.slug === districtSlug) ??
      null,
    [selectedCity, districtSlug],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [providerResponse, locationsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/provider-panel/me`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/locations`, { cache: "no-store" }),
        ]);

        if (!providerResponse.ok) {
          throw new Error("İşletme bilgileri alınamadı.");
        }

        const data = (await providerResponse.json()) as ProviderProfile;
        const locationData = locationsResponse.ok
          ? ((await locationsResponse.json()) as City[])
          : [];

        if (!active) return;

        setProfile(data);
        setCities(locationData);
        setBusinessName(data.businessName ?? "");
        setDescription(data.description ?? "");
        setPublicPhone(data.publicPhone ?? "");
        setPublicWhatsapp(data.publicWhatsapp ?? "");
        setPublicAddress(data.publicAddress ?? "");
        setCitySlug(data.citySlug ?? "");
        setDistrictSlug(data.districtSlug ?? "");
        setLatitude(data.latitude ?? null);
        setLongitude(data.longitude ?? null);
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error ? e.message : "İşletme bilgileri yüklenemedi.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function applyAdministrativeArea(
    city?: string,
    district?: string,
    districtCandidates: string[] = [],
  ) {
    if (!city && !district && districtCandidates.length === 0) return;

    const matchedCity =
      cities.find(
        (candidate) =>
          namesMatch(candidate.name, city) || namesMatch(candidate.slug, city),
      ) ??
      cities.find((candidate) =>
        [district, ...districtCandidates].some((value) =>
          candidate.districts.some(
            (item) =>
              namesMatch(item.name, value) || namesMatch(item.slug, value),
          ),
        ),
      );

    if (!matchedCity) return;

    setCitySlug(matchedCity.slug);

    const candidates = [district, ...districtCandidates].filter(
      (value): value is string => Boolean(value),
    );

    const matchedDistrict = matchedCity.districts.find((item) =>
      candidates.some(
        (value) =>
          namesMatch(item.name, value) || namesMatch(item.slug, value),
      ),
    );

    setDistrictSlug(matchedDistrict?.slug ?? "");
  }

  function applyMapLocation(value: MapLocation) {
    setLatitude(value.latitude);
    setLongitude(value.longitude);
    if (value.address) setPublicAddress(value.address);
    applyAdministrativeArea(
      value.city,
      value.district,
      value.districtCandidates ?? [],
    );
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }

    setLocating(true);
    setError("");
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;

        setLatitude(nextLatitude);
        setLongitude(nextLongitude);

        const location = await reverseGeocode(nextLatitude, nextLongitude);

        if (location?.address) setPublicAddress(location.address);
        applyAdministrativeArea(
          location?.city,
          location?.district,
          location?.districtCandidates ?? [],
        );

        setLocating(false);
        setMessage(
          "Konum alındı. İl, ilçe ve adresi kontrol edip Değişiklikleri Kaydet butonuna basın.",
        );
      },
      () => {
        setLocating(false);
        setError("Konum alınamadı. Tarayıcı konum iznini kontrol edin.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  async function saveLocation() {
    const token = getAccessToken();
    if (!token || !profile) {
      setError("Oturum bilgisi bulunamadı.");
      return;
    }

    if (!citySlug || !districtSlug) {
      setError("Lütfen il ve ilçe seçin.");
      return;
    }

    if (latitude === null || longitude === null) {
      setError("Lütfen haritadan işletme konumunu seçin.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/provider-panel/me/location`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          citySlug,
          districtSlug,
          publicAddress: publicAddress.trim() || null,
          latitude,
          longitude,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          String(data?.message ?? "Konum ve adres kaydedilemedi."),
        );
      }

      setProfile((old) =>
        old
          ? {
              ...old,
              citySlug: data?.citySlug ?? citySlug,
              districtSlug: data?.districtSlug ?? districtSlug,
              publicAddress: data?.publicAddress ?? (publicAddress.trim() || null),
              latitude: data?.latitude ?? latitude,
              longitude: data?.longitude ?? longitude,
            }
          : old,
      );

      setMessage(data?.message ?? "Konum ve adres kaydedildi.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Sunucuya bağlanılamadı.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function saveProvider() {
    const token = getAccessToken();
    if (!token || !profile) return;

    if (!citySlug || !districtSlug) {
      setError("Lütfen il ve ilçe seçin.");
      return;
    }

    if (latitude === null || longitude === null) {
      setError("Lütfen haritadan işletme konumunu seçin.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/provider-panel/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          description: description.trim() || null,
          publicPhone: publicPhone.trim() || null,
          publicWhatsapp: publicWhatsapp.trim() || null,
          publicAddress: publicAddress.trim() || null,
          citySlug,
          districtSlug,
          latitude,
          longitude,
          categorySlug: profile.categorySlug ?? null,
          serviceSlug: profile.serviceSlug ?? null,
          workingHours: profile.workingHours ?? null,
          experienceYears: profile.experienceYears ?? null,
          emergencyService: profile.emergencyService ?? false,
          onsiteService: profile.onsiteService ?? false,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const firstError =
          data?.errors &&
          Object.values(data.errors).flat().find((item) => Boolean(item));
        throw new Error(
          String(
            firstError ??
              data?.message ??
              "İşletme bilgileri kaydedilemedi.",
          ),
        );
      }

      setProfile((old) =>
        old
          ? {
              ...old,
              businessName: businessName.trim(),
              description: description.trim() || null,
              publicPhone: publicPhone.trim() || null,
              publicWhatsapp: publicWhatsapp.trim() || null,
              publicAddress: publicAddress.trim() || null,
              citySlug,
              districtSlug,
              latitude,
              longitude,
            }
          : old,
      );

      setEditingBusiness(false);
      setMessage(data?.message ?? "İşletme bilgileri ve konum kaydedildi.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Sunucuya bağlanılamadı.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-3">
      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section
        id="isletme-bilgileri"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-orange-50 text-orange-600">
              <Building2 className="size-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                İşletme Bilgileri
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                İşletmenizin müşterilere görünen temel bilgileri.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingBusiness((value) => !value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"
          >
            {editingBusiness ? "Vazgeç" : "Düzenle"}
          </button>
        </div>

        {!editingBusiness ? (
          <div className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-3">
            <Info label="İşletme Adı" value={profile.businessName || "-"} />
            <Info label="Telefon" value={profile.publicPhone || "-"} />
            <Info label="WhatsApp" value={profile.publicWhatsapp || "-"} />
            <Info
              label="Kategori"
              value={profile.categoryName || profile.categorySlug || "-"}
            />
            <Info
              label="Alt Hizmet"
              value={profile.serviceName || profile.serviceSlug || "-"}
            />
            <Info label="Açıklama" value={profile.description || "-"} />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field
              label="İşletme Adı"
              value={businessName}
              onChange={setBusinessName}
            />
            <Field
              label="Telefon"
              value={publicPhone}
              onChange={setPublicPhone}
            />
            <Field
              label="WhatsApp"
              value={publicWhatsapp}
              onChange={setPublicWhatsapp}
            />
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Açıklama
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>
          </div>
        )}
      </section>

      <section
        id="konum-adres"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Konum ve Adres</h2>
          <p className="mt-1 text-sm text-slate-500">
            İl ve ilçeyi elle seçebilir veya haritadan otomatik
            belirleyebilirsiniz.
          </p>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(440px,1.35fr)]">
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">İl</span>
                <select
                  value={citySlug}
                  onChange={(event) => {
                    setCitySlug(event.target.value);
                    setDistrictSlug("");
                  }}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">İl seçin</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  İlçe
                </span>
                <select
                  value={districtSlug}
                  onChange={(event) => setDistrictSlug(event.target.value)}
                  disabled={!selectedCity}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">İlçe seçin</option>
                  {(selectedCity?.districts ?? []).map((district) => (
                    <option key={district.id} value={district.slug}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Seçili konum:{" "}
              <strong className="text-slate-900">
                {selectedCity?.name ?? "-"} / {selectedDistrict?.name ?? "-"}
              </strong>
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Adres
              </span>
              <textarea
                value={publicAddress}
                onChange={(event) => setPublicAddress(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Mahalle, cadde, sokak, bina no..."
                className="min-h-[94px] resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              />
              <span className="text-right text-xs text-slate-400">
                {publicAddress.length}/500
              </span>
            </label>

            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60"
            >
              <LocateFixed className="size-4" />
              {locating
                ? "Konum alınıyor..."
                : latitude !== null && longitude !== null
                  ? "Mevcut Konumla Güncelle"
                  : "Mevcut Konumumu Kullan"}
            </button>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <InfoBox
                label="Enlem (Latitude)"
                value={latitude !== null ? latitude.toFixed(6) : "-"}
              />
              <InfoBox
                label="Boylam (Longitude)"
                value={longitude !== null ? longitude.toFixed(6) : "-"}
              />
            </div>
          </div>

          <div className="min-h-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <BusinessLocationMap
              latitude={latitude}
              longitude={longitude}
              onChange={applyMapLocation}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void saveLocation()}
            disabled={saving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
      />
    </label>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-600">{label}</p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700">
        {value}
      </div>
    </div>
  );
}

