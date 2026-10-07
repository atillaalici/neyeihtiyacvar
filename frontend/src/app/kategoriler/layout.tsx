import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hizmet Kategorileri",
  description:
    "Neye İhtiyaç Var hizmet kategorilerini incele, ihtiyacına uygun hizmeti ve işletmeleri kolayca bul.",
  alternates: { canonical: "/kategoriler" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
