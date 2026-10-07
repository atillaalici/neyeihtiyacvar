import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İşletme Üyelik Paketleri",
  description:
    "Neye İhtiyaç Var işletme üyelik paketlerini incele, dijital vitrininle hizmetlerini müşterilere ulaştır.",
  alternates: { canonical: "/uyelik" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
