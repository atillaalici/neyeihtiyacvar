import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { LocationPermissionPrompt } from "@/components/location/LocationPermissionPrompt";
import { CookieConsent } from "@/components/consent/CookieConsent";

import "./globals.css";

const siteUrl = "https://neyeihtiyacvar.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Neye İhtiyaç Var | İhtiyacını Yaz, Doğru Hizmeti Bul",
    template: "%s | Neye İhtiyaç Var",
  },
  description:
    "Türkiye genelinde ihtiyacını yaz, doğru hizmeti ve uygun işletmeleri kolayca bul. Elektrikçi, tesisatçı, bilgisayar tamiri, nakliye, hafriyat ve daha fazlası.",
  applicationName: "Neye İhtiyaç Var",
  keywords: [
    "neye ihtiyaç var",
    "hizmet bul",
    "usta bul",
    "işletme bul",
    "yerel hizmet",
    "elektrikçi",
    "tesisatçı",
    "nakliye",
    "hafriyat",
    "bilgisayar tamiri",
  ],
  authors: [{ name: "Neye İhtiyaç Var" }],
  creator: "Neye İhtiyaç Var",
  publisher: "Neye İhtiyaç Var",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "Neye İhtiyaç Var",
    title: "Neye İhtiyaç Var | İhtiyacını Yaz, Doğru Hizmeti Bul",
    description:
      "İhtiyacını yaz, bulunduğun bölgedeki uygun işletme ve hizmet sağlayıcıları kolayca bul.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neye İhtiyaç Var",
    description:
      "İhtiyacını yaz, doğru hizmeti ve uygun işletmeleri kolayca bul.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Neye İhtiyaç Var",
  url: siteUrl,
  logo: `${siteUrl}/brand/neyeihtiyacvar-logo.png`,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Neye İhtiyaç Var",
  url: siteUrl,
  inLanguage: "tr-TR",
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/kesfet?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        {children}
        <CookieConsent />
        <GoogleAnalytics />
        <LocationPermissionPrompt />
        <Script
          id="organization-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON.stringify(organizationJsonLd)}
        </Script>
        <Script
          id="website-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON.stringify(websiteJsonLd)}
        </Script>
      </body>
    </html>
  );
}

