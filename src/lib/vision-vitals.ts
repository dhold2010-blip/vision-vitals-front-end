import { createServerFn } from "@tanstack/react-start";
import { requireUserAccessToken } from "@/lib/auth";

export type VisionAnalysis = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  result: {
    provider: string;
    model: string;
    observation: string;
    result_status: string;
    confidence: number | null;
    warnings: string[];
    limitations: string[];
    request_id: string;
  } | null;
};

export type VisionCaptureResult = {
  id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  result?: VisionAnalysis["result"];
  capture?: {
    id: string;
    device_id: string;
    analysis_id: string | null;
    capture_type: string;
    status: string;
    capture_metadata: Record<string, unknown>;
    created_at: string;
    completed_at: string | null;
  };
  analysis?: VisionAnalysis | null;
  duplicate?: boolean;
};

export type MyProfile = {
  user: { id: string; email: string; role: "USER" | "ADMIN"; is_active: boolean; created_at: string };
  profile: { display_name: string | null; timezone: string | null };
};

type Envelope<T> = { success?: boolean; data?: T; error?: { code?: string; message?: string }; detail?: unknown };

function backendUrl(): string {
  const value = process.env.VISION_VITALS_BACKEND_URL;
  if (!value?.trim()) throw new Error("VisionVitals backend is not configured.");
  return value.trim().replace(/\/$/, "");
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return { message: await response.text() };
  return response.json();
}

function safeError(response: Response, payload: unknown): Error {
  const p = payload as Envelope<unknown> | null;
  const detail = p?.error?.message || (typeof p?.detail === "string" ? p.detail : "");
  if (response.status === 401) return new Error("Your session expired. Please sign in again.");
  if (response.status === 413) return new Error("The image is too large. Please choose a smaller image.");
  if (response.status === 422) return new Error(detail || "The image could not be validated. Try a clear, well-lit JPEG or PNG.");
  if (response.status >= 500) return new Error("The VisionVitals analysis service is temporarily unavailable.");
  return new Error(detail || "VisionVitals could not complete the request. Please try again.");
}

async function authenticatedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await requireUserAccessToken();
  const response = await fetch(`${backendUrl()}${path}`, {
    ...init,
    headers: {
      ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  const payload = (await parseJsonResponse(response)) as Envelope<T>;
  if (!response.ok || payload?.data === undefined) throw safeError(response, payload);
  return payload.data;
}

export const getMyProfile = createServerFn({ method: "GET" }).handler(async () =>
  authenticatedJson<MyProfile>("/api/v1/users/me"),
);

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null) throw new Error("Enter a valid profile name.");
    const display_name = "display_name" in data && typeof data.display_name === "string"
      ? data.display_name.trim()
      : "";
    const timezone = "timezone" in data && typeof data.timezone === "string"
      ? data.timezone.trim()
      : "";
    if (display_name.length > 120) throw new Error("Name must be 120 characters or fewer.");
    if (timezone.length > 64) throw new Error("Time zone must be 64 characters or fewer.");
    return { display_name, timezone };
  })
  .handler(async ({ data }) =>
    authenticatedJson<MyProfile["profile"]>("/api/v1/users/me/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  );

export const getMyAnalyses = createServerFn({ method: "GET" }).handler(async () =>
  authenticatedJson<VisionAnalysis[]>("/api/v1/analyses?limit=100&offset=0"),
);

export const deleteMyAnalysis = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null || !("id" in data) || typeof data.id !== "string" || !data.id.trim()) {
      throw new Error("A valid scan ID is required.");
    }
    return { id: data.id };
  })
  .handler(async ({ data }) =>
    authenticatedJson<{ deleted: boolean }>(`/api/v1/analyses/${encodeURIComponent(data.id)}`, {
      method: "DELETE",
    }),
  );

export const captureVision = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("The scan image was not provided in a valid request.");
    const image = data.get("image");
    if (!(image instanceof File) || image.size === 0 || image.size > 20 * 1024 * 1024) {
      throw new Error("The scan image is missing, empty, or too large.");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const token = await requireUserAccessToken();
    const image = data.get("image") as File;
    const formData = new FormData();
    formData.append("image", image, image.name || "vision-vitals-camera.jpg");
    formData.append("source", "APP_CAMERA");
    const response = await fetch(`${backendUrl()}/api/v1/analyses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const payload = await parseJsonResponse(response) as Envelope<VisionAnalysis>;
    if (!response.ok || !payload?.data) throw safeError(response, payload);
    return { analysis: payload.data } satisfies VisionCaptureResult;
  });
