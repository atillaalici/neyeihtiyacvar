"use client";

import { useEffect, useState } from "react";

import {
  LOCATION_PREFERENCE_KEY,
  resolveAndSaveCoordinates,
} from "@/lib/site-location";

export function LocationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (!localStorage.getItem(LOCATION_PREFERENCE_KEY)) {
          setShow(true);
        }
      } catch {}
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function later() {
    try {
      localStorage.setItem(LOCATION_PREFERENCE_KEY, "later");
    } catch {}

    setShow(false);
  }

  function allow() {
    if (!navigator.geolocation) {
      try {
        localStorage.setItem(LOCATION_PREFERENCE_KEY, "unsupported");
      } catch {}

      setShow(false);
      return;
    }

    setBusy(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const resolved = await resolveAndSaveCoordinates(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy,
          );

          localStorage.setItem(
            LOCATION_PREFERENCE_KEY,
            resolved ? "allowed" : "allowed-unresolved",
          );
        } catch {
          try {
            localStorage.setItem(
              LOCATION_PREFERENCE_KEY,
              "allowed-unresolved",
            );
          } catch {}
        } finally {
          setBusy(false);
          setShow(false);
        }
      },
      () => {
        try {
          localStorage.setItem(LOCATION_PREFERENCE_KEY, "denied");
        } catch {}

        setBusy(false);
        setShow(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:left-auto sm:right-5 sm:mx-0">
      <div className="text-lg font-bold">
        📍 Yakınındaki hizmetleri bulalım
      </div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Konum izni verirsen il ve ilçeni otomatik belirleyip hizmet
        aramalarında kullanabiliriz. İstersen daha sonra il ve ilçeyi
        değiştirebilirsin. Konumun bu izinle kalıcı olarak veritabanına
        kaydedilmez.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={later}
          disabled={busy}
          className="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Şimdi Değil
        </button>

        <button
          type="button"
          onClick={allow}
          disabled={busy}
          className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? "Konum alınıyor..." : "Konumumu Kullan"}
        </button>
      </div>
    </div>
  );
}
