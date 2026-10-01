import { Suspense } from "react";

import MessagesClient from "./MessagesClient";

export default function MessagesPage() {
  return (
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
      <MessagesClient />
    </Suspense>
  );
}
