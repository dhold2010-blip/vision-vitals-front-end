import { isOpticalMetrics, type OpticalMetrics } from "./optical-types";
import { isSupplementalMetrics, type SupplementalMetrics } from "./measurement-inputs";
export type CameraMetric = {
  key: string;
  label: string;
  value: number | null;
  unit: "degrees";
  status: "ESTIMATED" | "UNAVAILABLE";
  reason: string;
};
export type CameraMetrics = {
  version: 1;
  method: string;
  source: string;
  status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
  metrics: CameraMetric[];
  limitations: string[];
};

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
    camera_metrics?: CameraMetrics | null;
    supplemental_metrics?: SupplementalMetrics | null;
    optical_metrics?: OpticalMetrics | null;
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
  const pose = data.get("pose_capture");
  if (pose !== null && (typeof pose !== "string" || pose.length > 16000)) {
    throw new Error("The camera landmark data is invalid. Please retry the scan.");
  }
  const measurements = data.get("measurement_inputs");
  if (measurements !== null && (typeof measurements !== "string" || measurements.length > 4000)) {
    throw new Error("The additional measurement data is invalid. Please retry the scan.");
  }
  return data;
}

export function isAnalysis(value: unknown): value is VisionAnalysis {
  if (!isRecord(value)) return false;
  if (
    !["id", "status", "created_at", "updated_at"].every((key) => typeof value[key] === "string")
  ) {
    return false;
  }
  const result = value["result"];
  if (result === null) return true;
  if (!isRecord(result)) return false;
  const optical = result["optical_metrics"];
  if (optical !== undefined && optical !== null && !isOpticalMetrics(optical)) return false;
  const supplemental = result["supplemental_metrics"];
  if (supplemental !== undefined && supplemental !== null && !isSupplementalMetrics(supplemental))
    return false;
  const camera = result["camera_metrics"];
  if (camera !== undefined && camera !== null && !isCameraMetrics(camera)) return false;
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
  poseCapture?: string | null,
  measurementInputs?: string | null,
): Promise<VisionAnalysis> {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("source", "APP_CAMERA");
  if (poseCapture) formData.append("pose_capture", poseCapture);
  if (measurementInputs) formData.append("measurement_inputs", measurementInputs);
  let response: Response;
  try {
    response = await fetch(`${backendUrl.replace(/\/+$/, "")}/api/v1/analyses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
      signal: AbortSignal.timeout(60000),
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

export function isCameraMetrics(value: unknown): value is CameraMetrics {
  if (
    !isRecord(value) ||
    value["version"] !== 1 ||
    typeof value["method"] !== "string" ||
    typeof value["source"] !== "string"
  )
    return false;
  if (!["AVAILABLE", "PARTIAL", "UNAVAILABLE"].includes(String(value["status"]))) return false;
  if (
    !Array.isArray(value["limitations"]) ||
    !value["limitations"].every((item) => typeof item === "string")
  )
    return false;
  if (!Array.isArray(value["metrics"]) || value["metrics"].length !== 7) return false;
  const keys = new Set([
    "shoulder_tilt",
    "hip_tilt",
    "torso_lean",
    "left_elbow",
    "right_elbow",
    "left_knee",
    "right_knee",
  ]);
  let available = 0;
  for (const m of value["metrics"]) {
    if (
      !isRecord(m) ||
      typeof m["key"] !== "string" ||
      !keys.delete(m["key"]) ||
      typeof m["label"] !== "string" ||
      typeof m["reason"] !== "string" ||
      m["unit"] !== "degrees"
    )
      return false;
    if (m["status"] === "UNAVAILABLE") {
      if (m["value"] !== null) return false;
    } else if (
      m["status"] === "ESTIMATED" &&
      typeof m["value"] === "number" &&
      Number.isFinite(m["value"]) &&
      m["value"] >= 0 &&
      m["value"] <= 180
    )
      available++;
    else return false;
  }
  return (
    value["status"] === (available === 7 ? "AVAILABLE" : available ? "PARTIAL" : "UNAVAILABLE")
  );
}
