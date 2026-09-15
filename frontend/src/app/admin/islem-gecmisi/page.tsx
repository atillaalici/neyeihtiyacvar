"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type AuditLogItem = {
  id: string;
  adminUserId: string | null;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  details: string | null;
  createdAtUtc: string;
};

type AuditResponse = {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const actionLabels: Record<string, string> = {
  "user.activate": "Kullanıcı Aktif Edildi",
  "user.deactivate": "Kullanıcı Pasife Alındı",
  "user.delete": "Kullanıcı Silindi",
  "provider.activate": "İşletme Aktif Edildi",
  "provider.deactivate": "İşletme Pasife Alındı",
  "provider.delete": "İşletme Silindi",
};

const entityLabels: Record<string, string> = {
  user: "Kullanıcı",
  provider: "İşletme",
};

export default function AdminAuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [action, setAction] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "25");

      if (action !== "all") {
        params.set("action", action);
      }

      if (entityType !== "all") {
        params.set("entityType", entityType);
      }

      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/audit-logs?${params.toString()}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("İşlem geçmişi alınamadı.");
      }

      setData((await response.json()) as AuditResponse);
    } catch {
      setError("İşlem geçmişi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [action, entityType, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [action, entityType]);

  const visibleItems = useMemo(() => {
    const items = data?.items ?? [];
    const needle = query.trim().toLocaleLowerCase("tr-TR");

    if (!needle) {
      return items;
    }

    return items.filter((item) => {
      return [
        item.adminEmail,
        item.entityName ?? "",
        item.entityId ?? "",
        item.details ?? "",
        item.action,
        item.entityType,
      ].some((value) =>
        value.toLocaleLowerCase("tr-TR").includes(needle),
      );
    });
  }, [data, query]);

  return (
    <SiteLayout>
      <AdminNav />

      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <p className="text-sm font-medium text-primary">Yönetim</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            İşlem Geçmişi
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Admin kullanıcılarının kullanıcı ve işletmeler üzerinde yaptığı
            kritik işlemleri zaman sırasına göre takip et.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="all">Kayıt Türü: Tümü</option>
              <option value="user">Kullanıcı</option>
              <option value="provider">İşletme</option>
            </select>

            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="all">İşlem Türü: Tümü</option>
              <option value="user.activate">Kullanıcı Aktif Et</option>
              <option value="user.deactivate">Kullanıcı Pasife Al</option>
              <option value="user.delete">Kullanıcı Sil</option>
              <option value="provider.activate">İşletme Aktif Et</option>
              <option value="provider.deactivate">İşletme Pasife Al</option>
              <option value="provider.delete">İşletme Sil</option>
            </select>
          </div>

          <label className="relative block xl:w-[28rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Admin, kayıt adı, ID veya detay ara..."
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            İşlem kaydı bulunamadı.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold">
                        {actionLabels[item.action] ?? item.action}
                      </h2>

                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium">
                        {entityLabels[item.entityType] ?? item.entityType}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <strong className="text-foreground">Admin:</strong>{" "}
                        {item.adminEmail}
                      </div>

                      <div>
                        <strong className="text-foreground">Kayıt:</strong>{" "}
                        {item.entityName || "-"}
                      </div>

                      <div>
                        <strong className="text-foreground">Kayıt ID:</strong>{" "}
                        <span className="break-all">{item.entityId || "-"}</span>
                      </div>

                      <div>
                        <strong className="text-foreground">Tarih:</strong>{" "}
                        {new Date(item.createdAtUtc).toLocaleString("tr-TR")}
                      </div>
                    </div>

                    {item.details && (
                      <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm leading-6">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && data && data.total > 0 && (
          <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-muted-foreground">
              Toplam {data.total} işlem kaydı. Sayfa {data.page} /{" "}
              {Math.max(data.totalPages, 1)}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Önceki
              </Button>

              <div className="grid min-w-10 place-items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                {page}
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={page >= Math.max(data.totalPages, 1)}
                onClick={() =>
                  setPage((value) =>
                    Math.min(Math.max(data.totalPages, 1), value + 1),
                  )
                }
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}