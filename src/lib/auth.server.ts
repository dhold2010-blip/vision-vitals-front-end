import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import type { AuthUser } from "./auth";

type BackendEnvelope<T> = {
  data: T;
  error?: { code?: string; message?: string };
};

type BackendUser = {
  id: string;
  email: string;
  role: AuthUser["role"];
  is_active: boolean;
  created_at: string;
};

type BackendTokens = {
  access_token: string;
  refresh_token: string;
};

type AuthResponse = {
  user: BackendUser;
  tokens: BackendTokens;
};

const accessCookie = "vv_access";
const refreshCookie = "vv_refresh";

function backendUrl(): string {
  const value = process.env["VISION_VITALS_BACKEND_URL"];
  if (!value?.trim()) throw new Error("Authentication service is not configured.");
  return value.trim().replace(/\/$/, "");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict" as const,
    path: "/",
  };
}

function storeTokens(tokens: BackendTokens): void {
  const options = cookieOptions();
  setCookie(accessCookie, tokens.access_token, options);
  setCookie(refreshCookie, tokens.refresh_token, options);
}

function clearTokens(): void {
  const options = cookieOptions();
  deleteCookie(accessCookie, options);
  deleteCookie(refreshCookie, options);
}

function safeAuthError(status: number, payload: unknown): Error {
  if (status === 401) return new Error("Email or password is incorrect.");
  if (status === 409) return new Error("An account with this email already exists.");
  if (status === 429) return new Error("Too many attempts. Please wait and try again.");
  const code = (payload as BackendEnvelope<unknown> | null)?.error?.code;
  if (code === "VALIDATION_ERROR")
    return new Error("Please check the account details and try again.");
  return new Error("Authentication could not be completed. Please try again.");
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ response: Response; payload: BackendEnvelope<T> | null }> {
  const response = await fetch(`${backendUrl()}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as BackendEnvelope<T> | null;
  return { response, payload };
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getCookie(refreshCookie);
  if (!refreshToken) return null;

  const { response, payload } = await requestJson<{ tokens: BackendTokens }>(
    "/api/v1/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );
  if (!response.ok || !payload?.data?.tokens?.access_token) {
    clearTokens();
    return null;
  }
  storeTokens(payload.data.tokens);
  return payload.data.tokens.access_token;
}

async function currentSession(): Promise<{ user: AuthUser; accessToken: string } | null> {
  const accessToken = getCookie(accessCookie);
  if (!accessToken && !getCookie(refreshCookie)) return null;

  const checkUser = async (token: string) =>
    requestJson<{ user: BackendUser }>("/api/v1/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

  let token = accessToken;
  if (!token) token = (await refreshAccessToken()) ?? "";
  if (!token) return null;

  let result = await checkUser(token);
  if (result.response.status === 401) {
    token = (await refreshAccessToken()) ?? "";
    if (!token) {
      clearTokens();
      return null;
    }
    result = await checkUser(token);
  }
  if (!result.response.ok || !result.payload?.data?.user) {
    if (result.response.status === 401) clearTokens();
    if (result.response.status >= 500) {
      throw new Error("Authentication service is temporarily unavailable.");
    }
    return null;
  }

  const user = result.payload.data.user;
  return { user: { id: user.id, email: user.email, role: user.role }, accessToken: token };
}

export async function requireUserAccessToken(): Promise<string> {
  const session = await currentSession();
  if (!session) throw new Error("Please sign in before starting a scan.");
  return session.accessToken;
}

export async function register(data: { email: string; password: string }): Promise<AuthUser> {
  const { response, payload } = await requestJson<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok || !payload?.data?.tokens) throw safeAuthError(response.status, payload);
  storeTokens(payload.data.tokens);
  const { id, email, role } = payload.data.user;
  return { id, email, role };
}

export async function login(data: { email: string; password: string }): Promise<AuthUser> {
  const { response, payload } = await requestJson<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok || !payload?.data?.tokens) throw safeAuthError(response.status, payload);
  storeTokens(payload.data.tokens);
  const { id, email, role } = payload.data.user;
  return { id, email, role };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return (await currentSession())?.user ?? null;
}

export async function logout(): Promise<{ loggedOut: true }> {
  try {
    const session = await currentSession();
    if (session) {
      await requestJson("/api/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    }
  } finally {
    clearTokens();
  }
  return { loggedOut: true };
}
