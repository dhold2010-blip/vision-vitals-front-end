import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const { openCamera, pulse, face, save, stop } = vi.hoisted(() => ({
  openCamera: vi.fn(),
  pulse: vi.fn(),
  face: vi.fn(),
  save: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("../src/lib/optical-capture", () => ({
  openOpticalCamera: openCamera,
  recordPulse: pulse,
  captureFace: face,
}));
vi.mock("../src/lib/optical-api", () => ({ saveCameraMeasurement: save }));
import { OpticalMeasurements } from "../src/components/vv/optical-measurements";
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function camera() {
  const track = { stop, addEventListener: vi.fn(), getCapabilities: () => ({}) };
  openCamera.mockResolvedValue({ getTracks: () => [track], getVideoTracks: () => [track] });
}
it("shows denied permission without a measurement and permits retry", async () => {
  openCamera.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
  render(<OpticalMeasurements id="a" onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Measure with camera Camera heart rate" }));
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("permission was denied"),
  );
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Open camera" })).toBeTruthy();
});
it("saves camera data and releases tracks before displaying the persisted result", async () => {
  camera();
  const capture = { kind: "face", version: 1, landmarks: [] };
  face.mockResolvedValue(capture);
  const report = { id: "a", result: { optical_metrics: { face: { value: 1.5 } } } };
  save.mockResolvedValue(report);
  const onSaved = vi.fn();
  render(<OpticalMeasurements id="a" onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "Measure with camera Face symmetry" }));
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  fireEvent.click(await screen.findByRole("button", { name: "Capture face symmetry" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(report));
  expect(save).toHaveBeenCalledWith({ data: { id: "a", capture } });
  expect(stop).toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("cancels recording and never submits an aborted measurement", async () => {
  camera();
  let complete!: (value: unknown) => void;
  pulse.mockImplementation(
    () =>
      new Promise((r) => {
        complete = r;
      }),
  );
  render(<OpticalMeasurements id="a" onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Measure with camera Camera heart rate" }));
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  fireEvent.click(await screen.findByRole("button", { name: "Record 30-second pulse" }));
  fireEvent.click(screen.getByRole("button", { name: "Stop capture" }));
  complete({ kind: "pulse", version: 1, samples: [] });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(stop).toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});
it("shows save failures without replacing the report and releases the camera", async () => {
  camera();
  face.mockResolvedValue({ kind: "face" });
  save.mockRejectedValue(new Error("Your session expired. Please sign in again."));
  const onSaved = vi.fn();
  render(<OpticalMeasurements id="a" onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "Measure with camera Face symmetry" }));
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  fireEvent.click(await screen.findByRole("button", { name: "Capture face symmetry" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("session expired"));
  expect(stop).toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
});
