import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nasıl Çalışır?",
  description:
    "İhtiyacını yaz, uygun işletmeleri keşfet, iletişime geç ve aldığın hizmeti değerlendir. Neye İhtiyaç Var'ın nasıl çalıştığını öğren.",
  alternates: { canonical: "/nasil-calisir" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
