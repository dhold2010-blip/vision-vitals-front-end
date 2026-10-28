import type { VisionAnalysis } from "./vision-api";

// These are capability explanations, never substitute readings for a failed scan.
export const unsupportedMeasurements = [
  { key: "age", label: "Age", reason: "Age is not estimated by this photo scan." },
  {
    key: "height",
    label: "Height",
    reason: "This scan has no calibrated distance or scale measurement.",
  },
  { key: "weight", label: "Weight", reason: "No measured weight is supplied to this scan." },
  {
    key: "bmi",
    label: "Body mass index",
    reason: "BMI is not calculated because measured height and weight are not supplied.",
  },
  {
    key: "symmetry",
    label: "Face symmetry score",
    reason: "This scan does not perform calibrated facial landmark measurements.",
  },
  {
    key: "posture",
    label: "Posture score",
    reason:
      "Visible body position is described above; no validated numeric posture score is calculated.",
  },
  {
    key: "heart-rate",
    label: "Heart rate",
    reason: "This flow sends one photo. It does not record or process a pulse signal.",
  },
  {
    key: "skin",
    label: "Skin classification",
    reason:
      "This scan does not perform calibrated skin classification or a skin-health assessment.",
  },
  {
    key: "composition",
    label: "Body type and composition",
    reason: "Body composition is not measured by this scan.",
  },
  {
    key: "hydration",
    label: "Hydration and stress",
    reason: "No hydration or stress measurement is performed.",
  },
  {
    key: "health",
    label: "Health score",
    reason: "No validated overall health score is calculated from this photo.",
  },
];

export function reportText(analysis: VisionAnalysis): string {
  const result = analysis.result;
  if (!result) return "No analysis result is available.";
  const visual = result.visual_assessment;
  return [
    "VisionVitals — photo observation report",
    `Captured: ${analysis.created_at}`,
    result.result_status === "UNAVAILABLE" ? "Photo could not be assessed" : "Visual observations",
    result.observation,
    ...(visual
      ? [
          `Framing: ${visual.framing}`,
          `Lighting: ${visual.lighting}`,
          `Visible posture: ${visual.posture}`,
          ...visual.capture_tips.map((tip) => `Photo tip: ${tip}`),
        ]
      : []),
    "Measurements not available from this scan:",
    ...unsupportedMeasurements.map((item) => `${item.label}: Not measured. ${item.reason}`),
    ...result.warnings.map((warning) => `Note: ${warning}`),
    ...result.limitations.map((limitation) => `Limitation: ${limitation}`),
    "This is an AI description of a photo, not a medical measurement or diagnosis.",
  ].join("\n\n");
}

export function downloadReport(analysis: VisionAnalysis): void {
  const url = URL.createObjectURL(
    new Blob([reportText(analysis)], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `VisionVitals-report-${analysis.id}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
