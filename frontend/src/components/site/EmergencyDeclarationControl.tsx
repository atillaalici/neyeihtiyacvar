"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export function EmergencyDeclarationControl() {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/api/provider-panel/me/emergency-declaration`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }, signal: controller.signal, cache: "no-store",
    }).then(async response => {
      if (!response.ok) throw new Error("request failed");
      const data = await response.json() as { confirmed: boolean };
      if (!controller.signal.aborted) setConfirmed(data.confirmed);
    }).catch(() => {
      if (!controller.signal.aborted) setMessage("7/24 beyanı yüklenemedi. Sayfayı yenileyin.");
    });
    return () => controller.abort();
  }, []);
  async function update(next: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/provider-panel/me/emergency-declaration`, {
        method: next ? "PUT" : "DELETE",
        headers: { Authorization: `Bearer ${getAccessToken()}`, "Content-Type": "application/json" },
        ...(next ? { body: JSON.stringify({ confirmed: true }) } : {}),
      });
      if (!response.ok) throw new Error("request failed");
      setConfirmed(next);
      setMessage(next ? "7/24 hizmet beyanınız onaylandı." : "7/24 hizmet beyanınız geri çekildi.");
    } catch { setMessage("Beyan kaydedilemedi. Tekrar deneyin."); }
    finally { setBusy(false); }
  }
  return <section className="my-6 rounded-2xl border border-red-100 bg-red-50/50 p-5" aria-label="7/24 hizmet beyanı">
    <label className="flex items-center gap-3 font-semibold">
      <input type="checkbox" checked={confirmed === true} disabled={confirmed === null || busy} onChange={e => { void update(e.target.checked); }} aria-describedby="emergency-declaration-description" />
      7/24 Acil Hizmet Veriyorum
    </label>
    <p id="emergency-declaration-description" className="mt-2 text-sm text-muted-foreground">Bu seçeneği işaretleyerek haftanın her günü, günün 24 saati acil hizmet verdiğinizi beyan ve onaylarsınız. Aktif ve yayındaki işletmeniz 7/24 Acil Hizmetler alanında listelenebilir. İşareti kaldırarak beyanınızı istediğiniz zaman geri çekebilirsiniz.</p>
    <p role="status" className="mt-2 text-sm">{busy ? "Kaydediliyor…" : message}</p>
  </section>;
}
