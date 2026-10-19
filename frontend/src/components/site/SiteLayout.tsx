import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function SiteLayout({ children, hideFooter = false }: { children: ReactNode; hideFooter?: boolean }) {
  return <div className="flex min-h-screen flex-col bg-background"><Navbar /><main className="flex-1">{children}</main>{!hideFooter && <Footer />}</div>;
}
