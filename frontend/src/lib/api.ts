const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

export const apiBaseUrl =
  configuredApiBaseUrl ??
  (process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:5155");