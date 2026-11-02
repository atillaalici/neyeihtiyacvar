"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, UserRound } from "lucide-react";

import { UserSidebar } from "@/components/panel/UserSidebar";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getAccessToken, getStoredUser, type AuthUser } from "@/lib/auth";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function UserMembershipPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      router.replace("/giris?returnUrl=/uyeligim");
      return;
    }

    if (stored.role === "provider") {
      router.replace("/panel/uyeligim");
      return;
    }

    if (stored.role === "admin") {
      router.replace("/admin");
      return;
    }

    setUser(stored);
    setLoading(false);
  }, [router]);

  return (
    <SiteLayout hideFooter>
      <div className="section-shell flex min-h-[75vh] flex-col gap-6 py-6 lg:flex-row lg:items-stretch">
        <Suspense fallback={null}>
          <UserSidebar />
        </Suspense>

        <main className="min-w-0 flex-1">
          <header className="mb-6">
            <p className="text-sm font-semibold text-muted-foreground">
              Kullanıcı Yönetimi
            </p>
            <h1 className="mt-2 text-3xl font-bold">Üyeliğim</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Üyelik bilgilerinizi ve hesap durumunuzu buradan takip edebilirsiniz.
            </p>
          </header>

          {loading || !user ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm">
              Üyelik bilgileri yükleniyor...
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">Üyelik Bilgilerim</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    <CheckCircle2 className="size-4" />
                    Aktif
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserRound className="size-4" />
                      Üyelik Türü
                    </div>
                    <p className="mt-2 font-semibold">Bireysel Kullanıcı</p>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-4" />
                      Üyelik Durumu
                    </div>
                    <p className="mt-2 font-semibold">Aktif</p>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="size-4" />
                      Başlangıç Tarihi
                    </div>
                    <p className="mt-2 font-semibold">
                      {formatDate(user.createdAtUtc)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <div className="text-xs text-muted-foreground">
                      Üyelik Süresi
                    </div>
                    <p className="mt-2 font-semibold">Süresiz</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold">
                  İşletme Olarak Hizmet Vermek İster misiniz?
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  İşletmenizi platforma ekleyerek dijital vitrininizi oluşturabilir,
                  sunduğunuz hizmetlere uygun taleplere ulaşabilirsiniz.
                </p>

                <Link
                  href="/isletme-ekle"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                >
                  İşletme Ol
                  <ArrowRight className="size-4" />
                </Link>
              </section>
            </div>
          )}
        </main>
      </div>
    </SiteLayout>
  );
}
