"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api";

export function LivePlatformStats({ type }: { type: "users" | "providers" }) {
  const [stats, setStats] = useState<{ users: number; providers: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/api/public/stats`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("İstatistik alınamadı");
        return response.json();
      })
      .then((data) => setStats(data))
      .catch(() => {});

    return () => controller.abort();
  }, []);

  return <>{stats ? stats[type].toLocaleString("tr-TR") : "—"}</>;
}
