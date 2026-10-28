export type ReferencePoint = { x: number; y: number };
export type HeightReference = {
  reference_cm: number;
  points: ReferencePoint[];
  same_plane_confirmed: true;
  width: number;
  height: number;
};
export type MeasurementInputs = {
  version: 1;
  age_years?: number;
  height_cm?: number;
  weight_kg?: number;
  pulse_bpm?: number;
  height_reference?: HeightReference;
};
export const measurementFields = [
  {
    key: "age_years",
    label: "Age (years)",
    min: 0,
    max: 120,
    step: 1,
    help: "Completed years; never estimated from your face.",
  },
  {
    key: "height_cm",
    label: "Measured height (cm)",
    min: 40,
    max: 260,
    step: 0.1,
    help: "Use a tape or stadiometer. This value is used for BMI.",
  },
  {
    key: "weight_kg",
    label: "Weight (kg)",
    min: 2,
    max: 500,
    step: 0.1,
    help: "Enter a recent weighing-scale reading.",
  },
  {
    key: "pulse_bpm",
    label: "Device pulse reading (bpm)",
    min: 20,
    max: 250,
    step: 1,
    help: "Optional reading from a pulse-measuring device; this photo does not measure pulse.",
  },
] as const;
export type MeasurementFields = Partial<Record<(typeof measurementFields)[number]["key"], string>>;
export function parseMeasurementFields(fields: MeasurementFields): MeasurementInputs {
  const result: MeasurementInputs = { version: 1 };
  for (const field of measurementFields) {
    const raw = fields[field.key]?.trim();
    if (!raw) continue;
    const value = Number(raw);
    if (
      !Number.isFinite(value) ||
      value < field.min ||
      value > field.max ||
      (field.step === 1 && !Number.isInteger(value))
    ) {
      throw new Error(
        `Check ${field.label.toLowerCase()}: enter ${field.min}–${field.max}${field.step === 1 ? " in whole numbers" : ""}, or leave it blank.`,
      );
    }
    result[field.key] = value;
  }
  return result;
}
export type SupplementalMetric = {
  key: "age" | "height" | "weight" | "bmi" | "heart-rate" | "height-estimate";
  label: string;
  value: number | null;
  unit: "years" | "cm" | "kg" | "kg/m²" | "bpm";
  source: "USER_PROVIDED" | "CALCULATED" | "CAMERA_REFERENCE";
  status: "RECORDED" | "CALCULATED" | "ESTIMATED" | "UNAVAILABLE";
  reason: string;
};
export type SupplementalMetrics = { version: 1; metrics: SupplementalMetric[] };
export function measurementSource(metric: SupplementalMetric): string {
  if (metric.status === "UNAVAILABLE") return "Not available";
  return metric.source === "USER_PROVIDED"
    ? "Entered by you"
    : metric.source === "CAMERA_REFERENCE"
      ? "Approximate · reference photo"
      : "Calculated from entered measurements";
}
export function isSupplementalMetrics(value: unknown): value is SupplementalMetrics {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<SupplementalMetrics>;
  if (report.version !== 1 || !Array.isArray(report.metrics) || report.metrics.length !== 6)
    return false;
  const specs: Record<string, [string, string, string, number, number]> = {
    age: ["years", "USER_PROVIDED", "RECORDED", 0, 120],
    height: ["cm", "USER_PROVIDED", "RECORDED", 40, 260],
    weight: ["kg", "USER_PROVIDED", "RECORDED", 2, 500],
    "heart-rate": ["bpm", "USER_PROVIDED", "RECORDED", 20, 250],
    bmi: ["kg/m²", "CALCULATED", "CALCULATED", 0, 4000],
    "height-estimate": ["cm", "CAMERA_REFERENCE", "ESTIMATED", 80, 250],
  };
  const seen = new Set<string>();
  for (const m of report.metrics) {
    if (!m || typeof m !== "object" || typeof m.key !== "string" || seen.has(m.key)) return false;
    seen.add(m.key);
    const spec = specs[m.key];
    if (
      !spec ||
      m.unit !== spec[0] ||
      m.source !== spec[1] ||
      typeof m.label !== "string" ||
      typeof m.reason !== "string"
    )
      return false;
    if (m.status === "UNAVAILABLE") {
      if (m.value !== null) return false;
    } else if (
      m.status !== spec[2] ||
      typeof m.value !== "number" ||
      !Number.isFinite(m.value) ||
      m.value < spec[3] ||
      m.value > spec[4]
    )
      return false;
  }
  return true;
}
