import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hizmet ve İşletme Keşfet",
  description:
    "İhtiyacına uygun hizmetleri ve işletmeleri keşfet. Konumuna ve aradığın hizmete göre işletmeleri karşılaştır.",
  alternates: { canonical: "/kesfet" },
  robots: {
    index: false,
    follow: true,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
