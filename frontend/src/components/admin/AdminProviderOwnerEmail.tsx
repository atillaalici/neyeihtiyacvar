"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type OwnerEmail = {
  userId: string;
  email: string;
  emailVerified: boolean;
};

type Props = {
  providerId: string;
};

export function AdminProviderOwnerEmail({ providerId }: Props) {
  const [owner, setOwner] = useState<OwnerEmail | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${providerId}/owner-email`,
        { cache: "no-store" },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ?? "İşletme sahibinin e-postası alınamadı.",
        );
      }

      const data = result as OwnerEmail;

      setOwner(data);
      setEmail(data.email);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "E-posta bilgisi yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!owner || saving) return;

    setError("");
    setMessage("");

    const nextEmail = email.trim().toLowerCase();

    if (!nextEmail) {
      setError("E-posta adresi boş bırakılamaz.");
      return;
    }

    if (nextEmail === owner.email.toLowerCase()) {
      setMessage("E-posta adresinde değişiklik yapılmadı.");
      return;
    }

    const confirmed = window.confirm(
      "İşletme sahibinin e-posta adresi değiştirilecek.\n\n" +
      "Yeni adres doğrulanmamış olarak işaretlenecek. " +
      "Kullanıcının yeni adresini doğrulaması gerekecek.\n\n" +
      "Devam etmek istiyor musunuz?",
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/providers/${providerId}/owner-email`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: nextEmail }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? "E-posta değiştirilemedi.");
      }

      setOwner({
        userId: result.userId,
        email: result.email,
        emailVerified: result.emailVerified,
      });
      setEmail(result.email);

      setMessage(
        "E-posta adresi güncellendi. Yeni adresin doğrulanması gerekiyor.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "E-posta değiştirilemedi.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <h2 className="text-xl font-bold">İşletme Sahibi Hesap Bilgileri</h2>

      <p className="mt-1 text-sm text-muted-foreground">
        Bu alan işletmenin giriş yaptığı kullanıcı hesabına aittir.
        İşletmenin herkese açık iletişim adresinden farklıdır.
      </p>

      {loading ? (
        <p className="mt-4 text-sm">Hesap bilgileri yükleniyor...</p>
      ) : owner ? (
        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="admin-provider-owner-email"
              className="mb-2 block text-sm font-medium"
            >
              Hesap e-posta adresi
            </label>

            <input
              id="admin-provider-owner-email"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage("");
              }}
              disabled={saving}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            />
          </div>

          <p className="text-sm">
            Doğrulama durumu:{" "}
            <span
              className={
                owner.emailVerified
                  ? "font-medium text-green-700"
                  : "font-medium text-amber-700"
              }
            >
              {owner.emailVerified
                ? "E-posta doğrulanmış"
                : "E-posta doğrulanmamış"}
            </span>
          </p>

          <p className="text-xs text-muted-foreground">
            Adres değiştirildiğinde e-posta doğrulama durumu sıfırlanır.
            Bu işlem işletmenin yayın durumunu değiştirmez.
          </p>

          <Button
            type="submit"
            disabled={
              saving ||
              !email.trim() ||
              email.trim().toLowerCase() === owner.email.toLowerCase()
            }
          >
            {saving ? "Kaydediliyor..." : "E-posta Adresini Güncelle"}
          </Button>
        </form>
      ) : null}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm text-green-700">
          {message}
        </p>
      )}
    </section>
  );
}
