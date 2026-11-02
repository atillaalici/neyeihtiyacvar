import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "İşletme Paneli",
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
  return <Suspense fallback={null}>{children}</Suspense>;
}
