type AnalyticsValue = string | number | boolean | null | undefined;

export function trackEvent(
  eventName: string,
  params: Record<string, AnalyticsValue> = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  const gtag = (
    window as typeof window & {
      gtag?: (
        command: "event",
        eventName: string,
        params?: Record<string, AnalyticsValue>,
      ) => void;
    }
  ).gtag;

  gtag?.("event", eventName, params);
}