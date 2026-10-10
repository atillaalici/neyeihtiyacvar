"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type Counts = {
  contactRequests: number;
  providerApplications: number;
  total: number;
};

type Props = {
  type: keyof Counts;
};

let cachedCounts: Counts | null = null;
let lastFetch = 0;
let inFlight: Promise<Counts | null> | null = null;

async function fetchCounts(): Promise<Counts | null> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/notification-counts`,
        { cache: "no-store" },
      );

      if (!response.ok) return null;

      const counts = (await response.json()) as Counts;
      cachedCounts = counts;
      lastFetch = Date.now();
      window.dispatchEvent(new Event("admin-counts-updated"));
      return counts;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function AdminNotificationBadge({ type }: Props) {
  const [counts, setCounts] = useState<Counts | null>(cachedCounts);

  useEffect(() => {
    let active = true;

    function sync() {
      if (active) setCounts(cachedCounts);
    }

    async function refresh(force = false) {
      if (!force && Date.now() - lastFetch < 5000 && cachedCounts) {
        sync();
        return;
      }

      await fetchCounts();
      sync();
    }

    function onRefresh() {
      void refresh(true);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    window.addEventListener("admin-counts-updated", sync);
    window.addEventListener("admin-counts-refresh", onRefresh);
    document.addEventListener("visibilitychange", onVisibilityChange);

    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("admin-counts-updated", sync);
      window.removeEventListener("admin-counts-refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const count = counts?.[type] ?? 0;

  if (count <= 0) return null;

  return (
    <span
      className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white"
      aria-label={`${count} bekleyen işlem`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
