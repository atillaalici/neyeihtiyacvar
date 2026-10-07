import type { Metadata } from "next";

import { HomeClient } from "./home-client";

export const metadata: Metadata = {
  title: "İhtiyacını Yaz, Doğru Hizmeti Bul",
  description:
    "İhtiyacını anlat, sana uygun kişi, işletme veya hizmeti bul. Elektrikçi, tesisatçı, teknik servis, nakliye, hafriyat ve daha birçok hizmeti Neye İhtiyaç Var ile keşfet.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://neyeihtiyacvar.com",
    title: "Neye İhtiyaç Var | İhtiyacını Yaz, Doğru Hizmeti Bul",
    description:
      "İhtiyacını anlat, sana uygun kişi, işletme veya hizmeti bul. Yakınındaki hizmet verenleri keşfet.",
    images: [
      {
        url: "/brand/neyeihtiyacvar-og.png",
        width: 1200,
        height: 630,
        alt: "Neye İhtiyaç Var - İhtiyacını Yaz, Doğru Hizmeti Bul",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Neye İhtiyaç Var | İhtiyacını Yaz, Doğru Hizmeti Bul",
    description:
      "İhtiyacını anlat, sana uygun kişi, işletme veya hizmeti bul. Yakınındaki hizmet verenleri keşfet.",
    images: ["/brand/neyeihtiyacvar-og.png"],
  },
};

export default function HomePage() {
  return <HomeClient />;
}
