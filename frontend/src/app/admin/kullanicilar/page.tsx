"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Search,
  UserRound,
} from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type UserRole = "user" | "provider" | "admin";

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
  needCount: number;
  providerCount: number;
};

const roleLabels: Record<UserRole, string> = {
  user: "Kullanıcı",
  provider: "İşletme Sahibi",
  admin: "Admin",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");
  const [page, setPage] = useState(1);

  const pageSize = 10;
  const currentUser = getStoredUser();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/users?isActive=true`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Kullanıcılar alınamadı.");
      }

      setUsers((await response.json()) as AdminUser[]);
    } catch {
      setError("Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");

    const result = users.filter((user) => {
      const searchMatch =
        !needle ||
        user.displayName.toLocaleLowerCase("tr-TR").includes(needle) ||
        user.email.toLocaleLowerCase("tr-TR").includes(needle);

      const roleMatch =
        roleFilter === "all" || user.role === roleFilter;

      return searchMatch && roleMatch;
    });

    return [...result].sort((a, b) => {
      if (sort === "name") {
        return a.displayName.localeCompare(b.displayName, "tr");
      }

      const aTime = new Date(a.createdAtUtc).getTime();
      const bTime = new Date(b.createdAtUtc).getTime();

      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [query, roleFilter, sort, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleUsers = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, sort]);
async function updateStatus(user: AdminUser, isActive: boolean) {
    if (user.id === currentUser?.id && !isActive) {
      setError("Kendi admin hesabınızı pasif hale getiremezsiniz.");
      return;
    }

    if (!window.confirm(
      `${user.displayName} hesabını pasife almak istiyor musunuz?`,
    )) {
      return;
    }

    setBusyId(user.id);
    setError("");
    setMessage("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/users/${user.id}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Kullanıcı durumu değiştirilemedi.");
        return;
      }

      setMessage("Kullanıcı pasife alındı.");
      await loadUsers();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (user.id === currentUser?.id) {
      setError("Kendi admin hesabınızı silemezsiniz.");
      return;
    }

    if (!window.confirm(
      `${user.displayName} hesabını silmek istiyor musunuz?`,
    )) {
      return;
    }

    if (!window.confirm("Son onay: Bu işlem geri alınamaz.")) {
      return;
    }

    setBusyId(user.id);
    setError("");
    setMessage("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/users/${user.id}`,
        { method: "DELETE" },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Kullanıcı silinemedi.");
        return;
      }

      setMessage("Kullanıcı hesabı silindi.");
      await loadUsers();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SiteLayout>
      <AdminNav />

      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-medium text-primary">Yönetim</p>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                Kullanıcılar
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Aktif kullanıcı, işletme sahibi ve admin hesaplarını yönet.
                Pasife alınan hesaplar Pasifler bölümüne taşınır.
              </p>
            </div>

            <Link
              href="/admin/kullanicilar/yeni"
              className="inline-flex h-11 items-center justify-center rounded-md border border-primary bg-background px-5 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              + Yeni Kullanıcı Ekle
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Tümü"],
              ["user", "Normal Kullanıcı"],
              ["provider", "İşletme Sahibi"],
              ["admin", "Admin"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRoleFilter(value as typeof roleFilter)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  roleFilter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(16rem,1fr)_14rem] xl:w-[42rem]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ad veya e-posta ile ara..."
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </label>

            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as typeof sort)
              }
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="newest">Sıralama: Yeniden Eskiye</option>
              <option value="oldest">Sıralama: Eskiden Yeniye</option>
              <option value="name">Sıralama: Ada Göre</option>
            </select>
          </div>
        </div>

        {message && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
            Kullanıcı bulunamadı.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visibleUsers.map((user) => (
              <article
                key={user.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
              >
                <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="grid size-11 place-items-center rounded-full bg-muted text-sm font-bold text-primary">
                        {initials(user.displayName)}
                      </div>

                      <h2 className="font-display text-xl font-semibold">
                        {user.displayName}
                      </h2>

                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium">
                        {roleLabels[user.role]}
                      </span>

                      <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        Aktif
                      </span>

                      {user.id === currentUser?.id && (
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                          Bu hesap
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span>
                        <strong className="text-foreground">E-posta:</strong>{" "}
                        {user.email}
                      </span>
                      <span>
                        <strong className="text-foreground">Talepler:</strong>{" "}
                        {user.needCount}
                      </span>
                      <span>
                        <strong className="text-foreground">İşletme profili:</strong>{" "}
                        {user.providerCount}
                      </span>
                      <span>
                        <strong className="text-foreground">Kayıt:</strong>{" "}
                        {new Date(user.createdAtUtc).toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/admin/kullanicilar/${user.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                    >
                      Düzenle
                    </Link>

                    <Link
                      href={`/admin/kullanicilar/${user.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
                    >
                      Detay
                    </Link>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        busyId === user.id ||
                        user.id === currentUser?.id
                      }
                      onClick={() => void updateStatus(user, false)}
                    >
                      Pasife Al
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      disabled={
                        busyId === user.id ||
                        user.id === currentUser?.id
                      }
                      onClick={() => void deleteUser(user)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-muted-foreground">
              Toplam {filtered.length} kullanıcıdan{" "}
              {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filtered.length)} arası gösteriliyor.
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                ‹
              </Button>
              <div className="grid size-10 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                {page}
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
              >
                ›
              </Button>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}
