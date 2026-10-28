import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";

const { capture, navigate } = vi.hoisted(() => ({ capture: vi.fn(), navigate: vi.fn() }));
vi.mock("@/lib/vision-vitals", () => ({ captureVision: capture }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/components/vv/app-shell", () => ({ Backdrop: () => null }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => navigate,
  redirect: vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
import { Route } from "../src/routes/scan";
const Scan = Route.options.component as ComponentType;
let getUserMedia: ReturnType<typeof vi.fn>;
let stop: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  capture.mockReset();
  navigate.mockReset();
  stop = vi.fn();
  getUserMedia = vi
    .fn()
    .mockImplementation(async () => ({ active: true, getTracks: () => [{ stop }] }));
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(640);
  vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(480);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
    callback(new Blob(["image"], { type: "image/jpeg" })),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function openCamera() {
  await act(async () => {
    render(<Scan />);
  });
}
async function startScan() {
  fireEvent.click(screen.getByLabelText("Start scan"));
  await act(async () => {
    vi.advanceTimersByTime(4000);
  });
}

it("keeps the camera usable after rejection and can successfully retry", async () => {
  capture
    .mockRejectedValueOnce(new Error("Please retake the photo"))
    .mockResolvedValueOnce({ id: "analysis-2", result: null });
  await openCamera();
  await startScan();
  expect(screen.getByText("Please retake the photo")).toBeTruthy();
  expect(stop).not.toHaveBeenCalled();
  await startScan();
  expect(capture).toHaveBeenCalledTimes(2);
  expect(navigate).toHaveBeenCalledWith({
    to: "/results",
    state: { result: { id: "analysis-2", result: null } },
  });
});

it("restarts camera access and clears the old error when Restart is pressed", async () => {
  capture.mockRejectedValue(new Error("Scan failed"));
  await openCamera();
  await startScan();
  await act(async () => {
    fireEvent.click(screen.getByLabelText("Restart scan"));
  });
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  expect(stop).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Scan failed")).toBeNull();
  expect((screen.getByLabelText("Start scan") as HTMLButtonElement).disabled).toBe(false);
});

it("does not duplicate a slow upload and ignores its result after cancellation", async () => {
  let finish!: (result: unknown) => void;
  capture.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await openCamera();
  await startScan();
  await act(async () => {
    vi.advanceTimersByTime(20000);
  });
  expect(capture).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByLabelText("Cancel scan"));
  await act(async () => {
    finish({ id: "cancelled" });
  });
  expect(navigate).not.toHaveBeenCalled();
});

it("recovers camera permission on restart and prevents scanning without a camera", async () => {
  getUserMedia.mockRejectedValueOnce(new Error("Permission denied"));
  await openCamera();
  expect((screen.getByLabelText("Start scan") as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(/Allow camera access/)).toBeTruthy();
  await act(async () => {
    fireEvent.click(screen.getByLabelText("Restart scan"));
  });
  expect((screen.getByLabelText("Start scan") as HTMLButtonElement).disabled).toBe(false);
  expect(screen.queryByText(/Allow camera access/)).toBeNull();
});
