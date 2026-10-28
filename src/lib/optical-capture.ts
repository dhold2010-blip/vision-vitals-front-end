import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { OpticalCapture, PulseSample } from "./optical-types";

const cancelled = () => new Error("Capture stopped. You can try again when ready.");

export function fingerSample(data: Uint8ClampedArray, t: number): PulseSample {
  let r = 0,
    g = 0,
    b = 0,
    covered = 0,
    clipped = 0;
  const n = data.length / 4;
  if (!n) throw new Error("The camera frame is empty.");
  for (let i = 0; i < data.length; i += 4) {
    const red = data[i]!,
      green = data[i + 1]!,
      blue = data[i + 2]!;
    r += red;
    g += green;
    b += blue;
    if (red > 35 && red > green * 1.12 && red > blue * 1.15) covered++;
    // Green is the analyzed signal; red clipping alone is common with torch.
    if (green < 5 || green > 250) clipped++;
  }
  return { t, r: r / n, g: g / n, b: b / n, coverage: covered / n, clipped: clipped / n };
}

export async function openOpticalCamera(
  video: HTMLVideoElement,
  kind: "pulse" | "face",
  signal: AbortSignal,
) {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error(
      "Camera access is unavailable. Open this page over HTTPS in your phone browser.",
    );
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stream: MediaStream | undefined;
  const request = navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: kind === "pulse" ? "environment" : "user" },
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 },
      },
    })
    .then((value) => {
      if (expired || signal.aborted) {
        value.getTracks().forEach((t) => t.stop());
        throw cancelled();
      }
      return value;
    });
  try {
    stream = await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error("Camera permission timed out. Allow access in your browser and retry."));
        }, 20000);
      }),
    ]);
    if (signal.aborted) throw cancelled();
    const settings = stream.getVideoTracks()[0]?.getSettings();
    if (kind === "pulse" && settings?.facingMode === "user")
      throw new Error(
        "Pulse needs the rear phone camera. Open this page on your phone and allow rear-camera access.",
      );
    video.srcObject = stream;
    // Abort listener is attached before play(), which may await browser interaction.
    const stop = () => stream?.getTracks().forEach((t) => t.stop());
    signal.addEventListener("abort", stop, { once: true });
    if (timer) clearTimeout(timer);
    await Promise.race([
      video.play(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error("The camera preview did not start. Close other camera apps and retry."),
            ),
          10000,
        );
      }),
    ]);
    if (signal.aborted) throw cancelled();
    return stream;
  } catch (error) {
    stream?.getTracks().forEach((t) => t.stop());
    throw error;
  } finally {
    expired = true;
    if (timer) clearTimeout(timer);
  }
}

export function recordPulse(
  video: HTMLVideoElement,
  signal: AbortSignal,
  progress: (fraction: number, hint: string) => void,
): Promise<OpticalCapture> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(cancelled());
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      reject(new Error("Camera processing is unavailable."));
      return;
    }
    const samples: PulseSample[] = [];
    const hasFrames = typeof video.requestVideoFrameCallback === "function";
    if (!hasFrames && typeof video.getVideoPlaybackQuality !== "function") {
      reject(
        new Error(
          "This browser cannot track camera frames reliably. Try an updated phone browser.",
        ),
      );
      return;
    }
    let firstTime: number | undefined;
    let frame = 0,
      last = -1,
      finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      if (hasFrames) video.cancelVideoFrameCallback(frame);
      else cancelAnimationFrame(frame);
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve({ kind: "pulse", version: 1, samples });
    };
    const onAbort = () => finish(cancelled());
    const timer = setTimeout(
      () => finish(new Error("The camera stopped delivering frames. Retry with this page open.")),
      36000,
    );
    const tick = (_now: number, metadata?: VideoFrameCallbackMetadata) => {
      if (signal.aborted || document.hidden) {
        finish(cancelled());
        return;
      }
      const time = metadata?.mediaTime ?? video.currentTime;
      const frameNumber =
        metadata?.presentedFrames ?? video.getVideoPlaybackQuality().totalVideoFrames;
      if (video.readyState >= 2 && video.videoWidth > 0 && frameNumber !== last) {
        firstTime ??= time;
        const t = time - firstTime;
        if (t > 35 || t < 0) {
          finish(new Error("Camera timing changed. Please retry."));
          return;
        }
        last = frameNumber;
        try {
          ctx.drawImage(
            video,
            video.videoWidth * 0.2,
            video.videoHeight * 0.2,
            video.videoWidth * 0.6,
            video.videoHeight * 0.6,
            0,
            0,
            64,
            64,
          );
          const sample = fingerSample(ctx.getImageData(0, 0, 64, 64).data, t);
          samples.push(sample);
          progress(
            Math.min(1, t / 30),
            sample.coverage < 0.9
              ? "Cover the rear lens completely with your fingertip."
              : sample.clipped > 0.1 || sample.g < 10
                ? "Adjust the light; the camera needs a clearer signal."
                : "Keep your hand relaxed and still.",
          );
          if (t >= 30) {
            finish();
            return;
          }
        } catch {
          finish(new Error("The camera frame could not be read. Please retry."));
          return;
        }
      }
      frame = hasFrames ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    frame = hasFrames ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  });
}

