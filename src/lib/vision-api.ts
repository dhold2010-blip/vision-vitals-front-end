export type VisualAssessment = {
  subject_visible: boolean;
  framing: string;
  lighting: string;
  posture: string;
  capture_tips: string[];
};

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
    visual_assessment?: VisualAssessment | null;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getScanError(response: Response, payload: unknown): Error {
  const envelope = isRecord(payload) ? payload : {};
  const error = isRecord(envelope["error"]) ? envelope["error"] : {};
  const code = error["code"];
  let message: string;
  if (response.status === 401) {
    message = "Your sign-in session expired. Please sign in again and retry the scan.";
  } else if (response.status === 403) {
    message = "Your account does not have permission to complete this scan.";
  } else if (response.status === 429) {
    message = "Too many scans. Please wait a minute before trying again.";
  } else if (response.status >= 500) {
    message = "The VisionVitals analysis service is temporarily unavailable. Please retry later.";
  } else if (response.status === 413 || code === "UPLOAD_TOO_LARGE") {
    message = "The camera image is too large. Please use a lower resolution and retry.";
  } else if (code === "IMAGE_RECAPTURE_REQUIRED") {
    message = "The image quality is insufficient. Please retake the photo and retry the scan.";
  } else if (response.status === 422 || code === "UPLOAD_INVALID") {
    message = "The scan image could not be accepted. Please retake the photo and retry.";
  } else {
    message = "The scan could not be completed. Please retry or contact support.";
  }

  // Include only a bounded correlation ID, never raw backend messages or credentials.
  const requestId = envelope["request_id"] ?? response.headers.get("X-Request-ID");
  if (typeof requestId === "string" && /^[A-Za-z0-9._:-]{1,64}$/.test(requestId)) {
    message += ` Reference: ${requestId}`;
  }
  return new Error(message);
}

export function validateScanImage(data: unknown): FormData {
  if (!(data instanceof FormData)) {
    throw new Error("The scan image was not provided in a valid request.");
  }
  const image = data.get("image");
  if (!(image instanceof File) || image.size === 0) {
    throw new Error("The camera image is missing or empty. Please retry the scan.");
  }
  if (image.size > 10 * 1024 * 1024) {
    throw new Error("The camera image exceeds 10 MB. Please use a lower resolution and retry.");
  }
  if (image.type !== "image/jpeg" && image.type !== "image/png") {
    throw new Error("The scan image must be a JPEG or PNG photo.");
  }
  return data;
}

function isAnalysis(value: unknown): value is VisionAnalysis {
  if (!isRecord(value)) return false;
  if (
    !["id", "status", "created_at", "updated_at"].every((key) => typeof value[key] === "string")
  ) {
    return false;
  }
  const result = value["result"];
  if (result === null) return true;
  if (!isRecord(result)) return false;
  const visual = result["visual_assessment"];
  if (visual !== undefined && visual !== null) {
    if (
      !isRecord(visual) ||
      typeof visual["subject_visible"] !== "boolean" ||
      !["framing", "lighting", "posture"].every(
        (key) => typeof visual[key] === "string" && visual[key].length > 0,
      ) ||
      !Array.isArray(visual["capture_tips"]) ||
      !visual["capture_tips"].every((tip) => typeof tip === "string")
    )
      return false;
  }
  return (
    ["provider", "model", "observation", "result_status", "request_id"].every(
      (key) => typeof result[key] === "string",
    ) &&
    ["warnings", "limitations"].every(
      (key) => Array.isArray(result[key]) && result[key].every((item) => typeof item === "string"),
    ) &&
    (result["confidence"] === null ||
      (typeof result["confidence"] === "number" &&
        result["confidence"] >= 0 &&
        result["confidence"] <= 1))
  );
}

export async function requestPhoneAnalysis(
  backendUrl: string,
  accessToken: string,
  image: File,
): Promise<VisionAnalysis> {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("source", "APP_CAMERA");
  let response: Response;
  try {
    response = await fetch(`${backendUrl.replace(/\/+$/, "")}/api/v1/analyses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
  } catch {
    throw new Error(
      "The scan service could not be reached. Please check your connection and retry.",
    );
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw getScanError(response, payload);
  if (!isRecord(payload) || payload["success"] !== true || !isAnalysis(payload["data"])) {
    throw new Error("The scan service returned an invalid response. Please retry later.");
  }
  return payload["data"];
}
