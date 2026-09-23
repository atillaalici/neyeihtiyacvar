"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";

import { apiBaseUrl } from "@/lib/api";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
} from "@/lib/auth";

type AccessUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  hasAdminAccess: boolean;
  hasProvider: boolean;
};

function roleLabel(user: AccessUser) {
  if (user.hasProvider || user.role === "provider") return "İşletme";
  return "Kullanıcı";
}

export default function AdminAccessPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const currentUser = getStoredUser();

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      const token = getAccessToken();

      if (!token) {
        router.push("/giris");
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/admin/role-management/users`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        if (response.status === 401 || response.status === 403) {
          router.push("/admin");
          return;
        }

        if (!response.ok) {
          throw new Error();
        }

        const data = (await response.json()) as AccessUser[];

        if (active) {
          setUsers(data);
        }
      } catch {
        if (active) {
          setError("Yetki bilgileri alınamadı.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, [router]);

  const filteredUsers = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("tr-TR");

    if (!clean) return users;

    return users.filter((user) =>
      `${user.displayName} ${user.email} ${user.role}`
        .toLocaleLowerCase("tr-TR")
        .includes(clean),
    );
  }, [query, users]);

  async function setAdminAccess(
    user: AccessUser,
    enabled: boolean,
  ) {
    const token = getAccessToken();

    if (!token) {
      clearAuth();
      router.push("/giris");
      return;
    }

    const actionText = enabled
      ? `${user.displayName} hesabına yönetici yetkisi vermek`
      : `${user.displayName} hesabının yönetici yetkisini kaldırmak`;

    if (
      !window.confirm(
        `${actionText} istediğine emin misin?\n\nAna kullanıcı/işletme rolü korunacaktır.`,
      )
    ) {
      return;
    }

    setBusyUserId(user.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/role-management/users/${user.id}/admin-access`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Yetki değiştirilemedi.");
        return;
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                role: data.role,
                hasAdminAccess: data.hasAdminAccess,
                hasProvider: data.hasProvider,
              }
            : item,
        ),
      );

      setMessage(data.message ?? "Yetki güncellendi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <SiteLayout>
      <AdminNav />
      <div className="section-shell py-8 sm:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-sm font-semibold text-primary">Yönetim</div>
          <h1 className="mt-1 font-display text-3xl font-bold">
            Admin Yetkileri
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Normal kullanıcılara ve işletme sahiplerine, ana hesap rollerini
            değiştirmeden yönetici yetkisi ver.
          </p>
        </div>

        <Link
          href="/admin/kullanicilar"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-semibold transition hover:bg-accent"
        >
          Kullanıcılara Dön
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
        İşletme hesabına admin yetkisi verirsen işletme rolü ve işletme paneli
        korunur. Admin yetkisini geri aldığında da işletme hesabı aynen devam
        eder.
      </div>

      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Güvenlik: Kendi admin yetkini kaldıramazsın ve sistemdeki son admin
        yetkisi kaldırılamaz.
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ad veya e-posta ile ara..."
          className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">
            Hesaplar yükleniyor...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Hesap bulunamadı.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredUsers.map((user) => {
              const isSelf = currentUser?.id === user.id;
              const isBusy = busyUserId === user.id;

              return (
                <div
                  key={user.id}
                  className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">
                        {user.displayName}
                      </div>

                      <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold">
                        {roleLabel(user)}
                      </span>

                      {user.hasAdminAccess && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                          Admin Yetkisi
                        </span>
                      )}

                      {isSelf && (
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">
                          Sen
                        </span>
                      )}
                    </div>

                    <div className="mt-1 break-all text-sm text-muted-foreground">
                      {user.email}
                    </div>

                    {user.hasProvider && (
                      <div className="mt-2 text-xs font-medium text-blue-700">
                        İşletme sahipliği korunur.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!user.hasAdminAccess && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void setAdminAccess(user, true)
                        }
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                      >
                        {isBusy
                          ? "İşleniyor..."
                          : "Admin Yetkisi Ver"}
                      </button>
                    )}

                    {user.hasAdminAccess && !isSelf && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void setAdminAccess(user, false)
                        }
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        {isBusy
                          ? "İşleniyor..."
                          : "Admin Yetkisini Kaldır"}
                      </button>
                    )}

                    {isSelf && user.hasAdminAccess && (
                      <span className="inline-flex h-10 items-center rounded-xl border border-border bg-muted/40 px-4 text-sm text-muted-foreground">
                        Kendi yetkin korunuyor
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </SiteLayout>
  );
}
