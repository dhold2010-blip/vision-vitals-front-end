import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { CameraMeasurements } from "../src/components/vv/camera-metrics";
import { isCameraMetrics, type CameraMetrics, type VisionAnalysis } from "../src/lib/vision-api";
import { reportText } from "../src/lib/scan-report";
const report: CameraMetrics = {
  version: 1,
  method: "Test geometry",
  source: "BROWSER_LANDMARKS",
  status: "PARTIAL",
  metrics: [
    "shoulder_tilt",
    "hip_tilt",
    "torso_lean",
    "left_elbow",
    "right_elbow",
    "left_knee",
    "right_knee",
  ].map((key, i) => ({
    key,
    label: key,
    value: i === 0 ? 0 : null,
    unit: "degrees",
    status: i === 0 ? "ESTIMATED" : "UNAVAILABLE",
    reason: i === 0 ? "2D estimate" : "Required joints are cropped",
  })),
  limitations: ["Camera perspective changes estimates"],
};
afterEach(cleanup);
it("renders a real zero angle without confusing it with unavailable joints", () => {
  render(<CameraMeasurements report={report} />);
  expect(screen.getByText("0.0°")).toBeTruthy();
  expect(screen.getAllByText("Not measurable in this capture")).toHaveLength(6);
  expect(screen.getByText("Camera perspective changes estimates")).toBeTruthy();
});
it("explains older reports without inventing measurements", () => {
  render(<CameraMeasurements report={null} />);
  expect(screen.getByText(/predates camera measurements/)).toBeTruthy();
  expect(screen.queryByText("0.0°")).toBeNull();
});
it("validates measurement status, duplicate keys and invalid numbers", () => {
  expect(isCameraMetrics(report)).toBe(true);
  expect(isCameraMetrics({ ...report, status: "AVAILABLE" })).toBe(false);
  for (const value of [NaN, Infinity, -1, 181]) {
    expect(
      isCameraMetrics({
        ...report,
        metrics: report.metrics.map((m, i) => (i ? m : { ...m, value })),
      }),
    ).toBe(false);
  }
  expect(
    isCameraMetrics({
      ...report,
      metrics: report.metrics.map((m) => ({ ...m, key: "left_knee" })),
    }),
  ).toBe(false);
  expect(
    isCameraMetrics({
      ...report,
      metrics: report.metrics.map((m) => ({ ...m, value: 60, status: "UNAVAILABLE" })),
    }),
  ).toBe(false);
});
it("exports the saved estimates and unavailability reasons without adding clinical readings", () => {
  const analysis = {
    created_at: "2026-10-29",
    result: {
      observation: "Person visible",
      result_status: "OBSERVATION",
      warnings: [],
      limitations: [],
      camera_metrics: report,
    },
  } as unknown as VisionAnalysis;
  const text = reportText(analysis);
  expect(text).toContain("0.0° (estimated)");
  expect(text).toContain("Required joints are cropped");
  expect(text).toContain("Heart rate: Not measured");
  expect(text).not.toContain("bpm");
});
