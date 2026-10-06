"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Mail,
  MailOpen,
  Phone,
  Search,
  UserRound,
} from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type ContactStatus = "new" | "read" | "answered" | "closed";
type FilterStatus = "all" | ContactStatus;

type ContactReply = {
  id: string;
  adminUserId: string | null;
  adminDisplayName: string | null;
  message: string;
  createdAtUtc: string;
};

type ContactRequest = {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAtUtc: string;
  readAtUtc: string | null;
  replies: ContactReply[];
};

const statusLabels: Record<ContactStatus, string> = {
  new: "Yeni",
  read: "Okundu",
  answered: "Yanıtlandı",
  closed: "Kapatıldı",
};

const statusClasses: Record<ContactStatus, string> = {
  new: "border-orange-200 bg-orange-50 text-orange-700",
  read: "border-blue-200 bg-blue-50 text-blue-700",
  answered: "border-green-200 bg-green-50 text-green-700",
  closed: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function AdminContactRequestsPage() {
  const [items, setItems] = useState<ContactRequest[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const suffix = params.toString()
        ? `?${params.toString()}`
        : "";

      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/contact-requests${suffix}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error();
      }

      setItems((await response.json()) as ContactRequest[]);
    } catch {
      setError("İletişim talepleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");

    if (!term) {
      return items;
    }

    return items.filter((item) =>
      [
        item.fullName,
        item.email,
        item.phoneNumber ?? "",
        item.subject,
        item.message,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(term),
    );
  }, [items, search]);

  async function changeStatus(
    item: ContactRequest,
    status: ContactStatus,
  ) {
    setBusyId(item.id);
    setError("");
    setNotice("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/contact-requests/${item.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ?? "İletişim talebi güncellenemedi.",
        );
        return;
      }

      setNotice("İletişim talebinin durumu güncellendi.");
      await loadItems();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  async function sendReply(item: ContactRequest) {
    const message = (replyTexts[item.id] ?? "").trim();

    if (message.length < 2) {
      setError("Lütfen göndermeden önce cevabınızı yazın.");
      return;
    }

    if (message.length > 4000) {
      setError("Cevap en fazla 4000 karakter olabilir.");
      return;
    }

    setBusyId(item.id);
    setError("");
    setNotice("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/contact-requests/${item.id}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        },
      );

      let data: { message?: string } | null = null;

      try {
        data = (await response.json()) as { message?: string };
      } catch {
        data = null;
      }

      if (!response.ok) {
        setError(
          data?.message ??
            "Cevap gönderilemedi. E-posta ayarlarını kontrol edin.",
        );
        return;
      }

      setReplyTexts((current) => ({
        ...current,
        [item.id]: "",
      }));

      setNotice(
        data?.message ??
          "Cevabınız kullanıcıya e-posta olarak gönderildi.",
      );

      await loadItems();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  function isCollapsed(item: ContactRequest) {
    return (
      (item.status === "answered" || item.status === "closed") &&
      !expandedIds.has(item.id)
    );
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  const newCount = items.filter(
    (item) => item.status === "new",
  ).length;

  return (
    <SiteLayout>
      <AdminNav />

      <section className="border-b border-border bg-cream">
        <div className="section-shell py-10 sm:py-14">
          <p className="text-sm font-medium text-primary">
            Yönetim
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              İletişim Talepleri
            </h1>

            {newCount > 0 && (
              <span className="rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white">
                {newCount} yeni
              </span>
            )}
          </div>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            İletişim formundan gönderilen kullanıcı mesajlarını
            görüntüleyin ve durumlarını yönetin.
          </p>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Tümü"],
              ["new", "Yeni"],
              ["read", "Okundu"],
              ["answered", "Yanıtlandı"],
              ["closed", "Kapatıldı"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setStatusFilter(value as FilterStatus)
                }
                className={[
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  statusFilter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="relative block w-full xl:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Ad, e-posta, konu veya mesaj ara..."
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        {notice && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="size-4" />
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 space-y-4">
            <div className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <MailOpen className="mx-auto size-9 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl font-bold">
              İletişim talebi bulunamadı
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Seçili filtreye uygun bir mesaj bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className={[
                  "overflow-hidden rounded-2xl border bg-card shadow-sm",
                  item.status === "new"
                    ? "border-orange-300"
                    : "border-border",
                ].join(" ")}
              >
                <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-xs font-bold",
                          statusClasses[item.status],
                        ].join(" ")}
                      >
                        {statusLabels[item.status]}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.createdAtUtc)}
                      </span>
                    </div>

                    <h2 className="mt-3 font-display text-xl font-bold">
                      {item.subject}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(item.status === "answered" ||
                      item.status === "closed") && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.id)}
                        className="h-10 rounded-xl border border-border bg-background px-4 text-sm font-bold transition hover:border-primary/40"
                      >
                        {isCollapsed(item) ? "Görüntüle" : "Gizle"}
                      </button>
                    )}

                    <select
                      value={item.status}
                      disabled={busyId === item.id}
                      onChange={(event) =>
                        void changeStatus(
                          item,
                          event.target.value as ContactStatus,
                        )
                      }
                      className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium"
                    >
                      <option value="new">Yeni</option>
                      <option value="read">Okundu</option>
                      <option value="answered">Yanıtlandı</option>
                      <option value="closed">Kapatıldı</option>
                    </select>
                  </div>
                </div>

                {!isCollapsed(item) && (
                  <>
                <div className="grid gap-6 p-5 lg:grid-cols-[18rem_1fr]">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <div className="font-bold">
                          {item.fullName}
                        </div>

                        {item.userId && (
                          <div className="mt-0.5 text-xs text-green-700">
                            Kayıtlı kullanıcı
                          </div>
                        )}
                      </div>
                    </div>

                    <a
                      href={`mailto:${item.email}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="size-4 shrink-0" />
                      <span className="break-all">
                        {item.email}
                      </span>
                    </a>

                    {item.phoneNumber && (
                      <a
                        href={`tel:${item.phoneNumber}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="size-4 shrink-0" />
                        {item.phoneNumber}
                      </a>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock3 className="size-4" />
                      {formatDate(item.createdAtUtc)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Mesaj
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {item.message}
                    </p>
                  </div>
                </div>
                <div className="border-t border-border bg-muted/20 p-5">
                  {item.replies.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold">
                        Cevap Geçmişi
                      </h3>

                      <div className="mt-3 space-y-3">
                        {item.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="rounded-xl border border-green-200 bg-green-50 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-green-800">
                                {reply.adminDisplayName
                                  ? `${reply.adminDisplayName} tarafından yanıtlandı`
                                  : "Yönetici tarafından yanıtlandı"}
                              </span>

                              <span className="text-xs text-green-700">
                                {formatDate(reply.createdAtUtc)}
                              </span>
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-green-950">
                              {reply.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-bold">
                      Cevap Yaz
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Gönderdiğiniz cevap kullanıcının e-posta adresine
                      iletilecek ve bu talebin geçmişine kaydedilecektir.
                    </p>

                    <textarea
                      value={replyTexts[item.id] ?? ""}
                      onChange={(event) =>
                        setReplyTexts((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      maxLength={4000}
                      rows={4}
                      placeholder="Kullanıcıya göndermek istediğiniz cevabı yazın..."
                      className="mt-3 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-primary"
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {(replyTexts[item.id] ?? "").length} / 4000
                      </span>

                      <button
                        type="button"
                        disabled={
                          busyId === item.id ||
                          (replyTexts[item.id] ?? "").trim().length < 2
                        }
                        onClick={() => void sendReply(item)}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyId === item.id
                          ? "Gönderiliyor..."
                          : "Cevabı Gönder"}
                      </button>
                    </div>
                  </div>
                </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
