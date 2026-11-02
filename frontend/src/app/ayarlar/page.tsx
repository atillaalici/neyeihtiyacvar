"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AccountManagement } from "@/components/account/AccountManagement";
import AccountSecurity from "@/components/account/AccountSecurity";
import { UserSidebar } from "@/components/panel/UserSidebar";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getAccessToken, getStoredUser } from "@/lib/auth";

export default function UserSettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace("/giris?returnUrl=/ayarlar");
      return;
    }

    if (user.role === "provider") {
      router.replace("/panel/ayarlar");
      return;
    }

    if (user.role === "admin") {
      router.replace("/admin");
      return;
    }

    setReady(true);
  }, [router]);

  return (
    <SiteLayout hideFooter>
      <div className="section-shell flex min-h-[75vh] flex-col gap-6 py-6 lg:flex-row lg:items-start">
        <Suspense fallback={null}>
          <UserSidebar />
        </Suspense>

        <main className="min-w-0 flex-1">
          {ready ? (
            <div className="space-y-6">
              <AccountManagement settingsPage />
              <AccountSecurity />
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6">
              Ayarlar yükleniyor...
            </div>
          )}
        </main>
      </div>
    </SiteLayout>
  );
}
