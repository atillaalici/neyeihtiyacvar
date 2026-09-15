import { apiBaseUrl } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

export type PlatformAnalyticsEventType =
  | "provider_view"
  | "phone_click"
  | "whatsapp_click"
  | "search_submit";

type PlatformAnalyticsPayload = {
  eventType: PlatformAnalyticsEventType;
  providerSlug?: string | null;
  searchTerm?: string | null;
  source?: string | null;
};

export function trackPlatformAnalytics(
  payload: PlatformAnalyticsPayload,
) {
  if (typeof window === "undefined") {
    return;
  }

  trackEvent(payload.eventType, {
    provider_slug: payload.providerSlug ?? undefined,
    search_term: payload.searchTerm ?? undefined,
    source: payload.source ?? undefined,
  });

  void fetch(`${apiBaseUrl}/api/analytics/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Analytics hatasi ana kullanici akisini bozmamali.
  });
}