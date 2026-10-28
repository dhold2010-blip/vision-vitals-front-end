import { expect, it } from "vitest";
import { reportText } from "../src/lib/scan-report";
import type { VisionAnalysis } from "../src/lib/vision-api";

it("exports actual photo findings and measurement limitations without demo readings", () => {
  const analysis: VisionAnalysis = {
    id: "test",
    status: "COMPLETED",
    created_at: "2026-10-29",
    updated_at: "2026-10-29",
    result: {
      provider: "gemini",
      model: "test",
      request_id: "test",
      result_status: "OBSERVATION",
      observation: "A person is seated.",
      confidence: null,
      warnings: [],
      limitations: ["Lower body obscured."],
      visual_assessment: {
        subject_visible: true,
        framing: "Upper body only.",
        lighting: "Even light.",
        posture: "Seated.",
        capture_tips: ["Include feet."],
      },
    },
  };
  const text = reportText(analysis);
  expect(text).toContain("A person is seated.");
  expect(text).toContain("Framing: Upper body only.");
  expect(text).toContain("Heart rate: Not measured.");
  expect(text).toContain("Lower body obscured.");
  expect(text).not.toMatch(/68 bpm|72.4|94%/);
});
