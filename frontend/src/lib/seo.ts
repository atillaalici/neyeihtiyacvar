export const siteUrl = "https://neyeihtiyacvar.com";

export const serverApiBaseUrl =
  process.env.INTERNAL_API_BASE_URL?.replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://127.0.0.1:5155";

export function slugToTitle(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) =>
      part.length > 0
        ? part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1)
        : part,
    )
    .join(" ");
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}