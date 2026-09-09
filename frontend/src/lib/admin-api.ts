import { getAccessToken } from "@/lib/auth";

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}