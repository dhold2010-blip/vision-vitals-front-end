import { afterEach, expect, it, vi } from "vitest";
const { create, detect, close, resultClose } = vi.hoisted(() => ({
  create: vi.fn(),
  detect: vi.fn(),
  close: vi.fn(),
  resultClose: vi.fn(),
}));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  PoseLandmarker: { createFromOptions: create },
}));
import { capturePose } from "../src/lib/pose-capture";
afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
});
const canvas = { width: 800, height: 600 } as HTMLCanvasElement;
function setup(landmarks: unknown[]) {
  create.mockResolvedValue({ detect, close });
  detect.mockReturnValue({ landmarks, close: resultClose });
}
it("uses frozen image dimensions and only image-plane coordinates", async () => {
  setup([Array.from({ length: 33 }, () => ({ x: 0.4, y: 0.6, z: 1, visibility: 0.9 }))]);
  const result = await capturePose(canvas);
  expect(result.status).toBe("DETECTED");
  expect(result.width).toBe(800);
  expect(result.landmarks[0]).toEqual({ x: 0.4, y: 0.6, visibility: 0.9 });
  expect(close).toHaveBeenCalledOnce();
  expect(resultClose).toHaveBeenCalledOnce();
});
it.each([
  [[], "NO_POSE"],
  [[[], []], "MULTIPLE_POSES"],
])("handles detection result %j", async (landmarks, status) => {
  setup(landmarks as unknown[]);
  expect((await capturePose(canvas)).status).toBe(status);
});
it("fails explicitly when the model cannot load", async () => {
  create.mockRejectedValue(new Error("offline"));
  expect((await capturePose(canvas)).status).toBe("MODEL_UNAVAILABLE");
});
it("does not detect after cancelled initialization", async () => {
  const controller = new AbortController();
  create.mockImplementation(async () => {
    controller.abort();
    return { detect, close };
  });
  expect((await capturePose(canvas, controller.signal)).status).toBe("MODEL_UNAVAILABLE");
  expect(detect).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledOnce();
});
it("times out model initialization and closes a late model", async () => {
  vi.useFakeTimers();
  let finish!: (value: unknown) => void;
  create.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const result = capturePose(canvas);
  await vi.advanceTimersByTimeAsync(30001);
  expect((await result).status).toBe("MODEL_UNAVAILABLE");
  finish({ detect, close });
  await vi.advanceTimersByTimeAsync(1);
  expect(close).toHaveBeenCalledOnce();
  expect(detect).not.toHaveBeenCalled();
});
