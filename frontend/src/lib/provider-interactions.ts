import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export type ProviderInteractionChannel =
  | "phone"
  | "whatsapp"
  | "email"
  | "offer";

export type ProviderInteractionSource =
  | "profile"
  | "search_results"
  | "need"
  | "unknown";

type TrackProviderInteractionInput = {
  providerSlug: string;
  channel: ProviderInteractionChannel;
  source?: ProviderInteractionSource;
};

export async function trackProviderInteraction({
  providerSlug,
  channel,
  source = "unknown",
}: TrackProviderInteractionInput) {
  const token = getAccessToken();

  if (!token || !providerSlug) {
    return;
  }

  try {
    await fetch(`${apiBaseUrl}/api/provider-interactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerSlug,
        channel,
        source,
      }),
      keepalive: true,
    });
  } catch {
    // İletişim kaydı başarısız olsa bile kullanıcının
    // telefon/WhatsApp işlemini engelleme.
  }
}
