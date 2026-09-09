"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, FileText, Search, Users } from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type Tab = "users" | "providers" | "needs";

type PassiveUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
  needCount: number;
  providerCount: number;
};

type PassiveProvider = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription: string;
  categorySlug: string;
  serviceSlug: string;
  citySlug: string;
  districtSlug: string;
  publicationStatus: string;
  isActive: boolean;
  version: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

type PassiveNeed = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  district: string;
  serviceSlug: string | null;
  status: string;
  isActive: boolean;
  ownerDisplayName: string | null;
  ownerEmail: string | null;
  offerCount: number;
  pendingOfferCount: number;
  reviewCount: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

const needStatusLabels: Record<string, string> = {
  open: "Açık",
  offerreceived: "Teklif Alındı",
  completed: "Sonuçlandı",
  cancelled: "İptal Edildi",
};

export default function AdminPassivePage() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<PassiveUser[]>([]);
  const [providers, setProviders] = useState<PassiveProvider[]>([]);
  const [needs, setNeeds] = useState<PassiveNeed[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (tab === "users") {
        const response = await adminFetch(
          `${apiBaseUrl}/api/admin/users?isActive=false`,
          { cache: "no-store" },
        );

        if (!response.ok) throw new Error();

        setUsers((await response.json()) as PassiveUser[]);
      } else if (tab === "providers") {
        const response = await adminFetch(
          `${apiBaseUrl}/api/admin/providers?isActive=false`,
          { cache: "no-store" },
        );

        if (!response.ok) throw new Error();

        setProviders((await response.json()) as PassiveProvider[]);
      } else {
        const response = await adminFetch(
          `${apiBaseUrl}/api/admin/needs?isActive=false`,
          { cache: "no-store" },
        );

        if (!response.ok) throw new Error();

        setNeeds((await response.json()) as PassiveNeed[]);
      }
    } catch {
      setError("Pasif kayıtlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearch("");
    setMessage("");
    setError("");
  }, [tab]);

  const term = search.trim().toLocaleLowerCase("tr-TR");

  const visibleUsers = useMemo(
    () =>
      users.filter((item) =>
        !term
          ? true
          : `${item.displayName} ${item.email} ${item.role}`
              .toLocaleLowerCase("tr-TR")
              .includes(term),
      ),
    [term, users],
  );

  const visibleProviders = useMemo(
    () =>
      providers.filter((item) =>
        !term
          ? true
          : `${item.businessName} ${item.categorySlug} ${item.serviceSlug} ${item.citySlug} ${item.districtSlug}`
              .toLocaleLowerCase("tr-TR")
              .includes(term),
      ),
    [providers, term],
  );

  const visibleNeeds = useMemo(
    () =>
      needs.filter((item) =>
        !term
          ? true
          : `${item.title} ${item.description} ${item.category} ${item.serviceSlug ?? ""} ${item.city} ${item.district} ${item.ownerDisplayName ?? ""} ${item.ownerEmail ?? ""}`
              .toLocaleLowerCase("tr-TR")
              .includes(term),
      ),
    [needs, term],
  );

  async function activateUser(item: PassiveUser) {
    if (!window.confirm(`${item.displayName} hesabını tekrar aktif etmek istiyor musunuz?`)) {
      return;
    }

    await runStatusChange(
      item.id,
      `${apiBaseUrl}/api/admin/users/${item.id}/status`,
      "Kullanıcı hesabı tekrar aktif edildi.",
    );
  }

  async function activateProvider(item: PassiveProvider) {
    if (!window.confirm(`${item.businessName} işletmesini tekrar aktif etmek istiyor musunuz?`)) {
      return;
    }

    await runStatusChange(
      item.id,
      `${apiBaseUrl}/api/admin/providers/${item.id}/status`,
      "İşletme tekrar aktif edildi.",
    );
  }

  async function activateNeed(item: PassiveNeed) {
    if (!window.confirm(`"${item.title}" talebini tekrar aktif etmek istiyor musunuz?`)) {
      return;
    }

    await runStatusChange(
      item.id,
      `${apiBaseUrl}/api/admin/needs/${item.id}/status`,
      "İhtiyaç talebi tekrar aktif edildi.",
    );
  }

  async function deletePassiveItem(
    id: string,
    url: string,
    label: string,
  ) {
    if (!window.confirm(`${label} kalıcı olarak silinsin mi?`)) {
      return;
    }

    if (
      !window.confirm(
        "Son onay: Bu işlem geri alınamaz. Kaydı kalıcı olarak silmek istediğinize emin misiniz?",
      )
    ) {
      return;
    }

    setBusyId(id);
    setError("");
    setMessage("");

    try {
      const response = await adminFetch(url, {
        method: "DELETE",
      });

      let data: { message?: string } | null = null;

      try {
        data = (await response.json()) as { message?: string };
      } catch {
        data = null;
      }

      if (!response.ok) {
        setError(data?.message ?? "Kayıt silinemedi.");
        return;
      }

      setMessage(data?.message ?? "Kayıt kalıcı olarak silindi.");
      await load();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyId(null);
    }
  }
  async function runStatusChange(
    id: string,
    url: string,
    successMessage: string,
  ) {
    setBusyId(id);
    setError("");
    setMessage("");

    try {
      const response = await adminFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Kayıt aktifleştirilemedi.");
        return;
      }

      setMessage(successMessage);
      await load();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  const currentCount =
    tab === "users"
      ? visibleUsers.length
      : tab === "providers"
        ? visibleProviders.length
        : visibleNeeds.length;

  return (
    <SiteLayout>
      <AdminNav />

      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <p className="text-sm font-medium text-primary">Yönetim</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Pasifler
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Pasife alınmış kullanıcıları, işletmeleri ve ihtiyaç taleplerini
            ayrı sekmelerde yönet.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton
              active={tab === "users"}
              onClick={() => setTab("users")}
              icon={<Users className="size-4" />}
            >
              Kullanıcılar
            </TabButton>

            <TabButton
              active={tab === "providers"}
              onClick={() => setTab("providers")}
              icon={<Building2 className="size-4" />}
            >
              İşletmeler
            </TabButton>

            <TabButton
              active={tab === "needs"}
              onClick={() => setTab("needs")}
              icon={<FileText className="size-4" />}
            >
              İhtiyaç Talepleri
            </TabButton>
          </div>

          <label className="relative block xl:w-[28rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pasif kayıtlarda ara..."
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
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

        {loading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        ) : currentCount === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h2 className="font-display text-xl font-semibold">
              Bu bölümde pasif kayıt yok
            </h2>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {tab === "users" &&
              visibleUsers.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-semibold">
                          {item.displayName}
                        </h2>
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          Pasif
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.email}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span>Rol: {item.role}</span>
                        <span>Talep: {item.needCount}</span>
                        <span>İşletme: {item.providerCount}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void activateUser(item)}
                    >
                      Hesabı Aktif Et
                    </Button>
                  </div>
                </article>
              ))}

            {tab === "providers" &&
              visibleProviders.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-semibold">
                          {item.businessName}
                        </h2>
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          Pasif
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.shortDescription}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span>
                          {item.categorySlug} / {item.serviceSlug}
                        </span>
                        <span>
                          {item.citySlug} / {item.districtSlug}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void activateProvider(item)}
                    >
                      İşletmeyi Aktif Et
                    </Button>
                  </div>
                </article>
              ))}

            {tab === "needs" &&
              visibleNeeds.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-semibold">
                          {item.title}
                        </h2>

                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          Pasif
                        </span>

                        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium">
                          {needStatusLabels[item.status] ?? item.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span>
                          Kullanıcı: {item.ownerDisplayName ?? "Anonim / Eski Talep"}
                        </span>
                        <span>
                          Konum: {item.city} / {item.district}
                        </span>
                        <span>
                          Kategori: {item.category}
                        </span>
                        <span>
                          Teklif: {item.offerCount}
                        </span>
                        <span>
                          Tarih:{" "}
                          {new Date(item.createdAtUtc).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void activateNeed(item)}
                    >
                      Talebi Aktif Et
                    </Button>
                  </div>
                </article>
              ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-primary/40 hover:bg-muted/50",
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}
