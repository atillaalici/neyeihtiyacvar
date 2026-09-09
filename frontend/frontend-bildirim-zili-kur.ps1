$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"

function Write-Utf8NoBom([string]$path, [string]$content) {
    $dir = [System.IO.Path]::GetDirectoryName($path)
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    [System.IO.File]::WriteAllText(
        $path,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

$bell = @'
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
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    function handleAuthChanged() {
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
'@

Write-Utf8NoBom "$root\src\components\site\NotificationBell.tsx" $bell

$authPath = Join-Path $root "src\components\site\AuthMenu.tsx"
if (-not (Test-Path $authPath)) {
    throw "AuthMenu bulunamadi: $authPath"
}

$auth = Get-Content -Raw -Encoding UTF8 $authPath

if ($auth -notmatch 'NotificationBell') {
    $importAnchor = 'import { useRouter } from "next/navigation";'
    if (-not $auth.Contains($importAnchor)) {
        throw "AuthMenu icinde useRouter importu bulunamadi."
    }

    $auth = $auth.Replace(
        $importAnchor,
        $importAnchor + "`r`n" +
        'import { NotificationBell } from "@/components/site/NotificationBell";'
    )
}

if ($auth -notmatch '<NotificationBell />') {
    $userBlockAnchor = @'
      <div className="flex items-center gap-2">
        <Link
          href="/hesabim"
'@

    $userBlockReplacement = @'
      <div className="flex items-center gap-2">
        <NotificationBell />

        <Link
          href="/hesabim"
'@

    if (-not $auth.Contains($userBlockAnchor)) {
        throw "AuthMenu kullanici blogu bulunamadi."
    }

    $auth = $auth.Replace(
        $userBlockAnchor,
        $userBlockReplacement
    )
}

Write-Utf8NoBom $authPath $auth

Write-Host ""
Write-Host "Frontend bildirim zili hazirlandi." -ForegroundColor Green
Write-Host ""
Write-Host "Eklenenler:" -ForegroundColor Cyan
Write-Host "  Navbar bildirim zili"
Write-Host "  Okunmamis bildirim sayaci"
Write-Host "  Bildirim acilir listesi"
Write-Host "  Bildirime tiklayinca ilgili sayfaya gitme"
Write-Host "  Tek bildirimi okundu isaretleme"
Write-Host "  Tumunu Oku"
Write-Host "  30 saniyede bir otomatik yenileme"
Write-Host ""
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Yellow
