"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";
import { getAccessToken, getStoredUser } from "@/lib/auth";

const DRAFT_KEY = "neyeihtiyacvar.businessRegistrationDraft";
const PLAN_KEY = "neyeihtiyacvar.selectedPlanCode";

function normalizePlan(value: string | null) {
  const plan = value?.trim().toLowerCase() ?? "";

  return plan === "kobi" ||
    plan === "avantaj" ||
    plan === "profesyonel"
    ? plan
    : null;
}

export default function BusinessContinuePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace(
        `/giris?returnUrl=${encodeURIComponent("/kayit?hesap=isletme")}`,
      );
      return;
    }

    if (user.role === "provider") {
      router.replace("/panel");
      return;
    }

    if (user.role === "admin") {
      router.replace("/admin/isletmeler");
      return;
    }

    const selectedPlan = normalizePlan(
      sessionStorage.getItem(PLAN_KEY),
    );

    const draftRaw =
      sessionStorage.getItem(DRAFT_KEY) ??
      localStorage.getItem(DRAFT_KEY);

    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as Record<string, unknown>;

        if (draft && typeof draft === "object") {
          const target = selectedPlan
            ? `/kayit?hesap=isletme&paket=${encodeURIComponent(selectedPlan)}`
            : "/kayit?hesap=isletme";

          router.replace(target);
          return;
        }
      } catch {
        sessionStorage.removeItem(DRAFT_KEY);
      }
    }

    router.replace("/uyelik");
  }, [router]);

  return (
    <SiteLayout>
      <main className="section-shell py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto size-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <h1 className="mt-5 font-display text-2xl font-bold">
            İşletme kaydın kontrol ediliyor
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Yarım kalan işletme kaydın varsa kaldığın adıma,
            yoksa işletme paketlerine yönlendirileceksin.
          </p>
        </div>
      </main>
    </SiteLayout>
  );
}