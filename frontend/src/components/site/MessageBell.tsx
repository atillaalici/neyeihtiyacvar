"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { MessageCircle } from "lucide-react";

import { apiBaseUrl } from "@/lib/api";
import { getAccessToken, getStoredUser } from "@/lib/auth";

type ConversationItem = {
  id: string;
  conversationType?: "storefront" | "need";
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

export function MessageBell() {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const loadUnreadCount = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/messages/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) return;

      const data = (await response.json()) as {
        unreadCount?: number;
      };

      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Sayaç hatası navbar kullanımını engellememeli.
    }
  }, []);

  const loadConversations = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      setConversations([]);
      return;
    }

    setLoading(true);

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

      if (!storefrontResponse.ok || !needResponse.ok) {
        return;
      }

      const storefront =
        (await storefrontResponse.json()) as ConversationItem[];

      const needs =
        (await needResponse.json()) as ConversationItem[];

      const combined: ConversationItem[] = [
        ...storefront.map((item) => ({
          ...item,
          conversationType: "storefront" as const,
        })),
        ...needs.map((item) => ({
          ...item,
          conversationType: "need" as const,
        })),
      ];

      combined.sort(
        (a, b) =>
          new Date(b.lastMessageAtUtc ?? b.createdAtUtc).getTime() -
          new Date(a.lastMessageAtUtc ?? a.createdAtUtc).getTime(),
      );

      setConversations(combined);
    } catch {
      // Mesaj menüsü hatası sayfanın çalışmasını engellememeli.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUnreadCount();
    }, 0);

    function handleAuthChanged() {
      void loadUnreadCount();
    }

    function handleMessagesChanged() {
      void loadUnreadCount();

      if (open) {
        void loadConversations();
      }
    }

    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("messages-changed", handleMessagesChanged);

    const poller = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      void loadUnreadCount();

      if (open) {
        void loadConversations();
      }
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poller);
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("messages-changed", handleMessagesChanged);
    };
  }, [loadUnreadCount, loadConversations, open]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !panelRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);

    if (next) {
      await Promise.all([
        loadConversations(),
        loadUnreadCount(),
      ]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        className="relative grid size-10 place-items-center rounded-full transition-colors hover:bg-accent"
        aria-label="Mesajlar"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Mesajlar"
      >
        <MessageCircle className="size-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        mobile
          ? createPortal(
              <div
                ref={panelRef}
                className="fixed inset-x-3 top-20 z-[200] mx-auto max-h-[calc(100dvh-6rem)] w-auto max-w-[22rem] overflow-y-auto rounded-2xl border border-border bg-background shadow-xl"
              >
                <div className="flex justify-end border-b border-border p-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-1 text-sm hover:bg-muted"
                  >
                    Kapat
                  </button>
                </div>
                {renderPanelContent()}
              </div>,
              document.body
            )
          : (
            <div className="absolute right-0 top-full z-[110] mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
              {renderPanelContent()}
            </div>
          )
      )}
    </div>
  );

  function renderPanelContent() {
    return (
      <>
          <div className="border-b border-border px-4 py-3">
            <div className="font-semibold">Mesajlar</div>
            <div className="text-xs text-muted-foreground">
              Son konuşmalarınız
            </div>
          </div>

          <div className="max-h-[25rem] overflow-y-auto p-2">
            {loading && conversations.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Mesajlar yükleniyor...
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <MessageCircle className="mx-auto mb-2 size-7 text-muted-foreground" />
                <div className="text-sm font-medium">
                  Henüz mesajınız yok
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  İşletme vitrininden mesajlaşma başlatabilirsiniz.
                </div>
              </div>
            ) : (
              conversations.slice(0, 5).map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`${
                    getStoredUser()?.id === conversation.customerUserId
                      ? "/mesajlarim"
                      : "/panel/mesajlarim"
                  }?conversation=${conversation.id}`}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">
                    {(getStoredUser()?.id === conversation.customerUserId
                      ? conversation.businessName
                      : conversation.customerName || "Müşteri")
                      .trim()
                      .charAt(0)
                      .toLocaleUpperCase("tr-TR") || "İ"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold">
                        {getStoredUser()?.id === conversation.customerUserId
                          ? conversation.businessName
                          : conversation.customerName || "Müşteri"}
                      </div>

                      {conversation.unreadCount > 0 && (
                        <span className="grid min-h-5 min-w-5 shrink-0 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                          {conversation.unreadCount > 99
                            ? "99+"
                            : conversation.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {conversation.lastMessage?.body ??
                        "Henüz mesaj gönderilmedi."}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="border-t border-border p-2">
            <Link
              href="/mesajlarim"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-orange-600 transition-colors hover:bg-muted"
            >
              Tüm mesajları göster
            </Link>
          </div>
      </>
    );
  }
}
