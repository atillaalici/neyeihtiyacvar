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

export default function MessagesClient() {
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
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      router.replace(
        `/giris?returnUrl=${encodeURIComponent("/mesajlarim")}`,
      );
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/messages/conversations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Konuşmalar yüklenemedi.");
      }

      const data = (await response.json()) as ConversationItem[];
      setConversations(data);

      setSelectedId((current) => {
        if (current && data.some((item) => item.id === current)) {
          return current;
        }

        if (requestedConversationId) {
          const requested = data.find(
            (item) => item.id === requestedConversationId,
          );

          if (requested) return requested.id;
        }

        return data[0]?.id ?? null;
      });
    } catch {
      setError("Mesajlar yüklenirken bir sorun oluştu.");
    } finally {
      setLoadingConversations(false);
    }
  }, [requestedConversationId, router]);

  const loadConversation = useCallback(async (conversationId: string) => {
    const token = getAccessToken();
    if (!token) return;

    setLoadingMessages(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/messages/conversations/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Konuşma yüklenemedi.");
      }

      const data = (await response.json()) as ConversationDetail;
      setDetail(data);

      await fetch(
        `${apiBaseUrl}/api/messages/conversations/${conversationId}/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setConversations((current) =>
        current.map((item) =>
          item.id === conversationId
            ? { ...item, unreadCount: 0 }
            : item,
        ),
      );

      window.dispatchEvent(new Event("messages-changed"));
    } catch {
      setError("Konuşma yüklenirken bir sorun oluştu.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

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
        const [conversationResponse, conversationsResponse] =
          await Promise.all([
            fetch(
              `${apiBaseUrl}/api/messages/conversations/${selectedId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
              },
            ),
            fetch(
              `${apiBaseUrl}/api/messages/conversations`,
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
            `${apiBaseUrl}/api/messages/conversations/${selectedId}/read`,
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
  }, [selectedId]);

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
    router.replace(`/mesajlarim?${params.toString()}`, {
      scroll: false,
    });
  }

  function backToList() {
    setSelectedId(null);
    setDetail(null);
    router.replace("/mesajlarim", { scroll: false });
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = messageBody.trim();

    if (!body || !selectedId || sending) return;

    const token = getAccessToken();

    if (!token) {
      router.push(
        `/giris?returnUrl=${encodeURIComponent("/mesajlarim")}`,
      );
      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/messages/conversations/${selectedId}`,
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

  const phone = digits(detail?.conversation.publicPhone);
  const whatsapp = digits(
    detail?.conversation.publicWhatsapp ||
      detail?.conversation.publicPhone,
  );

  return (
    <SiteLayout>
      <main className="bg-muted/20 py-4 md:py-8">
        <div className="section-shell">
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight">
              Mesajlarım
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              İşletmelerle yaptığınız görüşmeleri buradan takip edebilirsiniz.
            </p>
          </div>

          <div className="grid min-h-[70vh] overflow-hidden rounded-2xl border border-border bg-background shadow-sm md:grid-cols-[22rem_minmax(0,1fr)]">
            <aside
              className={`border-r border-border ${
                selectedId ? "hidden md:block" : "block"
              }`}
            >
              <div className="border-b border-border px-4 py-4">
                <div className="font-semibold">Konuşmalar</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {conversations.length} görüşme
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-2">
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
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => selectConversation(conversation.id)}
                        className={`flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                          active
                            ? "bg-orange-50"
                            : "hover:bg-muted"
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
                    );
                  })
                )}
              </div>
            </aside>

            <section
              className={`min-w-0 ${
                selectedId ? "flex" : "hidden md:flex"
              } flex-col`}
            >
              {!selectedId ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <div>
                    <MessageCircle className="mx-auto mb-4 size-12 text-muted-foreground" />
                    <div className="text-lg font-semibold">
                      Bir konuşma seçin
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Mesajları görüntülemek için soldaki konuşmalardan
                      birini seçin.
                    </p>
                  </div>
                </div>
              ) : loadingMessages && !detail ? (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Konuşma yükleniyor...
                </div>
              ) : detail ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-3 md:px-5">
                    <button
                      type="button"
                      onClick={backToList}
                      className="grid size-9 place-items-center rounded-full hover:bg-muted md:hidden"
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

                  <div className="flex-1 overflow-y-auto bg-muted/20 px-3 py-5 md:px-6">
                    <div className="mx-auto flex max-w-3xl flex-col gap-2">
                      {detail.messages.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">
                          Henüz mesaj yok. İlk mesajı siz gönderin.
                        </div>
                      ) : (
                        detail.messages.map((message) => {
                          const mine = message.senderUserId === user?.id;

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
                                <div className="whitespace-pre-wrap break-words text-sm">
                                  {message.body}
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
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}
