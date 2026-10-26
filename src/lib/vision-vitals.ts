import { createServerFn } from "@tanstack/react-start";
import { requireUserAccessToken } from "@/lib/auth";


export type VisionCaptureResult = {
  capture: {
    id: string;
    device_id: string;
    analysis_id: string | null;
    capture_type: string;
    status: string;
    capture_metadata: Record<string, unknown>;
    created_at: string;
    completed_at: string | null;
  };
  analysis: {
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
  } | null;
  duplicate: boolean;
};

type ServerFunctionError = {
  code?: string;
  message?: string;
};

type BackendErrorPayload = {
  data?: ServerFunctionError;
  detail?: ServerFunctionError;
  message?: string;
};

function getRequiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`VisionVitals server configuration is missing: ${name}`);
  }
  return value.trim();
}

function getSafeError(response: Response, payload: unknown): Error {
  const backendError =
    (payload as BackendErrorPayload)?.data ?? (payload as BackendErrorPayload)?.detail;
  const code = backendError?.code;

  if (code === "RECAPTURE_REQUIRED") {
    return new Error("The scan requires another capture. Please retry the scan.");
  }
  if (code === "AUTHENTICATION_FAILED" || response.status >= 401) {
    return new Error("VisionVitals device authentication failed. Please retry later.");
  }
  if (response.status >= 500) {
    return new Error("The VisionVitals analysis service is temporarily unavailable.");
  }
  if (response.status >= 400) {
    return new Error("The backend rejected this scan. Please verify the camera image and retry.");
  }

  return new Error("VisionVitals could not complete the scan. Please try again.");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const name =
      typeof error === "object" && error !== null && "name" in error
        ? String(error.name)
        : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error("VisionVitals took too long to respond. Please try again.");
    }
    throw new Error("VisionVitals could not be reached. Check your connection and try again.");
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { message: await response.text() };
  }
  return response.json();
}

export const captureVision = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("The scan image was not provided in a valid request.");
    }
    const image = data.get("image");
    if (!(image instanceof File) || image.size === 0 || image.size > 10 * 1024 * 1024) {
      throw new Error("The scan image is missing, empty, or exceeds the 10 MB upload limit.");
    }
    return data;
  })
  .handler<VisionCaptureResult>(async ({ data }) => {
    const userAccessToken = await requireUserAccessToken();
    const backendUrl = getRequiredEnvironment("VISION_VITALS_BACKEND_URL");
    const { deviceId, deviceSecret: deviceCredential } = await (await import("./devices.server")).getRegisteredBrowserDevice();
    const baseUrl = backendUrl.replace(/\/$/, "");

    const authenticationUrl = `${baseUrl}/api/v1/devices/${encodeURIComponent(deviceId)}/authenticate`;
    const authResponse = await fetchWithTimeout(authenticationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_secret: deviceCredential }),
    }, 15_000);
    const authPayload = await parseJsonResponse(authResponse);
    if (!authResponse.ok) {
      throw getSafeError(authResponse, authPayload);
    }

    const sessionToken = (authPayload as { data?: { device_session_token?: string } }).data
      ?.device_session_token;
    if (!sessionToken) {
      throw new Error("VisionVitals authentication returned no device session.");
    }

    const captureUrl = `${baseUrl}/api/v1/devices/${encodeURIComponent(deviceId)}/capture`;
    const formData = new FormData();
    formData.append("image", data.get("image") as File, "vision-vitals-camera.jpg");
    formData.append("capture_type", "APP_CAMERA");
    formData.append(
      "capture_metadata",
      JSON.stringify({
        image_source: "APP_CAMERA",
        camera_type: "FRONTEND_CAMERA",
      }),
    );
    const captureResponse = await fetchWithTimeout(captureUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        "X-Device-Session": sessionToken,
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: formData,
    }, 90_000);
    const capturePayload = await parseJsonResponse(captureResponse);
    if (!captureResponse.ok) {
      throw getSafeError(captureResponse, capturePayload);
    }

    const envelope = capturePayload as { data?: unknown };
    if (!envelope.data || typeof envelope.data !== "object") {
      throw new Error("VisionVitals returned an invalid response.");
    }
    return envelope.data as VisionCaptureResult;
  });
