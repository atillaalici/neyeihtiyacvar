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
      name: "KOBİ",
      description: "Esnaf, usta ve küçük işletmeler için ideal başlangıç paketi.",
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
      name: "Avantaj",
      description: "Daha fazla hizmet alanında görünmek isteyen işletmeler için önerilen paket.",
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
      name: "Profesyonel",
      description: "Geniş hizmet ağı bulunan işletmeler ve ekipler için gelişmiş paket.",
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

          <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-3 md:items-stretch xl:mt-12 xl:gap-6">
            {orderedPlans.map((plan) => {
              const isProfessional = plan.code === "profesyonel";
              const isKobi = plan.code === "kobi";

              return (
                <article
                  key={plan.id}
                  className={[
                    "relative flex min-h-full min-w-0 flex-col overflow-hidden rounded-[24px] border bg-card p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-5 xl:rounded-[28px] xl:p-7",
                    plan.isRecommended
                      ? "border-orange-400 ring-2 ring-orange-200/70"
                      : "border-border",
                  ].join(" ")}
                >
                  {plan.isRecommended ? (
                    <div className="absolute right-5 top-5 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      ÖNERİLEN
                    </div>
                  ) : null}

                  <div
                    className={[
                      "grid size-12 place-items-center rounded-2xl",
                      plan.isRecommended
                        ? "bg-orange-100 text-orange-600"
                        : isProfessional
                          ? "bg-violet-100 text-violet-700"
                          : "bg-sky-100 text-sky-700",
                    ].join(" ")}
                  >
                    {plan.isRecommended ? (
                      <Crown className="size-6" />
                    ) : isProfessional ? (
                      <Sparkles className="size-6" />
                    ) : (
                      <Building2 className="size-6" />
                    )}
                  </div>

                  <div className="mt-3">
                    <h2 className="font-display text-xl font-bold xl:text-2xl">{plan.name}</h2>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground sm:min-h-16 sm:text-sm sm:leading-6">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-3 border-y border-border/70 py-2.5">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black tracking-tight xl:text-4xl">
                        {money(plan.annualPrice)} TL
                      </span>
                      <span className="pb-1 text-sm text-muted-foreground">/ yıl</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Aylık karşılığı yaklaşık{" "}
                      <strong className="text-foreground">
                        {money(plan.monthlyEquivalent)} TL
                      </strong>
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl bg-muted/50 p-3 xl:mt-5 xl:p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Hizmet kapasitesi
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {plan.serviceLimit} hizmet
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Tüm hizmet haklarını ilk gün kullanmak zorunda değilsiniz.
                    </p>
                  </div>

                  <div className="mt-5 flex-1 space-y-2.5 xl:mt-6 xl:space-y-3">
                    {featureRows.map((feature) => {
                      const enabled = feature.enabled(plan);

                      return (
                        <div
                          key={feature.label}
                          className={[
                            "flex min-w-0 items-center gap-2.5 text-xs sm:text-sm",
                            enabled ? "text-foreground" : "text-muted-foreground/55",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "grid size-6 shrink-0 place-items-center rounded-full",
                              enabled
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-muted text-muted-foreground/50",
                            ].join(" ")}
                          >
                            {enabled ? <Check className="size-4" /> : feature.icon}
                          </span>
                          <span className="min-w-0 leading-5">{feature.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <Link
                    href={`/kayit?hesap=isletme&paket=${encodeURIComponent(plan.code)}`}
                    className={[
                      "mt-7 inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-bold transition",
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