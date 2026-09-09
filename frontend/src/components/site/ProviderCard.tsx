import Link from "next/link";
import { MapPin, Phone, MessageCircle } from "lucide-react";

import type { ProviderSummary } from "@/lib/providers";
import { phoneHref, whatsappHref } from "@/lib/providers";

export function ProviderCard({
  provider,
}: {
  provider: ProviderSummary;
}) {
  const phone = phoneHref(provider.publicPhone);
  const whatsapp = whatsappHref(provider.publicWhatsapp);

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift">
      <div className="flex flex-col gap-4">
        <div>
          <Link
            href={`/isletme/${provider.slug}`}
            className="font-display text-xl font-semibold tracking-tight hover:text-primary"
          >
            {provider.businessName}
          </Link>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {provider.shortDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            {provider.citySlug} / {provider.districtSlug}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/isletme/${provider.slug}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Profili Gör
          </Link>

          {phone && (
            <a
              href={phone}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Phone className="size-4" aria-hidden="true" />
              Ara
            </a>
          )}

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
