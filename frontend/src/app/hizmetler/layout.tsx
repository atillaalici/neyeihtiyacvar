import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tüm Hizmetler",
  description:
    "Elektrikçiden tesisatçıya, nakliyeden teknoloji hizmetlerine kadar ihtiyaç duyduğun hizmetleri Neye İhtiyaç Var'da keşfet.",
  alternates: { canonical: "/hizmetler" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
