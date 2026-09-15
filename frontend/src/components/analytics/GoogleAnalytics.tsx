"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

import { trackEvent } from "@/lib/analytics";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function AnalyticsEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId) {
      return;
    }

    const queryString = searchParams.toString();
    const pagePath = queryString
      ? `${pathname}?${queryString}`
      : pathname;

    trackEvent("page_view", {
      page_path: pagePath,
    });

    if (pathname === "/kesfet") {
      const searchTerm =
        searchParams.get("q") ||
        searchParams.get("ihtiyac");

      if (searchTerm) {
        trackEvent("search", {
          search_term: searchTerm,
        });
      }
    }

    if (pathname.startsWith("/isletme/")) {
      trackEvent("view_provider", {
        provider_slug: pathname.split("/").filter(Boolean).at(-1),
      });
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!measurementId) {
      return;
    }

    function onClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a");

      if (!link) {
        return;
      }

      const href = link.getAttribute("href") || "";

      if (href.startsWith("tel:")) {
        trackEvent("contact_click", {
          method: "phone",
        });
        return;
      }

      if (
        href.includes("wa.me/") ||
        href.includes("whatsapp.com/")
      ) {
        trackEvent("contact_click", {
          method: "whatsapp",
        });
        return;
      }

      if (href === "/isletme-ekle" || href.startsWith("/kayit?hesap=isletme")) {
        trackEvent("provider_registration_start");
        return;
      }

      if (href.startsWith("/uyelik/odeme")) {
        trackEvent("begin_checkout");
      }
    }

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}

export function GoogleAnalytics() {
  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            anonymize_ip: true,
            send_page_view: false
          });
        `}
      </Script>
      <AnalyticsEvents />
    </>
  );
}