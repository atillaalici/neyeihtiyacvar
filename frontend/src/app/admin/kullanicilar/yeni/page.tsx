"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

export default function NewAdminUserPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    setBusy(true);
    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: String(form.get("displayName") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            role: String(form.get("role") ?? "user"),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Kullanıcı oluşturulamadı.");
        return;
      }

      router.push("/admin/kullanicilar");
      router.refresh();
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
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl font-bold">
            Yeni Kullanıcı Ekle
          </h1>

          <form
            onSubmit={submit}
            className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <Field label="Ad Soyad" name="displayName" />
            <Field label="E-posta" name="email" type="email" />
            <Field label="Geçici Şifre" name="password" type="password" />

            <label className="block">
              <span className="text-sm font-medium">Rol</span>
              <select
                name="role"
                defaultValue="user"
                className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="user">Kullanıcı</option>
                <option value="provider">İşletme Sahibi</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/kullanicilar")}
              >
                Vazgeç
              </Button>
              <Button type="submit" disabled={busy}>
                Kullanıcıyı Oluştur
              </Button>
            </div>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required
        className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}