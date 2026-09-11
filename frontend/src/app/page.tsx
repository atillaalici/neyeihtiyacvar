"use client";

import { useRouter } from "next/navigation";

import { ShowcaseSection } from "@/components/site/ShowcaseSection";
import { HeroSearch } from "@/components/site/HeroSearch";
import { HowItWorks } from "@/components/site/HowItWorks";
import { LocationSearch } from "@/components/site/LocationSearch";
import { ProviderCTA } from "@/components/site/ProviderCTA";
import { SiteLayout } from "@/components/site/SiteLayout";
import { TrustSection } from "@/components/site/TrustSection";

export default function HomePage() {
  const router = useRouter();

  return (
    <SiteLayout>
      <div className="home-page">
        <HeroSearch />

        <ShowcaseSection />

        <HowItWorks />

        <TrustSection />

        <section className="home-location section-shell py-6 sm:py-8 lg:py-10">
          <h2 className="max-w-2xl font-display text-3xl font-bold text-balance sm:text-4xl">
            Yakınında kim var?
          </h2>

          <p className="mt-3 text-muted-foreground">
            İl ve ilçeni seç, bölgendeki hizmet verenleri listeleyelim.
          </p>

          <div className="mt-8 max-w-3xl">
            <LocationSearch
              onSearch={({ city, district }) => {
                const params = new URLSearchParams({
                  il: city,
                  ilce: district,
                });

                router.push(`/kesfet?${params.toString()}`);
              }}
            />
          </div>
        </section>

        <ProviderCTA />
      </div>
    </SiteLayout>
  );
}