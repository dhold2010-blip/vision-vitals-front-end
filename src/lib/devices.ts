import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { requireUserAccessToken } from "@/lib/auth";

const deviceCookie = "vv_web_device";

type Envelope<T> = { success: boolean; data: T };
type DeviceCredential = { userId: string; deviceId: string; deviceSecret: string };
type DeviceEnvelope = {
  id: string;
  device_identifier: string;
  device_name: string;
  device_type: string;
  status: string;
  firmware_version: string | null;
  software_version: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeviceRecord = DeviceEnvelope;

function backendUrl() {
  const value = process.env.VISION_VITALS_BACKEND_URL;
  if (!value?.trim()) throw new Error("VisionVitals backend is not configured.");
  return value.trim().replace(/\/$/, "");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

async function backendRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${backendUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | Envelope<T>
    | { error?: { message?: string }; detail?: string }
    | null;
  if (!response.ok) {
    const errorPayload = payload as { error?: { message?: string }; detail?: string } | null;
    if (response.status === 401) throw new Error("Your session expired. Please sign in again.");
    if (response.status >= 500) throw new Error("VisionVitals is temporarily unavailable.");
    throw new Error(errorPayload?.error?.message || errorPayload?.detail || "The device request could not be completed.");
  }
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("VisionVitals returned an invalid device response.");
  }
  return (payload as Envelope<T>).data;
}

async function getUserId(token: string): Promise<string> {
  const data = await backendRequest<{ user: { id: string } }>("/api/v1/users/me", token);
  if (!data.user?.id) throw new Error("Your account could not be verified.");
  return data.user.id;
}

function readCookie(): DeviceCredential | null {
  const raw = getCookie(deviceCookie);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DeviceCredential>;
    if (
      typeof parsed.userId === "string" &&
      typeof parsed.deviceId === "string" &&
      typeof parsed.deviceSecret === "string"
    ) {
      return parsed as DeviceCredential;
    }
  } catch {
    // Invalid or old cookie: it will be replaced after explicit registration.
  }
  return null;
}

export const listMyDevices = createServerFn({ method: "GET" }).handler(async () => {
  const token = await requireUserAccessToken();
  return backendRequest<DeviceRecord[]>("/api/v1/devices", token);
});

export const registerBrowserDevice = createServerFn({ method: "POST" }).handler(async () => {
  const token = await requireUserAccessToken();
  const userId = await getUserId(token);
  const existing = readCookie();

  if (existing?.userId === userId) {
    const devices = await backendRequest<DeviceRecord[]>("/api/v1/devices", token);
    const existingDevice = devices.find((device) => device.id === existing.deviceId);
    if (existingDevice && existingDevice.status !== "REVOKED" && existingDevice.status !== "ERROR") {
      return { device: existingDevice, alreadyRegistered: true };
    }
  }
  deleteCookie(deviceCookie, cookieOptions());

  const registered = await backendRequest<DeviceRecord & { device_secret: string }>(
    "/api/v1/devices/register",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        device_identifier: `vision-vitals-web-${crypto.randomUUID()}`,
        device_name: "VisionVitals web scanner",
        device_type: "VISION_VITALS_CAMERA",
        software_version: "web-1.0.0",
      }),
    },
  );

  setCookie(
    deviceCookie,
    JSON.stringify({
      userId,
      deviceId: registered.id,
      deviceSecret: registered.device_secret,
    } satisfies DeviceCredential),
    cookieOptions(),
  );

  const { device_secret: _secret, ...device } = registered;
  return { device, alreadyRegistered: false };
});

export const revokeMyDevice = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null || !("id" in data) || typeof data.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.id)) {
      throw new Error("Select a valid device.");
    }
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const token = await requireUserAccessToken();
    await backendRequest<{ revoked: boolean }>(`/api/v1/devices/${encodeURIComponent(data.id)}`, token, { method: "DELETE" });
    const registered = readCookie();
    if (registered?.deviceId === data.id) deleteCookie(deviceCookie, cookieOptions());
    return { revoked: true };
  });

export const getRegisteredBrowserDevice = createServerOnlyFn(async () => {
  const token = await requireUserAccessToken();
  const userId = await getUserId(token);
  const registered = readCookie();
  if (!registered || registered.userId !== userId) {
    throw new Error("This browser is not registered yet. Open Settings and register this device before scanning.");
  }
  const devices = await backendRequest<DeviceRecord[]>("/api/v1/devices", token);
  const device = devices.find((item) => item.id === registered.deviceId);
  if (!device || device.status === "REVOKED" || device.status === "ERROR") {
    deleteCookie(deviceCookie, cookieOptions());
    throw new Error("This browser's scan access has been revoked. Register it again in Settings if you want to continue.");
  }
  return { deviceId: registered.deviceId, deviceSecret: registered.deviceSecret };
});
