"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  Phone,
  Send,
  MoreVertical,
  Trash2,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import {
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";

type ConversationItem = {
  id: string;
  conversationType?: "storefront" | "need";
  needRequestId?: string;
  needTitle?: string;
  providerId: string;
  providerSlug: string;
  businessName: string;
  customerUserId: string;
  customerName: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  lastMessageAtUtc: string | null;
  unreadCount: number;
  lastMessage: {
    id: string;
    body: string;
    senderUserId: string;
    createdAtUtc: string;
    readAtUtc: string | null;
  } | null;
};

type MessageItem = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  body: string;
  createdAtUtc: string;
  readAtUtc: string | null;
  isDeletedForEveryone?: boolean;
};

type ConversationDetail = {
  conversation: {
    id: string;
    providerId: string;
    providerSlug: string;
    businessName: string;
    customerUserId: string;
    customerName: string;
    publicPhone: string | null;
    publicWhatsapp: string | null;
    email: string | null;
  };
  messages: MessageItem[];
};

function digits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function formatConversationTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}


function MessagesLayout({
  embedded,
  children,
}: {
  embedded: boolean;
  children: React.ReactNode;
}) {
  return embedded ? <>{children}</> : <SiteLayout>{children}</SiteLayout>;
}

export default function MessagesClient({ embedded = false }: { embedded?: boolean }) {
  const messagesPath = embedded ? "/panel/mesajlarim" : "/mesajlarim";
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");

  const [user, setUser] = useState<AuthUser | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    requestedConversationId,
  );
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      router.replace(
        `/giris?returnUrl=${encodeURIComponent(messagesPath)}`,
      );
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [storefrontResponse, needResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/messages/conversations`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${apiBaseUrl}/api/need-messages/conversations`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if (!storefrontResponse.ok) {
        throw new Error("Vitrin konuşmaları yüklenemedi.");
      }

      const storefrontData =
        (await storefrontResponse.json()) as ConversationItem[];

      const needData: ConversationItem[] = needResponse.ok
        ? ((await needResponse.json()) as Omit<
            ConversationItem,
            "providerSlug"
          >[]).map((item) => ({
            ...item,
            conversationType: "need",
            providerSlug: "",
            needRequestId: item.needRequestId,
          }))
        : [];

      const merged: ConversationItem[] = [
        ...storefrontData.map((item) => ({
          ...item,
          conversationType: "storefront" as const,
        })),
        ...needData,
      ].sort(
        (a, b) =>
          new Date(b.lastMessageAtUtc ?? b.createdAtUtc).getTime() -
          new Date(a.lastMessageAtUtc ?? a.createdAtUtc).getTime(),
      );

      setConversations(merged);

      setSelectedId((current) => {
        if (current && merged.some((item) => item.id === current)) {
          return current;
        }

        if (requestedConversationId) {
          const requested = merged.find(
            (item) => item.id === requestedConversationId,
          );

          if (requested) return requested.id;
        }

        return null;
      });
    } catch {
      setError("Mesajlar yüklenirken bir sorun oluştu.");
    } finally {
      setLoadingConversations(false);
    }
  }, [requestedConversationId, router, messagesPath]);
  const loadConversation = useCallback(async (conversationId: string) => {
    const token = getAccessToken();
    if (!token) return;

    const selected = conversations.find((item) => item.id === conversationId);
    if (!selected) return;

    setLoadingMessages(true);
    setError("");

    try {
      const isNeed = selected.conversationType === "need";
      const endpoint = isNeed ? "need-messages" : "messages";

      const response = await fetch(
        `${apiBaseUrl}/api/${endpoint}/conversations/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Konuşma yüklenemedi.");
      }

      const data = await response.json();

      setDetail({
        conversation: {
          ...data.conversation,
          publicPhone: data.conversation.publicPhone ?? null,
          publicWhatsapp: data.conversation.publicWhatsapp ?? null,
          email: data.conversation.email ?? null,
        },
        messages: data.messages,
      } as ConversationDetail);

      await fetch(
        `${apiBaseUrl}/api/${endpoint}/conversations/${conversationId}/read`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setConversations((current) =>
        current.map((item) =>
          item.id === conversationId ? { ...item, unreadCount: 0 } : item,
        ),
      );

      window.dispatchEvent(new Event("messages-changed"));
    } catch {
      setError("Konuşma yüklenirken bir sorun oluştu.");
    } finally {
      setLoadingMessages(false);
    }
  }, [conversations]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUser(getStoredUser());
      void loadConversations();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;

    const timer = window.setTimeout(() => {
      void loadConversation(selectedId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedId, loadConversation]);

  useEffect(() => {
    if (!detail) return;

    const timer = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [detail]);

  useEffect(() => {
    if (!selectedId) return;

    const poller = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;

      const token = getAccessToken();
      if (!token) return;

      try {
        const selected = conversations.find((item) => item.id === selectedId);
        if (!selected) return;

        const endpoint =
          selected.conversationType === "need" ? "need-messages" : "messages";

        const [conversationResponse, conversationsResponse] =
          await Promise.all([
            fetch(
              `${apiBaseUrl}/api/${endpoint}/conversations/${selectedId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
              },
            ),
            fetch(
              `${apiBaseUrl}/api/${endpoint}/conversations`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
              },
            ),
          ]);

        if (conversationResponse.ok) {
          const data =
            (await conversationResponse.json()) as ConversationDetail;

          setDetail(data);

          await fetch(
            `${apiBaseUrl}/api/${endpoint}/conversations/${selectedId}/read`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          window.dispatchEvent(new Event("messages-changed"));
        }

        if (conversationsResponse.ok) {
          const data =
            (await conversationsResponse.json()) as ConversationItem[];

          setConversations(
            data.map((item) =>
              item.id === selectedId
                ? { ...item, unreadCount: 0 }
                : item,
            ),
          );
        }
      } catch {
        // Otomatik yenileme hatası mevcut sohbeti bozmamalı.
      }
    }, 5000);

    return () => window.clearInterval(poller);
  }, [selectedId, conversations]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const isProviderSide =
    Boolean(user) &&
    Boolean(selectedConversation) &&
    user?.id !== selectedConversation?.customerUserId;

  function selectConversation(id: string) {
    setSelectedId(id);
    setDetail(null);

    const params = new URLSearchParams(searchParams.toString());
    params.set("conversation", id);
    router.replace(`${messagesPath}?${params.toString()}`, {
      scroll: false,
    });
  }

  function backToList() {
    setSelectedId(null);
    setDetail(null);
    router.replace(messagesPath, { scroll: false });
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = messageBody.trim();

    if (!body || !selectedId || sending) return;

    const token = getAccessToken();

    if (!token) {
      router.push(
        `/giris?returnUrl=${encodeURIComponent(messagesPath)}`,
      );
      return;
    }

    setSending(true);
    setError("");

    try {
      const selected = conversations.find((item) => item.id === selectedId);
      if (!selected) throw new Error("Konuşma bulunamadı.");

      const endpoint =
        selected.conversationType === "need" ? "need-messages" : "messages";

      const response = await fetch(
        `${apiBaseUrl}/api/${endpoint}/conversations/${selectedId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        throw new Error(payload?.message ?? "Mesaj gönderilemedi.");
      }

      setMessageBody("");

      await Promise.all([
        loadConversation(selectedId),
        loadConversations(),
      ]);

      window.dispatchEvent(new Event("messages-changed"));
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Mesaj gönderilemedi.",
      );
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(
    messageId: string,
    scope: "me" | "everyone",
  ) {
    if (!selectedId || deletingMessageId) return;

    const token = getAccessToken();
    if (!token) {
      setError("Mesaj silmek için giriş yapmalısınız.");
      return;
    }

    const selected = conversations.find((item) => item.id === selectedId);
    const message = detail?.messages.find((item) => item.id === messageId);

    if (!selected || !message) return;

    if (scope === "everyone") {
      if (message.senderUserId !== user?.id || message.isDeletedForEveryone) {
        setError("Bu mesajı herkesten silemezsiniz.");
        return;
      }
    }

    const confirmed = window.confirm(
      scope === "everyone"
        ? "Bu mesajın içeriği herkes için silinecek. Devam edilsin mi?"
        : "Bu mesaj yalnızca sizin ekranınızdan silinecek. Devam edilsin mi?",
    );

    if (!confirmed) return;

    setDeletingMessageId(messageId);
    setOpenMessageMenuId(null);
    setError("");

    try {
      const endpoint =
        selected.conversationType === "need" ? "need-messages" : "messages";

      const response = await fetch(
        `${apiBaseUrl}/api/${endpoint}/conversations/${selectedId}/messages/${messageId}/delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ scope }),
        },
      );

      if (!response.ok) {
        throw new Error("Mesaj silinemedi.");
      }

      await Promise.all([
        loadConversation(selectedId),
        loadConversations(),
      ]);

      window.dispatchEvent(new Event("messages-changed"));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Mesaj silinirken bir hata oluştu.",
      );
    } finally {
      setDeletingMessageId(null);
    }
  }

  const phone = digits(detail?.conversation.publicPhone);
  const whatsapp = digits(
    detail?.conversation.publicWhatsapp ||
      detail?.conversation.publicPhone,
  );

  return (
    <div className="min-w-0 w-full">
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight">
              Mesajlarım
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              İşletmelerle yaptığınız görüşmeleri buradan takip edebilirsiniz.
            </p>
          </div>

          <div className="grid min-w-0 overflow-hidden rounded-2xl border border-border bg-background shadow-sm md:grid-cols-[minmax(220px,240px)_minmax(0,1fr)]">
            <aside className={`min-w-0 border-r border-border ${selectedId ? "hidden md:block" : "block"}`}>
              <div className="border-b border-border px-4 py-4">
                <div className="font-semibold">Konuşmalar</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {conversations.length} görüşme
                </div>
              </div>

              <div className="divide-y divide-border p-2">
                {loadingConversations ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Konuşmalar yükleniyor...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <MessageCircle className="mx-auto mb-3 size-9 text-muted-foreground" />
                    <div className="font-semibold">
                      Henüz mesajınız yok
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Bir işletmenin Dijital Vitrininden mesajlaşma
                      başlatabilirsiniz.
                    </p>
                    <Link
                      href="/kesfet"
                      className="mt-4 inline-flex rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      İşletmeleri Keşfet
                    </Link>
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const active = conversation.id === selectedId;

                    const displayName = isProviderSide
                      ? conversation.customerName || "Kullanıcı"
                      : conversation.businessName;

                    return (
                      <div key={conversation.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => selectConversation(conversation.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                          active ? "bg-orange-50 ring-1 ring-orange-200" : "hover:bg-muted"
                        }`}
                      >
                        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">
                          {displayName
                            ?.trim()
                            .charAt(0)
                            .toLocaleUpperCase("tr-TR") || "M"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {displayName}
                            </div>

                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatConversationTime(
                                conversation.lastMessageAtUtc ??
                                  conversation.createdAtUtc,
                              )}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-2">
                            <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                              {conversation.lastMessage?.body ??
                                "Henüz mesaj yok"}
                            </div>

                            {conversation.unreadCount > 0 && (
                              <span className="grid min-h-5 min-w-5 shrink-0 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                                {conversation.unreadCount > 99
                                  ? "99+"
                                  : conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>

                      </button>

                      </div>
                    );
                  })
                )}
              </div>
            </aside>
            <div className={`min-w-0 ${selectedId ? "block" : "hidden md:block"}`}>
              {selectedId ? (
<section className="flex h-[600px] min-w-0 flex-col overflow-hidden bg-background lg:h-[min(72vh,760px)]">
              {loadingMessages && !detail ? (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Konuşma yükleniyor...
                </div>
              ) : detail ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-3 md:px-5">
                    <button
                      type="button"
                      onClick={backToList}
                      className="grid size-9 place-items-center rounded-full hover:bg-muted"
                      aria-label="Konuşmalara dön"
                    >
                      <ArrowLeft className="size-5" />
                    </button>

                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">
                      {(isProviderSide
                        ? detail.conversation.customerName
                        : detail.conversation.businessName
                      )
                        ?.trim()
                        .charAt(0)
                        .toLocaleUpperCase("tr-TR") || "M"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {isProviderSide
                          ? detail.conversation.customerName || "Kullanıcı"
                          : detail.conversation.businessName}
                      </div>

                      {!isProviderSide && (
                        <Link
                          href={`/isletme/${detail.conversation.providerSlug}`}
                          className="text-xs font-medium text-orange-600 hover:underline"
                        >
                          Dijital Vitrini Görüntüle
                        </Link>
                      )}
                    </div>

                    {!isProviderSide && (
                      <div className="flex items-center gap-1">
                        {phone && (
                          <a
                            href={`tel:+${phone}`}
                            className="grid size-9 place-items-center rounded-full border border-border hover:bg-muted"
                            title="Telefon"
                            aria-label="Telefon"
                          >
                            <Phone className="size-4" />
                          </a>
                        )}

                        {whatsapp && (
                          <a
                            href={`https://wa.me/${whatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                            className="grid size-9 place-items-center rounded-full border border-border hover:bg-muted"
                            title="WhatsApp"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        )}

                        {detail.conversation.email && (
                          <a
                            href={`mailto:${detail.conversation.email}`}
                            className="grid size-9 place-items-center rounded-full border border-border hover:bg-muted"
                            title="E-posta"
                            aria-label="E-posta"
                          >
                            <Mail className="size-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-3 py-5 md:px-6">
                    <div className="mx-auto flex max-w-3xl flex-col gap-2">
                      {detail.messages.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">
                          Henüz mesaj yok. İlk mesajı siz gönderin.
                        </div>
                      ) : (
                        detail.messages.map((message) => {
                          const mine = message.senderUserId === user?.id;
                          const menuOpen = openMessageMenuId === message.id;

                          return (
                            <div
                              key={message.id}
                              className={`flex ${
                                mine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm md:max-w-[70%] ${
                                  mine
                                    ? "rounded-br-md bg-orange-500 text-white"
                                    : "rounded-bl-md border border-border bg-background"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-sm ${
                                    message.isDeletedForEveryone ? "italic opacity-75" : ""
                                  }`}>
                                    {message.body}
                                  </div>

                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      aria-label="Mesaj seçenekleri"
                                      aria-expanded={menuOpen}
                                      onClick={() =>
                                        setOpenMessageMenuId(menuOpen ? null : message.id)
                                      }
                                      disabled={deletingMessageId !== null}
                                      className="grid size-6 place-items-center rounded-md hover:bg-black/10 disabled:opacity-50"
                                    >
                                      <MoreVertical className="size-4" />
                                    </button>

                                    {menuOpen && (
                                      <div className={`absolute top-7 z-30 w-40 rounded-xl border border-border bg-background p-1 text-foreground shadow-lg ${
                                        mine ? "right-0" : "left-0"
                                      }`}>
                                        <button
                                          type="button"
                                          onClick={() => void deleteMessage(message.id, "me")}
                                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-muted"
                                        >
                                          <Trash2 className="size-3.5" />
                                          Benden Sil
                                        </button>

                                        {mine && !message.isDeletedForEveryone && (
                                          <button
                                            type="button"
                                            onClick={() => void deleteMessage(message.id, "everyone")}
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="size-3.5" />
                                            Herkesten Sil
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div
                                  className={`mt-1 text-right text-[10px] ${
                                    mine
                                      ? "text-orange-100"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {formatMessageTime(message.createdAtUtc)}
                                  {mine && message.readAtUtc
                                    ? " · Okundu"
                                    : ""}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  <form
                    onSubmit={sendMessage}
                    className="border-t border-border bg-background p-3 md:p-4"
                  >
                    {error && (
                      <div className="mx-auto mb-2 max-w-3xl text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    <div className="mx-auto flex max-w-3xl items-end gap-2">
                      <textarea
                        value={messageBody}
                        onChange={(event) =>
                          setMessageBody(event.target.value)
                        }
                        maxLength={4000}
                        rows={1}
                        placeholder="Mesajınızı yazın..."
                        className="min-h-11 max-h-32 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-orange-500"
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.shiftKey
                          ) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                      />

                      <button
                        type="submit"
                        disabled={!messageBody.trim() || sending}
                        className="grid size-11 shrink-0 place-items-center rounded-full bg-orange-500 text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Mesaj gönder"
                      >
                        <Send className="size-5" />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  {error || "Konuşma görüntülenemedi."}
                </div>
              )}
            </section>
              ) : (
                <div className="flex h-[600px] flex-col items-center justify-center px-6 text-center lg:h-[min(72vh,760px)]">
                  <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-orange-50 text-orange-500">
                    <MessageCircle className="size-8" />
                  </div>
                  <h2 className="text-lg font-semibold">Mesajlarınız</h2>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Mesajlaşmaya devam etmek için soldaki konuşmalardan birini seçin.
                  </p>
                </div>
              )}
            </div>
          </div>
    </div>
  );
}
