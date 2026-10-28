import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HeightReferenceCapture } from "../src/components/vv/height-reference";
import { AdditionalMeasurements } from "../src/components/vv/supplemental-metrics";
import {
  isSupplementalMetrics,
  parseMeasurementFields,
  type SupplementalMetrics,
} from "../src/lib/measurement-inputs";
import { remainingMeasurements, reportText } from "../src/lib/scan-report";
import type { VisionAnalysis } from "../src/lib/vision-api";
afterEach(cleanup);
it("parses optional numeric readings without turning blanks into zero", () => {
  expect(
    parseMeasurementFields({ height_cm: "170", weight_kg: "65", pulse_bpm: "72", age_years: "30" }),
  ).toEqual({ version: 1, height_cm: 170, weight_kg: 65, pulse_bpm: 72, age_years: 30 });
  expect(parseMeasurementFields({ age_years: "0", height_cm: " " })).toEqual({
    version: 1,
    age_years: 0,
  });
});
it.each([{ age_years: "30.5" }, { weight_kg: "NaN" }, { height_cm: "-1" }, { pulse_bpm: "999" }])(
  "rejects invalid readings %j",
  (data) => {
    expect(() => parseMeasurementFields(data)).toThrow("Check");
  },
);
it("requires four normalized marks, a reference length and explicit setup confirmation", () => {
  const done = vi.fn();
  render(<HeightReferenceCapture url="blob:test" width={600} height={1000} onComplete={done} />);
  expect(
    (screen.getByRole("button", { name: "Use reference marks" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  for (const [x, y] of [
    [120, 300],
    [120, 800],
    [300, 100],
    [300, 950],
  ]) {
    const button = screen.getByRole("button", { name: /^Mark / });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 600,
      height: 1000,
    } as DOMRect);
    fireEvent.click(button, { clientX: x, clientY: y });
  }
  fireEvent.change(screen.getByLabelText("Reference length (cm)"), { target: { value: "100" } });
  expect(
    (screen.getByRole("button", { name: "Use reference marks" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Use reference marks" }));
  expect(done).toHaveBeenCalledWith({
    reference_cm: 100,
    width: 600,
    height: 1000,
    same_plane_confirmed: true,
    points: [
      { x: 0.2, y: 0.3 },
      { x: 0.2, y: 0.8 },
      { x: 0.5, y: 0.1 },
      { x: 0.5, y: 0.95 },
    ],
  });
});
it("allows skipping calibration without creating a height value", () => {
  const done = vi.fn();
  render(<HeightReferenceCapture url="blob:test" width={600} height={1000} onComplete={done} />);
  fireEvent.click(screen.getByRole("button", { name: "Skip height estimate" }));
  expect(done).toHaveBeenCalledWith(null);
});
const report: SupplementalMetrics = {
  version: 1,
  metrics: [
    {
      key: "age",
      label: "Age",
      value: 30,
      unit: "years",
      source: "USER_PROVIDED",
      status: "RECORDED",
      reason: "Entered by you",
    },
    {
      key: "height",
      label: "Measured height",
      value: 170,
      unit: "cm",
      source: "USER_PROVIDED",
      status: "RECORDED",
      reason: "Entered by you",
    },
    {
      key: "weight",
      label: "Weight",
      value: 65,
      unit: "kg",
      source: "USER_PROVIDED",
      status: "RECORDED",
      reason: "Entered by you",
    },
    {
      key: "heart-rate",
      label: "Heart rate",
      value: 72,
      unit: "bpm",
      source: "USER_PROVIDED",
      status: "RECORDED",
      reason: "Entered device reading",
    },
    {
      key: "bmi",
      label: "Adult body mass index",
      value: 22.5,
      unit: "kg/m²",
      source: "CALCULATED",
      status: "CALCULATED",
      reason: "Uses entered height and weight",
    },
    {
      key: "height-estimate",
      label: "Reference height",
      value: null,
      unit: "cm",
      source: "CAMERA_REFERENCE",
      status: "UNAVAILABLE",
      reason: "Known reference missing",
    },
  ],
};
it("renders sources and exported values with no contradictory unsupported rows", () => {
  render(<AdditionalMeasurements report={report} />);
  expect(screen.getByText("22.5 kg/m²")).toBeTruthy();
  expect(screen.getByText("72 bpm")).toBeTruthy();
  expect(screen.getByText("Known reference missing")).toBeTruthy();
  const analysis = {
    created_at: "2026-10-29",
    result: {
      observation: "Test",
      result_status: "OBSERVATION",
      warnings: [],
      limitations: [],
      supplemental_metrics: report,
    },
  } as unknown as VisionAnalysis;
  expect(remainingMeasurements(analysis.result!).some((m) => m.key === "heart-rate")).toBe(false);
  expect(reportText(analysis)).toContain("Heart rate: 72 bpm. Entered by you");
  expect(reportText(analysis)).not.toContain("Heart rate: Not measured");
});
it("validates sources and rejects fake or inconsistent response metrics", () => {
  expect(isSupplementalMetrics(report)).toBe(true);
  expect(
    isSupplementalMetrics({
      ...report,
      metrics: report.metrics.map((m) => ({ ...m, source: "CAMERA_REFERENCE" })),
    }),
  ).toBe(false);
  expect(
    isSupplementalMetrics({
      ...report,
      metrics: report.metrics.map((m) => ({ ...m, status: "UNAVAILABLE" })),
    }),
  ).toBe(false);
  expect(
    isSupplementalMetrics({
      ...report,
      metrics: report.metrics.map((m) => ({ ...m, value: Infinity })),
    }),
  ).toBe(false);
});
