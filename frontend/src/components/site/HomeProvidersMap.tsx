"use client";

import dynamic from "next/dynamic";

const HomeProvidersMapClient = dynamic(
  () => import("./HomeProvidersMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-10">
        <div className="mb-4">
          <h3 className="text-xl font-bold sm:text-2xl">
            Haritadaki işletmeler
          </h3>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Yayındaki ve harita konumu kayıtlı işletmeleri harita üzerinde
            inceleyebilirsin.
          </p>
        </div>

        <div className="grid h-[430px] place-items-center rounded-3xl border border-border bg-muted/30 text-sm text-muted-foreground shadow-sm sm:h-[520px]">
          Harita yükleniyor...
        </div>
      </div>
    ),
  },
);

export function HomeProvidersMap() {
  return <HomeProvidersMapClient />;
}