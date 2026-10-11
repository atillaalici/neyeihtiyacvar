"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { getAccessToken, getStoredUser } from "@/lib/auth";

type CampaignAvailability = {
  available: boolean;
  remaining: number;
};

const storageKey = "neyeihtiyacvar.first500.popup.dismissed";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export function First500CampaignPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function checkCampaign() {
      try {
        if (localStorage.getItem(storageKey) === todayKey()) return;

        const token = getAccessToken();
        const user = token ? getStoredUser() : null;

        if (user?.role === "provider" || user?.role === "admin") return;

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

        const response = await fetch(
          `${apiBaseUrl}/api/promotions/first500/availability`,
          { cache: "no-store" },
        );

        if (!response.ok) return;

        const campaign = (await response.json()) as CampaignAvailability;

        if (!campaign.available || campaign.remaining <= 0) return;

        timer = setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 2000);
      } catch {
        // Kampanya bilgisi alınamazsa pencere açılmaz.
      }
    }

    void checkCampaign();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  function closePopup() {
    localStorage.setItem(storageKey, todayKey());
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePopup();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="İlk 500 işletmeye ücretsiz üyelik kampanyası"
        className="relative w-fit max-w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={closePopup}
          aria-label="Kampanya penceresini kapat"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg hover:bg-slate-100"
        >
          <X className="h-6 w-6" />
        </button>

        <Link
          href="/kayit?hesap=isletme&paket=kobi"
          onClick={closePopup}
          aria-label="Ücretsiz KOBİ üyeliği için hemen kayıt ol"
          className="block"
        >
          <picture>
            <source
              media="(max-width: 639px)"
              srcSet="/kampanya/kampanya-ilk500-mobil-v2.webp"
            />
            <img
              src="/kampanya/kampanya-ilk500-masaustu-v2.webp"
              alt="1. yıla özel ilk 500 işletmeye ücretsiz KOBİ üyeliği."
              className="block h-auto max-h-[90dvh] max-w-full object-contain"
            />
          </picture>
        </Link>
      </div>
    </div>
  );
}
