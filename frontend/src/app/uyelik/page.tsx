"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  Crown,
  ImageIcon,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";

type MembershipPlan = {
  id: string;
  code: string;
  name: string;
  description: string;
  annualPrice: number;
  monthlyEquivalent: number;
  serviceLimit: number;
  isRecommended: boolean;
  features: {
    mapVisibility: boolean;
    photoEnabled: boolean;
    videoEnabled: boolean;
    featuredBadgeEnabled: boolean;
    searchPriorityEnabled: boolean;
    advancedStatisticsEnabled: boolean;
    catalogCampaignEnabled: boolean;
    prioritySupportEnabled: boolean;
  };
};

type FeatureRow = {
  label: string;
  icon: React.ReactNode;
  enabled: (plan: MembershipPlan) => boolean;
};

const featureRows: FeatureRow[] = [
  {
    label: "Haritada görünme",
    icon: <MapPin className="size-4" />,
    enabled: (plan) => plan.features.mapVisibility,
  },
  {
    label: "Fotoğraf ekleme",
    icon: <ImageIcon className="size-4" />,
    enabled: (plan) => plan.features.photoEnabled,
  },
  {
    label: "Video ekleme",
    icon: <Video className="size-4" />,
    enabled: (plan) => plan.features.videoEnabled,
  },
  {
    label: "Öne çıkan işletme rozeti",
    icon: <BadgeCheck className="size-4" />,
    enabled: (plan) => plan.features.featuredBadgeEnabled,
  },
  {
    label: "Arama ve kategori önceliği",
    icon: <Zap className="size-4" />,
    enabled: (plan) => plan.features.searchPriorityEnabled,
  },
  {
    label: "Gelişmiş istatistikler",
    icon: <BarChart3 className="size-4" />,
    enabled: (plan) => plan.features.advancedStatisticsEnabled,
  },
  {
    label: "Katalog ve kampanya alanı",
    icon: <Megaphone className="size-4" />,
    enabled: (plan) => plan.features.catalogCampaignEnabled,
  },
  {
    label: "Öncelikli destek",
    icon: <ShieldCheck className="size-4" />,
    enabled: (plan) => plan.features.prioritySupportEnabled,
  },
];

