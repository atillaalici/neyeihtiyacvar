"use client";

import Link from "next/link";
import { Building2, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type ProviderMe = {
  id: string;
  businessName: string;
};

type Props = {
  compact?: boolean;
};

export function EditableProviderImage({
  compact = false,
}: Props) {
  const [provider, setProvider] = useState<ProviderMe | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const token = getAccessToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/provider-panel/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as ProviderMe;

        if (active) {
          setProvider(data);
          setImageFailed(false);
        }
      } catch {
        // İşletme hesabı değilse alan gösterilmez.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const imageUrl = useMemo(() => {
    if (!provider) {
      return "";
    }

    return `${apiBaseUrl}/api/providers/${provider.id}/image`;
  }, [provider]);

  if (loading || !provider) {
    return null;
  }

  return (
    <section
      className={
        compact
          ? "w-[300px] overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
          : "w-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
      }
    >
      <div
        className={
          compact
            ? "relative h-[108px] w-full bg-muted"
            : "relative h-[150px] w-full bg-muted sm:h-[165px]"
        }
      >
        {!imageFailed ? (
          <img
            src={imageUrl}
            alt={`${provider.businessName} işletme görseli`}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Building2 className="size-5" aria-hidden="true" />
            Henüz işletme görseli yüklenmemiş
          </div>
        )}

        <Link
          href="/hesabim#isletme-fotograflari"
          title="İşletme görselini değiştir"
          aria-label="İşletme görselini değiştir"
          className="absolute right-2.5 top-2.5 inline-flex size-9 items-center justify-center rounded-full border border-white/70 bg-white/95 text-primary shadow-md transition hover:scale-105 hover:bg-white"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {provider.businessName}
          </div>
          {!compact ? (
            <div className="text-xs text-muted-foreground">
              İşletme görseli
            </div>
          ) : null}
        </div>

        <Link
          href="/hesabim#isletme-fotograflari"
          className="shrink-0 text-xs font-semibold text-primary hover:underline"
        >
          Değiştir
        </Link>
      </div>
    </section>
  );
}