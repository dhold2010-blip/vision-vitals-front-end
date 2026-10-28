export type OpticalMetric = {
  value: number | null;
  unit: "bpm" | "% eye span";
  status: "ESTIMATED" | "UNAVAILABLE";
  reason: string;
  method: string;
  captured_at: string;
  source: "CAMERA_PPG" | "CAMERA_FACE_LANDMARKS";
};
export type OpticalMetrics = { pulse?: OpticalMetric | null; face?: OpticalMetric | null };
export type PulseSample = {
  t: number;
  r: number;
  g: number;
  b: number;
  coverage: number;
  clipped: number;
};
export type OpticalCapture =
  | { kind: "pulse"; version: 1; samples: PulseSample[] }
  | {
      kind: "face";
      version: 1;
      width: number;
      height: number;
      landmarks: { x: number; y: number; z: number }[];
      matrix: number[];
      expression: number;
      brightness: number;
      sharpness: number;
    };
export function isOpticalMetrics(value: unknown): value is OpticalMetrics {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, metric]) => {
    if (key !== "pulse" && key !== "face") return false;
    if (metric === null) return true;
    if (!metric || typeof metric !== "object") return false;
    const m = metric as Record<string, unknown>;
    return (
      m["unit"] === (key === "pulse" ? "bpm" : "% eye span") &&
      m["source"] === (key === "pulse" ? "CAMERA_PPG" : "CAMERA_FACE_LANDMARKS") &&
      ["reason", "method", "captured_at"].every((k) => typeof m[k] === "string") &&
      (m["status"] === "UNAVAILABLE"
        ? m["value"] === null
        : m["status"] === "ESTIMATED" &&
          typeof m["value"] === "number" &&
          Number.isFinite(m["value"]) &&
          m["value"] >= (key === "pulse" ? 45 : 0) &&
          m["value"] <= (key === "pulse" ? 180 : 30))
    );
  });
}
