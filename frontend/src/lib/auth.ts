export type AuthUser = {
  id: string;
  email: string;
  phoneNumber: string | null;
  displayName: string;
  role: "user" | "provider" | "admin";
  emailVerified: boolean;
  phoneVerified: boolean;
};

export type AuthResponse = {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthUser;
};

const tokenKey = "neyeihtiyacvar.accessToken";
const userKey = "neyeihtiyacvar.user";
const expiresKey = "neyeihtiyacvar.expiresAtUtc";

export function saveAuth(response: AuthResponse) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(tokenKey, response.accessToken);
  localStorage.setItem(userKey, JSON.stringify(response.user));
  localStorage.setItem(expiresKey, response.expiresAtUtc);

  window.dispatchEvent(new Event("auth-changed"));
}

export function clearAuth() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  localStorage.removeItem(expiresKey);

  window.dispatchEvent(new Event("auth-changed"));
}

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem(tokenKey);
  const expiresAtUtc = localStorage.getItem(expiresKey);

  if (!token || !expiresAtUtc) {
    return null;
  }

  if (new Date(expiresAtUtc).getTime() <= Date.now()) {
    clearAuth();
    return null;
  }

  return token;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(userKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearAuth();
    return null;
  }
}