function money(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fallbackPlans(): MembershipPlan[] {
  return [
    {
      id: "kobi",
      code: "kobi",
      name: "1+1 Paket",
      description: "1 ana hizmet + 1 ek hizmet ile işletmenizi görünür hale getirin.",
      annualPrice: 1200,
      monthlyEquivalent: 100,
      serviceLimit: 2,
      isRecommended: false,
      features: {
        mapVisibility: true,
        photoEnabled: true,
        videoEnabled: false,
        featuredBadgeEnabled: false,
        searchPriorityEnabled: false,
        advancedStatisticsEnabled: false,
        catalogCampaignEnabled: false,
        prioritySupportEnabled: false,
      },
    },
    {
      id: "avantaj",
      code: "avantaj",
      name: "1+4 Paket",
      description: "1 ana hizmet + 4 ek hizmet ile daha fazla aramada müşterilere ulaşın.",
      annualPrice: 2400,
      monthlyEquivalent: 200,
      serviceLimit: 5,
      isRecommended: true,
      features: {
        mapVisibility: true,
        photoEnabled: true,
        videoEnabled: true,
        featuredBadgeEnabled: true,
        searchPriorityEnabled: true,
        advancedStatisticsEnabled: false,
        catalogCampaignEnabled: false,
        prioritySupportEnabled: true,
      },
    },
    {
      id: "profesyonel",
      code: "profesyonel",
      name: "12 Kategorili Paket",
      description: "12 hizmet/kategori hakkı ile geniş hizmet ağı bulunan işletmeler için.",
      annualPrice: 5000,
      monthlyEquivalent: 416.67,
      serviceLimit: 12,
      isRecommended: false,
      features: {
        mapVisibility: true,
        photoEnabled: true,
        videoEnabled: true,
        featuredBadgeEnabled: true,
        searchPriorityEnabled: true,
        advancedStatisticsEnabled: true,
        catalogCampaignEnabled: true,
        prioritySupportEnabled: true,
      },
    },
  ];
}

export default function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>(fallbackPlans());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/membership-plans`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as MembershipPlan[];

        if (active && data.length > 0) {
          setPlans(data);
        }
      } catch {
        // API kapalı olsa bile tasarım fallback paketlerle görüntülenir.
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

  const orderedPlans = useMemo(
    () => [...plans].sort((a, b) => a.annualPrice - b.annualPrice),
    [plans],
  );

  return (
    <SiteLayout>
      <main className="relative overflow-hidden bg-background">
        <div className="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-80 size-96 rounded-full bg-sky-500/8 blur-3xl" />

        <section className="section-shell relative py-10 sm:py-12 lg:py-16">
          <div className="mx-auto max-w-3xl text-center px-1">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
              <Sparkles className="size-4" />
              İşletmenize uygun üyelik
            </div>

            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl xl:text-5xl">
              Yıllık üyeliğini seç.
              <span className="block text-orange-500">İşine odaklan.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7 xl:text-lg">
              Teklif başına ücret yok. Komisyon yok. Sürpriz maliyet yok.
              İhtiyacınıza uygun paketi seçin, hizmet haklarınızı üyelik süreniz
              boyunca istediğiniz zaman kullanın.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-2.5 md:grid-cols-3 md:items-stretch md:gap-4 xl:mt-12 xl:gap-6">
            {orderedPlans.map((plan) => {
              const isProfessional = plan.code === "profesyonel";
              const isKobi = plan.code === "kobi";

              return (
                <article
                  key={plan.id}
                  className={[
                    "relative flex min-h-full min-w-0 flex-col overflow-hidden rounded-[18px] border bg-card p-2.5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-[24px] sm:p-5 xl:rounded-[28px] xl:p-7",
                    isProfessional ? "col-span-2 w-[calc(50%-0.3125rem)] justify-self-center md:col-span-1 md:w-auto md:justify-self-stretch" : "",
                    plan.isRecommended
                      ? "border-orange-400 ring-2 ring-orange-200/70"
                      : "border-border",
                  ].join(" ")}
                >
                  {plan.isRecommended ? (
                    <div className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm sm:right-5 sm:top-5 sm:px-3 sm:py-1 sm:text-xs">
                      ÖNERİLEN
                    </div>
                  ) : null}

                  <div
                    className={[
                      "grid size-9 place-items-center rounded-xl sm:size-12 sm:rounded-2xl",
                      plan.isRecommended
                        ? "bg-orange-100 text-orange-600"
                        : isProfessional
                          ? "bg-violet-100 text-violet-700"
                          : "bg-sky-100 text-sky-700",
                    ].join(" ")}
                  >
                    {plan.isRecommended ? (
                      <Crown className="size-4 sm:size-6" />
                    ) : isProfessional ? (
                      <Sparkles className="size-4 sm:size-6" />
                    ) : (
                      <Building2 className="size-4 sm:size-6" />
                    )}
                  </div>

                  <div className="mt-3">
                    <h2 className="font-display text-base font-bold sm:text-xl xl:text-2xl">{plan.name}</h2>
                    <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground sm:mt-2 sm:min-h-16 sm:text-sm sm:leading-6">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-3 border-y border-border/70 py-2.5">
                    <div className="flex items-end gap-2">
                      <span className="text-xl font-black tracking-tight sm:text-3xl xl:text-4xl">
                        {money(plan.annualPrice)} TL
                      </span>
                      <span className="pb-0.5 text-[10px] text-muted-foreground sm:pb-1 sm:text-sm">/ yıl</span>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground sm:mt-2 sm:text-sm">
                      Aylık karşılığı yaklaşık{" "}
                      <strong className="text-foreground">
                        {money(plan.monthlyEquivalent)} TL
                      </strong>
                    </p>
                  </div>

                  <div className="mt-3 rounded-xl bg-muted/50 p-2 sm:mt-4 sm:rounded-2xl sm:p-3 xl:mt-5 xl:p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Hizmet kapasitesi
                    </div>
                    <div className="mt-1 text-lg font-bold sm:text-2xl">
                      {plan.serviceLimit} hizmet
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Tüm hizmet haklarını ilk gün kullanmak zorunda değilsiniz.
                    </p>
                  </div>

                  <div className="mt-3 flex-1 space-y-1.5 sm:mt-5 sm:space-y-2.5 xl:mt-6 xl:space-y-3">
                    {featureRows.map((feature) => {
                      const enabled = feature.enabled(plan);

                      return (
                        <div
                          key={feature.label}
                          className={[
                            "flex min-w-0 items-center gap-1.5 text-[10px] sm:gap-2.5 sm:text-sm",
                            enabled ? "text-foreground" : "text-muted-foreground/55",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "grid size-5 shrink-0 place-items-center rounded-full sm:size-6",
                              enabled
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-muted text-muted-foreground/50",
                            ].join(" ")}
                          >
                            {enabled ? <Check className="size-3 sm:size-4" /> : feature.icon}
                          </span>
                          <span className="min-w-0 leading-4 sm:leading-5">{feature.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <Link
                    href={`/kayit?hesap=isletme&paket=${encodeURIComponent(plan.code)}`}
                    className={[
                      "mt-4 inline-flex h-10 items-center justify-center rounded-xl px-2 text-[10px] font-bold transition sm:mt-7 sm:h-12 sm:px-5 sm:text-sm",
                      plan.isRecommended
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
                        : isKobi
                          ? "border border-emerald-300 bg-emerald-100 text-emerald-800 shadow-sm hover:bg-emerald-200"
                          : "bg-violet-600 text-white hover:bg-violet-700",
                    ].join(" ")}
                  >
                    Bu Paketi Seç
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl gap-3 rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:grid-cols-3 xl:mt-10 xl:p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-emerald-600" />
              <span className="text-sm font-semibold">Komisyon %0</span>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="size-5 text-orange-500" />
              <span className="text-sm font-semibold">Teklif başına ücret yok</span>
            </div>
            <div className="flex items-center gap-3">
              <BadgeCheck className="size-5 text-sky-600" />
              <span className="text-sm font-semibold">İstediğin zaman üst pakete geç</span>
            </div>
          </div>

          {loading ? (
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Güncel paket bilgileri kontrol ediliyor...
            </p>
          ) : null}
        </section>
      </main>
    </SiteLayout>
  );
}