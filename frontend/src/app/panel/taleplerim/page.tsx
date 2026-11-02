"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MyNeedsWorkspace } from "@/components/needs/MyNeedsWorkspace";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { clearAuth, getAccessToken } from "@/lib/auth";

type BusinessProfile = {
  slug: string;
  businessName: string;
};

export default function BusinessMyNeedsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const token = getAccessToken();
      if (!token) {
        router.replace("/giris");
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/provider-panel/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          clearAuth();
          router.replace("/giris");
          return;
        }

        if (!response.ok) {
          throw new Error("İşletme bilgileri alınamadı.");
        }

        const data = (await response.json()) as BusinessProfile;
        if (active) setProfile(data);
      } catch {
        if (active) setError("İşletme bilgileri yüklenemedi.");
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <SiteLayout hideFooter>
        <div className="section-shell py-12 text-red-600">{error}</div>
      </SiteLayout>
    );
  }

  if (!profile) {
    return (
      <SiteLayout hideFooter>
        <div className="section-shell py-12">Yükleniyor...</div>
      </SiteLayout>
    );
  }

  return <MyNeedsWorkspace businessProfile={profile} />;
}
