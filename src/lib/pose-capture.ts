import type { PoseLandmarker } from "@mediapipe/tasks-vision";

export type PoseCapture = {
  version: 1;
  model: "mediapipe-pose-landmarker-lite-float16-v1";
  status: "DETECTED" | "NO_POSE" | "MULTIPLE_POSES" | "MODEL_UNAVAILABLE";
  width: number;
  height: number;
  landmarks: { x: number; y: number; visibility: number; presence?: number }[];
};

// The same frozen canvas supplies the uploaded JPEG and the detected landmarks.
// Never use model world-coordinate metres as calibrated body dimensions.
export async function capturePose(
  canvas: HTMLCanvasElement,
  signal?: AbortSignal,
): Promise<PoseCapture> {
  const base: PoseCapture = {
    version: 1,
    model: "mediapipe-pose-landmarker-lite-float16-v1",
    status: "MODEL_UNAVAILABLE",
    width: canvas.width,
    height: canvas.height,
    landmarks: [],
  };
  let detector: PoseLandmarker | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const load = async () => {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const runtime = await FilesetResolver.forVisionTasks("/mediapipe/1.2.0");
    const instance = await PoseLandmarker.createFromOptions(runtime, {
      baseOptions: { modelAssetPath: "/models/pose_landmarker_lite_v1.task", delegate: "CPU" },
      runningMode: "IMAGE",
      numPoses: 2,
      minPoseDetectionConfidence: 0.6,
      minPosePresenceConfidence: 0.6,
      outputSegmentationMasks: false,
    });
    if (expired || signal?.aborted) {
      instance.close();
      throw new Error("Pose capture cancelled");
    }
    return instance;
  };
  try {
    if (signal?.aborted) return base;
    detector = await Promise.race([
      load(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error("Pose loading timed out"));
        }, 30000);
      }),
    ]);
    if (signal?.aborted) return base;
    const result = detector.detect(canvas);
    try {
      if (result.landmarks.length === 0) return { ...base, status: "NO_POSE" };
      if (result.landmarks.length > 1) return { ...base, status: "MULTIPLE_POSES" };
      const points = result.landmarks[0];
      if (!points || points.length !== 33) return base;
      return {
        ...base,
        status: "DETECTED",
        landmarks: points.map(({ x, y, visibility, presence }) => ({
          x,
          y,
          visibility,
          ...(presence === undefined ? {} : { presence }),
        })),
      };
    } finally {
      result.close();
    }
  } catch {
    // Save explicit unavailability alongside the photo observations, never fake angles.
    return base;
  } finally {
    expired = true;
    if (timer) clearTimeout(timer);
    detector?.close();
  }
}
