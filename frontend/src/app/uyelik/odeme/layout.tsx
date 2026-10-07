import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Üyelik Ödeme",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PrivateRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
