"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProviderProfileView, {
  type Provider as PublicProvider,
  type GalleryPhoto,
} from "@/components/provider/ProviderProfileView";
import { BusinessSidebar } from "@/components/panel/BusinessSidebar";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken, getStoredUser } from "@/lib/auth";

type Provider = PublicProvider & {
  version?: number;
};

export default function PanelProfilePage() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const token = getAccessToken();
      const user = getStoredUser();

      if (!token || !user) {
        router.replace("/giris?returnUrl=/panel/profil");
        return;
      }

      if (user.role !== "provider" && user.role !== "admin") {
        router.replace("/hesabim");
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/provider-panel/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("İşletme bilgileri yüklenemedi.");
        }

        const data = (await response.json()) as Provider;

        const [publicResponse, galleryResponse] = await Promise.all([
          fetch(
            `${apiBaseUrl}/api/providers/${encodeURIComponent(data.slug)}`,
            { cache: "no-store" }
          ),
          fetch(
            `${apiBaseUrl}/api/providers/${encodeURIComponent(data.id)}/images`,
            { cache: "no-store" }
          ),
        ]);

        const publicData = publicResponse.ok
          ? (await publicResponse.json()) as PublicProvider
          : null;

        const photos = galleryResponse.ok
          ? (await galleryResponse.json()) as GalleryPhoto[]
          : [];

        if (active) {
          setProvider({
            ...(publicData ?? {}),
            ...data,
            description: publicData?.description ?? data.description,
            shortDescription: publicData?.shortDescription,
          });
          setGallery(Array.isArray(photos) ? photos : []);
        }
      } catch {
        if (active) setError("İşletme bilgileri yüklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [router]);

  return (
    <SiteLayout hideFooter>
      <div className="min-h-screen bg-background lg:flex">
        {provider && (
          <BusinessSidebar
            providerSlug={provider.slug}
            businessName={provider.businessName}
          />
        )}

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <header>
              <p className="text-sm font-semibold text-muted-foreground">
                İşletme Yönetimi
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Dijital Vitrinim
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                İşletmenizin müşterilere görünen dijital vitrini.
              </p>
            </header>

            {loading ? (
              <p>Vitrin yükleniyor...</p>
            ) : error ? (
              <p role="alert" className="text-red-600">{error}</p>
            ) : provider ? (
              <ProviderProfileView
                providerOverride={provider}
                galleryOverride={gallery}
                embedded
                allowLocationEdit
                onLocationSaved={(latitude, longitude) => {
                  setProvider((current) =>
                    current ? { ...current, latitude, longitude } : current
                  );
                }}
              />
            ) : null}
          </div>
        </main>
      </div>
    </SiteLayout>
  );
}
