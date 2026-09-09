import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Neye İhtiyacın Var? — İhtiyacını anlat, doğru kişiyi bul",
  description:
    "Türkiye'nin yerel ihtiyaç platformu. İhtiyacını anlat, sana en uygun kişi, işletme veya hizmeti bulalım.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}