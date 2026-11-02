import { Suspense } from "react";

import UserMessagesClient from "./UserMessagesClient";
import { UserSidebar } from "@/components/panel/UserSidebar";
import { SiteLayout } from "@/components/site/SiteLayout";

export default function MessagesPage() {
  return (
    <SiteLayout hideFooter>
      <Suspense
      fallback={
        <main className="min-h-[70vh] bg-muted/20">
          <div className="section-shell py-8">
            <div className="rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
              Mesajlar yükleniyor...
            </div>
          </div>
        </main>
      }
    >
      <div className="section-shell flex flex-col gap-6 py-6 lg:flex-row lg:items-stretch">
        <UserSidebar />
        <main className="min-w-0 flex-1">
          <UserMessagesClient />
        </main>
      </div>
      </Suspense>
    </SiteLayout>
  );
}
