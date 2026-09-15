"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type NotificationItem = {
  id: string;
  eventType: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAtUtc: string;
  readAtUtc: string | null;
};

type NotificationResponse = {
  unreadCount: number;
  items: NotificationItem[];
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  async function loadNotifications() {
    const token = getAccessToken();
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${apiBaseUrl}/api/notifications?take=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) return;

      const data = (await response.json()) as NotificationResponse;
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications();
    }, 30000);

    function handleAuthChanged() {
      // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications();
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  async function markRead(item: NotificationItem) {
    if (item.isRead) {
      setOpen(false);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const response = await fetch(
      `${apiBaseUrl}/api/notifications/${item.id}/read`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.ok) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, isRead: true }
            : entry,
        ),
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    }

    setOpen(false);
  }

  async function markAllRead() {
    const token = getAccessToken();
    if (!token || unreadCount === 0) return;

    const response = await fetch(
      `${apiBaseUrl}/api/notifications/read-all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) return;

    setItems((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
      })),
    );

    setUnreadCount(0);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void loadNotifications();
        }}
        className="relative grid size-10 place-items-center rounded-md border border-input bg-background transition-colors hover:bg-accent"
        aria-label="Bildirimler"
      >
        <Bell className="size-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-5 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[80] w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="font-semibold">Bildirimler</div>
              <div className="text-xs text-muted-foreground">
                {unreadCount} okunmamış bildirim
              </div>
            </div>

            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary disabled:opacity-40"
            >
              <CheckCheck className="size-4" />
              Tümünü Oku
            </button>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-5 text-center text-sm text-muted-foreground">
                Bildirimler yükleniyor...
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Henüz bildirimin yok.
              </div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.link || "#"}
                  onClick={() => void markRead(item)}
                  className={`block border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50 ${
                    item.isRead ? "bg-background" : "bg-amber-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${
                        item.isRead ? "bg-transparent" : "bg-primary"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {item.title}
                      </div>

                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {item.message}
                      </p>

                      <div className="mt-2 text-xs text-muted-foreground">
                        {new Date(item.createdAtUtc).toLocaleString("tr-TR")}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}