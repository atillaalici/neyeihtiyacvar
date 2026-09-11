"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";

import { apiBaseUrl } from "@/lib/api";

type Props = {
  providerId: string;
  businessName: string;
};

export function ProviderCardImage({
  providerId,
  businessName,
}: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative h-24 w-full overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-cream to-background">
      {!failed ? (
        <img
          src={`${apiBaseUrl}/api/providers/${providerId}/image`}
          alt={`${businessName} işletme görseli`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-background shadow-soft">
            <Building2 className="size-6 text-primary" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}