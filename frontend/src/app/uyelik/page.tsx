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

function regularAnnualPrice(planCode: string) {
  const prices: Record<string, number> = {
    kobi: 2400,
    avantaj: 5000,
    profesyonel: 12000,
  };

  return prices[planCode] ?? null;
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
              Ödediğiniz tutar yıllık dijital üyelik ve dijital vitrin hizmetiniz içindir.
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
                    "relative flex min-h-full min-w-0 flex-col overflow-hidden rounded-[18px] border bg-card p-2.5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-[22px] sm:p-4 xl:rounded-[24px] xl:p-5",
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

                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className={[
                        "grid size-11 shrink-0 place-items-center rounded-xl sm:size-14 sm:rounded-2xl",
                        plan.isRecommended
                          ? "bg-orange-100 text-orange-600"
                          : isProfessional
                            ? "bg-violet-100 text-violet-700"
                            : "bg-sky-100 text-sky-700",
                      ].join(" ")}
                    >
                      {plan.isRecommended ? (
                        <Crown className="size-5 sm:size-7" />
                      ) : isProfessional ? (
                        <Sparkles className="size-5 sm:size-7" />
                      ) : (
                        <Building2 className="size-5 sm:size-7" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <h2 className="pr-14 font-display text-base font-extrabold leading-tight sm:text-xl">
                        {plan.name}
                      </h2>

                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground sm:min-h-10 sm:text-xs sm:leading-5">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  <div
                    className={[
                      "mt-2.5 rounded-xl border p-2.5 sm:rounded-2xl sm:p-3",
                      plan.isRecommended
                        ? "border-orange-200 bg-orange-50/60"
                        : isProfessional
                          ? "border-violet-200 bg-violet-50/60"
                          : "border-sky-200 bg-sky-50/60",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 sm:text-[11px]">
                        Birinci Yıla Özel
                      </span>

                      {regularAnnualPrice(plan.code) ? (
                        <span className="whitespace-nowrap text-base font-extrabold text-slate-600 line-through decoration-2 sm:text-lg">
                          {money(regularAnnualPrice(plan.code)!)} TL
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex items-end gap-1.5">
                      <span
                        className={[
                          "text-2xl font-black tracking-tight sm:text-3xl",
                          plan.isRecommended
                            ? "text-orange-600"
                            : isProfessional
                              ? "text-violet-700"
                              : "text-sky-700",
                        ].join(" ")}
                      >
                        {money(plan.annualPrice)} TL
                      </span>
                      <span className="pb-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
                        KDV dahil / yıl
                      </span>
                    </div>

                    <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground sm:text-xs">
                      Aylık yaklaşık{" "}
                      <strong className="text-foreground">
                        {money(plan.monthlyEquivalent)} TL
                      </strong>
                    </p>
                  </div>

                  <div className="mt-2 rounded-xl bg-muted/50 p-2 sm:mt-2.5 sm:p-2.5">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Hizmet kapasitesi
                    </div>
                    <div className="mt-0.5 text-lg font-bold sm:text-xl">
                      {plan.serviceLimit} hizmet
                    </div>
                    <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground sm:text-xs">
                      Tüm hizmet haklarını ilk gün kullanmak zorunda değilsiniz.
                    </p>
                  </div>

                  <div className="mt-2 flex-1 space-y-1 sm:mt-2.5 sm:space-y-1">
                    {featureRows.map((feature) => {
                      const enabled = feature.enabled(plan);

                      return (
                        <div
                          key={feature.label}
                          className={[
                            "flex min-w-0 items-center gap-1.5 text-[10px] sm:gap-2 sm:text-xs",
                            enabled ? "text-foreground" : "text-muted-foreground/55",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "grid size-5 shrink-0 place-items-center rounded-full",
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
                      "mt-2.5 inline-flex h-10 items-center justify-center rounded-xl px-2 text-[10px] font-bold transition sm:mt-3 sm:h-11 sm:px-4 sm:text-sm",
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