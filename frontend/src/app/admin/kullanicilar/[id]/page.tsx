"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

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

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await adminFetch(
          `${apiBaseUrl}/api/admin/users/${params.id}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error();
        }

        if (active) {
          setUser((await response.json()) as AdminUser);
        }
      } catch {
        if (active) setError("Kullanıcı bilgileri yüklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const form = new FormData(event.currentTarget);

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/users/${user.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: String(form.get("displayName") ?? ""),
            email: String(form.get("email") ?? ""),
            role: String(form.get("role") ?? "user"),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Kullanıcı güncellenemedi.");
        return;
      }

      setUser((current) =>
        current
          ? {
              ...current,
              displayName: data.displayName,
              email: data.email,
              role: data.role,
              updatedAtUtc: data.updatedAtUtc,
            }
          : current,
      );

      setMessage("Kullanıcı bilgileri güncellendi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <AdminNav />
      <section className="section-shell py-10 sm:py-14">
        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
        ) : !user ? (
          <div className="rounded-2xl border border-border bg-card p-8">
            {error || "Kullanıcı bulunamadı."}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <form
              onSubmit={submit}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <h1 className="font-display text-2xl font-bold">
                Kullanıcı Düzenle
              </h1>

              <div className="mt-6 space-y-5">
                <Field
                  label="Ad Soyad"
                  name="displayName"
                  defaultValue={user.displayName}
                />
                <Field
                  label="E-posta"
                  name="email"
                  type="email"
                  defaultValue={user.email}
                />

                <label className="block">
                  <span className="text-sm font-medium">Rol</span>
                  <select
                    name="role"
                    defaultValue={user.role}
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="user">Kullanıcı</option>
                    <option value="provider">İşletme Sahibi</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
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

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/kullanicilar")}
                >
                  Geri
                </Button>
                <Button type="submit" disabled={busy}>
                  Kaydet
                </Button>
              </div>
            </form>

            <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">Detay</h2>

              <div className="mt-4 space-y-4 text-sm">
                <Row label="Durum" value={user.isActive ? "Aktif" : "Pasif"} />
                <Row label="Talep sayısı" value={String(user.needCount)} />
                <Row label="İşletme profili" value={String(user.providerCount)} />
                <Row
                  label="Kayıt"
                  value={new Date(user.createdAtUtc).toLocaleString("tr-TR")}
                />
                <Row
                  label="Son güncelleme"
                  value={new Date(user.updatedAtUtc).toLocaleString("tr-TR")}
                />
              </div>
            </aside>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}