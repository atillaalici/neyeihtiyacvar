"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type ProviderMe = {
  slug?: string | null;
};

export default function MyBusinessPublicProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function redirect() {
      const token = getAccessToken();

      if (!token) {
        router.replace("/hesabim");
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/provider-panel/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/hesabim");
          return;
        }

        const data = (await response.json()) as ProviderMe;

        if (!active) {
          return;
        }

        if (data.slug) {
          router.replace(`/isletme/${encodeURIComponent(data.slug)}`);
          return;
        }

        router.replace("/hesabim");
      } catch {
        router.replace("/hesabim");
      }
    }

    void redirect();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-[45vh] items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
        <p className="mt-4 text-sm text-muted-foreground">
          İşletme profiliniz açılıyor...
        </p>
      </div>
    </main>
  );
}