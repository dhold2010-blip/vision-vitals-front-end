import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { requireUserAccessToken } from "@/lib/auth";
import { getBackendErrorMessage } from "@/lib/backend-error";

const deviceCookie = "vv_web_device";

type Envelope<T> = { success: boolean; data: T };
type DeviceCredential = { userId: string; deviceId: string; deviceSecret: string };

export type DeviceRecord = {
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
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session expired. Please sign in again.");
    if (response.status >= 500) throw new Error("VisionVitals is temporarily unavailable.");
    throw new Error(getBackendErrorMessage(payload, "The device request could not be completed."));
  }
  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
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
    // Invalid or old cookie: replace it after explicit registration.
  }
  return null;
}

export async function listMyDevices(): Promise<DeviceRecord[]> {
  const token = await requireUserAccessToken();
  return backendRequest<DeviceRecord[]>("/api/v1/devices", token);
}

export async function registerBrowserDevice() {
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
}

export async function revokeMyDevice(id: string) {
  const token = await requireUserAccessToken();
  await backendRequest<{ revoked: boolean }>(`/api/v1/devices/${encodeURIComponent(id)}`, token, { method: "DELETE" });
  const registered = readCookie();
  if (registered?.deviceId === id) deleteCookie(deviceCookie, cookieOptions());
  return { revoked: true };
}

export async function getRegisteredBrowserDevice() {
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
}