export async function captureFace(
  video: HTMLVideoElement,
  signal: AbortSignal,
): Promise<OpticalCapture> {
  let detector: FaceLandmarker | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const load = async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const runtime = await FilesetResolver.forVisionTasks("/mediapipe/1.2.0");
      const instance = await FaceLandmarker.createFromOptions(runtime, {
        baseOptions: { modelAssetPath: "/models/face_landmarker_v1.task", delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 2,
        minFaceDetectionConfidence: 0.7,
        minFacePresenceConfidence: 0.7,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      if (expired || signal.aborted) {
        instance.close();
        throw cancelled();
      }
      return instance;
    };
    detector = await Promise.race([
      load(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error("Face detection could not load. Check your connection and retry."));
        }, 30000);
      }),
    ]);
    if (signal.aborted) throw cancelled();
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    if (canvas.width < 240 || canvas.height < 240)
      throw new Error("The camera image is too small. Try another camera.");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Camera processing is unavailable.");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const detection = detector.detect(canvas);
    if (detection.faceLandmarks.length !== 1)
      throw new Error(
        detection.faceLandmarks.length
          ? "Only one face should be visible. Please retry."
          : "No clear face was found. Face the camera in even light and retry.",
      );
    const landmarks = detection.faceLandmarks[0]!;
    const matrix = detection.facialTransformationMatrixes[0]?.data;
    if (landmarks.length !== 478 || !matrix || matrix.length !== 16)
      throw new Error("Face landmarks were incomplete. Please retry.");
    const expressions = detection.faceBlendshapes[0]?.categories;
    if (!expressions?.length) throw new Error("Face quality could not be checked. Please retry.");
    const expression = Math.max(
      0,
      ...expressions
        .filter((c) =>
          /eyeBlink|jawOpen|mouthSmile|mouthPucker|mouthFunnel|mouthStretch|browDown|browInnerUp|browOuterUp/.test(
            c.categoryName,
          ),
        )
        .map((c) => c.score),
    );
    const xs = landmarks.map((p) => p.x * canvas.width),
      ys = landmarks.map((p) => p.y * canvas.height);
    const left = Math.max(0, Math.floor(Math.min(...xs))),
      top = Math.max(0, Math.floor(Math.min(...ys)));
    const w = Math.min(canvas.width - left, Math.ceil(Math.max(...xs)) - left),
      h = Math.min(canvas.height - top, Math.ceil(Math.max(...ys)) - top);
    if (w < 1 || h < 1) throw new Error("Keep your face inside the guide.");
    const pixels = ctx.getImageData(left, top, w, h).data;
    const gray = Array.from(
      { length: w * h },
      (_, i) => 0.299 * pixels[i * 4]! + 0.587 * pixels[i * 4 + 1]! + 0.114 * pixels[i * 4 + 2]!,
    );
    let edges = 0,
      count = 0;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const lap = gray[i - 1]! + gray[i + 1]! + gray[i - w]! + gray[i + w]! - 4 * gray[i]!;
        edges += lap * lap;
        count++;
      }
    return {
      kind: "face",
      version: 1,
      width: canvas.width,
      height: canvas.height,
      landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
      matrix: Array.from(matrix),
      expression,
      brightness: gray.reduce((a, b) => a + b, 0) / gray.length,
      sharpness: count ? edges / count : 0,
    };
  } finally {
    expired = true;
    if (timer) clearTimeout(timer);
    detector?.close();
  }
}
