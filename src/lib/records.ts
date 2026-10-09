import { createServerFn } from "@tanstack/react-start";
import { requireUserAccessToken } from "@/lib/auth";

export type AnalysisRecord = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  result: {
    provider: string;
    model: string;
    observation: string;
    result_status: "OBSERVATION" | "ESTIMATION" | "UNAVAILABLE" | "WARNING";
    confidence: number | null;
    warnings: string[];
    limitations: string[];
    request_id: string;
  } | null;
};

type Envelope<T> = { success: boolean; data: T; request_id?: string };

function backendUrl() {
  const value = process.env.VISION_VITALS_BACKEND_URL;
  if (!value?.trim()) throw new Error("VisionVitals backend is not configured.");
  return value.trim().replace(/\/$/, "");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await requireUserAccessToken();
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
    if (response.status === 401) throw new Error("Your session expired. Please sign in again.");
    if (response.status === 404) throw new Error("That record could not be found.");
    if (response.status >= 500) throw new Error("VisionVitals is temporarily unavailable. Please try again.");
    throw new Error(
      ("error" in (payload ?? {}) && payload?.error?.message) ||
        ("detail" in (payload ?? {}) && payload?.detail) ||
        "VisionVitals could not complete that request.",
    );
  }
  if (!payload || !("data" in payload)) throw new Error("VisionVitals returned an invalid response.");
  return payload.data;
}

export const listAnalyses = createServerFn({ method: "GET" })
  .handler(async () => request<AnalysisRecord[]>("/api/v1/analyses?limit=100&offset=0"));

export const deleteAnalysis = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null || !("id" in data) || typeof data.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.id)) {
      throw new Error("Select a valid scan to delete.");
    }
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    await request<{ deleted: boolean }>(`/api/v1/analyses/${encodeURIComponent(data.id)}`, { method: "DELETE" });
    return { deleted: true };
  });

export type MyProfile = {
  user: { id: string; email: string; role: "USER" | "ADMIN"; is_active: boolean; created_at: string };
  profile: { display_name: string | null; timezone: string | null };
};

export const getMyProfile = createServerFn({ method: "GET" })
  .handler(async () => request<MyProfile>("/api/v1/users/me"));

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null) throw new Error("Enter valid profile details.");
    const input = data as { display_name?: unknown; timezone?: unknown };
    if (input.display_name !== undefined && input.display_name !== null && (typeof input.display_name !== "string" || input.display_name.length > 120)) {
      throw new Error("Display name must be 120 characters or fewer.");
    }
    if (input.timezone !== undefined && input.timezone !== null && (typeof input.timezone !== "string" || input.timezone.length > 64)) {
      throw new Error("Timezone must be 64 characters or fewer.");
    }
    return {
      display_name: (input.display_name as string | null | undefined) ?? null,
      timezone: (input.timezone as string | null | undefined) ?? null,
    };
  })
  .handler(async ({ data }) => request<MyProfile["profile"]>("/api/v1/users/me/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  }));
