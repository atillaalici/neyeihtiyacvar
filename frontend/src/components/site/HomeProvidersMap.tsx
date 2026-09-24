"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { getAccessToken } from "@/lib/auth";

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
  const router = useRouter();
  const isAuthenticated = Boolean(getAccessToken());

  if (!isAuthenticated) {
    return (
      <div className="mt-10">
        <div className="mb-4">
          <h3 className="text-xl font-bold sm:text-2xl">
            Haritadaki işletmeler
          </h3>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            İşletmelerin harita konumlarını görmek için giriş yapmalısın.
          </p>
        </div>

        <div className="grid min-h-[220px] place-items-center rounded-3xl border border-border bg-muted/30 p-6 text-center shadow-sm">
          <div>
            <p className="font-semibold">
              Harita üyelerimize açıktır.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/giris?returnUrl=${encodeURIComponent("/")}`,
                )
              }
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Haritayı Görmek İçin Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <HomeProvidersMapClient />;
}