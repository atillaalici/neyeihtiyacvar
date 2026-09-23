"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import { ProviderCardMedia } from "@/components/site/ProviderCardMedia";
import { getAccessToken } from "@/lib/auth";
import { trackPlatformAnalytics } from "@/lib/platform-analytics";
import {
  phoneHref,
  type ProviderSummary,
  whatsappHref,
} from "@/lib/providers";

export function ProviderCard({
  provider,
}: {
  provider: ProviderSummary;
}) {
  const router = useRouter();
  const phone = phoneHref(provider.publicPhone);
  const whatsapp = whatsappHref(provider.publicWhatsapp);

  function requireAuthForContact() {
    const returnUrl = `/isletme/${provider.slug}`;

    router.push(
      `/giris?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift">
      <ProviderCardMedia
        providerId={provider.id}
        providerSlug={provider.slug}
        businessName={provider.businessName}
        verified={provider.isVerifiedBusiness}
      />

      <div className="flex flex-1 flex-col p-4">
        <div>
          <Link
            href={`/isletme/${provider.slug}`}
            className="line-clamp-1 font-display text-lg font-semibold tracking-tight hover:text-primary"
          >
            {provider.businessName}
          </Link>

          {provider.isVerifiedBusiness && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                ✓ Doğrulanmış İşletme
              </span>
            </div>
          )}

          <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-muted-foreground">
            {provider.shortDescription}
          </p>
        </div>

        <div className="mt-3 min-h-[24px] text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="line-clamp-1">
              {provider.citySlug} / {provider.districtSlug}
            </span>
          </span>
        </div>

        <div className="mt-auto pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/isletme/${provider.slug}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 whitespace-nowrap"
            >
              Profili Gör
            </Link>

            {phone ? (
              getAccessToken() ? (
                <a
                  href={phone}
                  onClick={() =>
                    trackPlatformAnalytics({
                      eventType: "phone_click",
                      providerSlug: provider.slug,
                      source: "search_results",
                    })
                  }
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-3 text-sm font-semibold transition hover:bg-accent"
                >
                  <Phone
                    className="size-4"
                    aria-hidden="true"
                  />
                  Ara
                </a>
              ) : (
                <button
                  type="button"
                  onClick={requireAuthForContact}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-3 text-sm font-semibold transition hover:bg-accent"
                >
                  <Phone
                    className="size-4"
                    aria-hidden="true"
                  />
                  Giriş Yaparak Ara
                </button>
              )
            ) : (
              <div />
            )}
          </div>

          {whatsapp && (
            <div className="mt-2 flex justify-center">
              <div className="w-1/2 min-w-[120px]">
                {getAccessToken() ? (
                  <a
                    href={whatsapp}
                    onClick={() =>
                      trackPlatformAnalytics({
                        eventType: "whatsapp_click",
                        providerSlug: provider.slug,
                        source: "search_results",
                      })
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-3 text-sm font-semibold transition hover:border-green-300 hover:bg-green-50"
                  >
                    <MessageCircle
                      className="size-4"
                      aria-hidden="true"
                    />
                    WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={requireAuthForContact}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-3 text-sm font-semibold transition hover:border-green-300 hover:bg-green-50"
                  >
                    <MessageCircle
                      className="size-4"
                      aria-hidden="true"
                    />
                    Giriş Yaparak WhatsApp
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}