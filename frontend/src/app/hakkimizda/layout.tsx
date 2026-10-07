import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "Neye İhtiyaç Var, kullanıcıların ihtiyaçlarını doğru hizmet ve işletmelerle buluşturan Türkiye genelinde hizmet veren dijital platformdur.",
  alternates: { canonical: "/hakkimizda" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
