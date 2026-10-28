import { afterEach, expect, it, vi } from "vitest";
import { fingerSample, openOpticalCamera, recordPulse } from "../src/lib/optical-capture";
import { isOpticalMetrics } from "../src/lib/optical-types";
import { reportText } from "../src/lib/scan-report";
import type { VisionAnalysis } from "../src/lib/vision-api";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("extracts actual RGB values, coverage and green saturation", () => {
  expect(fingerSample(new Uint8ClampedArray([180, 90, 40, 255, 200, 100, 50, 255]), 1)).toEqual({
    t: 1,
    r: 190,
    g: 95,
    b: 45,
    coverage: 1,
    clipped: 0,
  });
  expect(fingerSample(new Uint8ClampedArray([0, 0, 0, 255]), 0).clipped).toBe(1);
  expect(fingerSample(new Uint8ClampedArray([120, 120, 120, 255]), 0).coverage).toBe(0);
});
it("records only unique delivered frames using media timestamps", async () => {
  vi.useFakeTimers();
  let callback!: VideoFrameRequestCallback;
  const pixels = new Uint8ClampedArray([180, 90, 40, 255]);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
    getImageData: () => ({ data: pixels }),
  } as unknown as CanvasRenderingContext2D);
  const video = {
    readyState: 2,
    videoWidth: 640,
    videoHeight: 480,
    requestVideoFrameCallback: vi.fn((cb: VideoFrameRequestCallback) => {
      callback = cb;
      return 1;
    }),
    cancelVideoFrameCallback: vi.fn(),
  } as unknown as HTMLVideoElement;
  const recording = recordPulse(video, new AbortController().signal, vi.fn());
  for (let i = 0; i <= 900; i++) {
    callback((i * 1000) / 30, {
      mediaTime: 100 + i / 30,
      presentedFrames: i,
    } as VideoFrameCallbackMetadata);
    if (i === 1)
      callback((i * 1000) / 30, {
        mediaTime: 100 + i / 30,
        presentedFrames: i,
      } as VideoFrameCallbackMetadata);
  }
  const capture = await recording;
  if (capture.kind !== "pulse") throw new Error("Wrong mode");
  expect(capture.samples).toHaveLength(901);
  expect(capture.samples[0]!.t).toBe(0);
  expect(capture.samples.at(-1)!.t).toBe(30);
  expect(video.cancelVideoFrameCallback).toHaveBeenCalled();
});
it("stops recording promptly when cancelled", async () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as CanvasRenderingContext2D,
  );
  const video = {
    requestVideoFrameCallback: vi.fn(() => 1),
    cancelVideoFrameCallback: vi.fn(),
  } as unknown as HTMLVideoElement;
  const controller = new AbortController();
  const capture = recordPulse(video, controller.signal, vi.fn());
  controller.abort();
  await expect(capture).rejects.toThrow("Capture stopped");
  expect(video.cancelVideoFrameCallback).toHaveBeenCalledWith(1);
});
it("stops late permission grants after cancellation", async () => {
  let grant!: (stream: MediaStream) => void;
  const stop = vi.fn();
  const media = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: () =>
        new Promise<MediaStream>((r) => {
          grant = r;
        }),
    },
  });
  const controller = new AbortController();
  const request = openOpticalCamera({} as HTMLVideoElement, "pulse", controller.signal);
  controller.abort();
  grant(media);
  await expect(request).rejects.toThrow("Capture stopped");
  expect(stop).toHaveBeenCalled();
});
it("rejects unavailable camera APIs and denied permission", async () => {
  vi.stubGlobal("navigator", {});
  await expect(
    openOpticalCamera({} as HTMLVideoElement, "face", new AbortController().signal),
  ).rejects.toThrow("Camera access is unavailable");
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
    },
  });
  await expect(
    openOpticalCamera({} as HTMLVideoElement, "face", new AbortController().signal),
  ).rejects.toThrow("Denied");
});
const metric = {
  value: 72,
  unit: "bpm",
  status: "ESTIMATED",
  reason: "Experimental",
  method: "PPG",
  captured_at: "2026-10-29T01:00:00Z",
  source: "CAMERA_PPG",
};
it("validates source, ranges and null availability", () => {
  expect(isOpticalMetrics({ pulse: metric })).toBe(true);
  expect(isOpticalMetrics({ pulse: { ...metric, value: NaN } })).toBe(false);
  expect(isOpticalMetrics({ pulse: { ...metric, status: "UNAVAILABLE" } })).toBe(false);
  expect(isOpticalMetrics({ pulse: { ...metric, value: null, status: "UNAVAILABLE" } })).toBe(true);
  expect(isOpticalMetrics({ face: metric })).toBe(false);
});
it("includes sourced camera estimates and failures in report downloads", () => {
  const analysis = {
    created_at: "today",
    result: {
      observation: "Photo",
      warnings: [],
      limitations: [],
      optical_metrics: { pulse: metric },
    },
  } as unknown as VisionAnalysis;
  const text = reportText(analysis);
  expect(text).toContain("Camera heart rate: 72 bpm");
  expect(text).toContain("Source: CAMERA_PPG");
  expect(text).not.toContain("Heart rate: Not measured");
});
it("times out stalled camera permission and stops a later grant", async () => {
  vi.useFakeTimers();
  let grant!: (stream: MediaStream) => void;
  const stop = vi.fn();
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: () =>
        new Promise<MediaStream>((resolve) => {
          grant = resolve;
        }),
    },
  });
  const pending = openOpticalCamera({} as HTMLVideoElement, "face", new AbortController().signal);
  const rejection = expect(pending).rejects.toThrow("permission timed out");
  await vi.advanceTimersByTimeAsync(20001);
  await rejection;
  grant({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await vi.advanceTimersByTimeAsync(1);
  expect(stop).toHaveBeenCalled();
});
