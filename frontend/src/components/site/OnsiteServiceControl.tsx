"use client";

import { useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type Props = {
  initialValue: boolean;
  onSaved: (value: boolean) => void;
};

export function OnsiteServiceControl({ initialValue, onSaved }: Props) {
  const [enabled, setEnabled] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function update(next: boolean) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/me/onsite-service`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled: next }),
        }
      );

      if (!response.ok) {
        throw new Error("Kayıt başarısız.");
      }

      setEnabled(next);
      onSaved(next);
      setMessage(
        next
          ? "Yerinde hizmet tercihiniz kaydedildi."
          : "Yerinde hizmet tercihiniz kaldırıldı."
      );
    } catch {
      setMessage("Tercih kaydedilemedi. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-muted/20 p-5">
      <label className="flex items-center gap-3 font-semibold">
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(event) => void update(event.target.checked)}
        />
        Yerinde Hizmet Veriyorum
      </label>

      <p className="mt-2 text-sm text-muted-foreground">
        Müşterinin adresine giderek hizmet verebildiğinizi belirtir.
        Bu tercihi istediğiniz zaman değiştirebilirsiniz.
      </p>

      <p role="status" className="mt-2 text-sm">
        {busy ? "Kaydediliyor…" : message}
      </p>
    </section>
  );
}
