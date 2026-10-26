import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { CircleAlert, RefreshCw, SwitchCamera, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Backdrop } from "@/components/vv/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { captureVision, type VisionCaptureResult } from "@/lib/vision-vitals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scan")({
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Camera scan — VisionVitals AI" },
      {
        name: "description",
        content: "Capture and submit a camera image to the VisionVitals backend, then review its actual response.",
      },
      { property: "og:title", content: "Camera scan — VisionVitals AI" },
      { property: "og:description", content: "Camera image processing with service-returned results and limitations." },
    ],
  }),
  component: ScanScreen,
});

type Phase = "idle" | "analyzing";
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

function cameraFailureMessage(error: unknown): string {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String(error.name)
      : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission was denied or blocked. Allow camera access in your browser settings, then retry.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is already in use by another app. Close the other app and retry.";
  }
  return "Could not start the camera. Check browser permissions and retry.";
}

function ScanScreen() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torch, setTorch] = useState(false);
  const [cameraRetry, setCameraRetry] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const captureCurrentFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error("The camera frame is not ready. Please retry the scan.");
    }

    const scale = Math.min(1, 1280 / video.videoWidth, 1920 / video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser could not prepare the camera image.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("The camera image could not be created."));
        },
        "image/jpeg",
        0.86,
      );
    });
    if (imageBlob.size === 0 || imageBlob.size > 10 * 1024 * 1024) {
      throw new Error("The captured image exceeds the 10 MB upload limit. Try another camera or reduce its resolution.");
    }
    const image = new File([imageBlob], "vision-vitals-camera.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("image", image);
    return captureVision({ data: formData });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      setCameraReady(false);
      setTorchAvailable(false);
      setTorch(false);
      setCameraError(null);
      stop();
      if (videoRef.current) videoRef.current.srcObject = null;

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera capture is unavailable in this browser. Use a modern browser on HTTPS, then retry.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
        setTorchAvailable(Boolean(capabilities?.torch));
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (!cancelled) setCameraReady(true);
      } catch (error) {
        if (!cancelled) setCameraError(cameraFailureMessage(error));
      }
    }
    void startCamera();
    return () => {
      cancelled = true;
      stop();
    };
  }, [cameraRetry, facing, stop]);

  async function startScan() {
    if (!cameraReady || phase !== "idle") return;
    setCaptureError(null);
    setPhase("analyzing");
    let result: VisionCaptureResult;
    try {
      result = await captureCurrentFrame();
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "The scan could not be completed. Please try again.");
      setPhase("idle");
      return;
    }

    stop();
    try {
      await navigate({
        to: "/results",
        search: { analysisId: result.analysis?.id },
        state: { result },
      });
    } catch {
      setCaptureError("The response returned, but its result page could not open. Check Scan history before retrying.");
      setPhase("idle");
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchAvailable || phase !== "idle") return;
    const next = !torch;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorch(next);
    } catch {
      setCaptureError("This camera could not change its torch setting.");
      setTorch(false);
    }
  }

  const status = cameraError
    ? "Camera unavailable"
    : phase === "analyzing"
      ? "Sending image to VisionVitals…"
      : cameraReady
        ? "Camera ready — capture when you are ready"
        : "Requesting camera access…";

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Backdrop />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-8">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Close scanner" className="press glass grid size-10 place-items-center rounded-full">
            <X className="size-4" />
          </Link>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-secondary uppercase">
            {phase === "analyzing" ? "Submitting capture" : "Camera scan"}
          </p>
          <button
            type="button"
            aria-label="Toggle camera torch"
            aria-pressed={torch}
            title={torchAvailable ? "Toggle camera torch" : "Torch is not supported by this camera"}
            disabled={!torchAvailable || phase !== "idle"}
            onClick={() => void toggleTorch()}
            className={cn(
              "press glass grid size-10 place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-40",
              torch && "border-warning/50 text-warning",
            )}
          >
            <Zap className="size-4" />
          </button>
        </div>

        <div className="relative mt-6 flex-1 overflow-hidden rounded-[36px] border border-white/12 bg-black/60 shadow-[var(--shadow-glass)]">
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn(
              "size-full object-cover",
              facing === "user" && "scale-x-[-1]",
              phase === "analyzing" && "opacity-40 blur-sm",
            )}
          />
          <Overlay active={cameraReady} />

          {cameraError || captureError ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 px-8 text-center">
              <div>
                <CircleAlert className="mx-auto size-6 text-warning" />
                <p role="alert" className="mt-3 text-sm text-muted-foreground">
                  {cameraError || captureError}
                </p>
              </div>
            </div>
          ) : null}

          {phase === "analyzing" ? <WaitingOverlay /> : null}

          <div className="absolute inset-x-0 bottom-0 z-10 p-5">
            <div className="glass-strong rounded-3xl px-5 py-4">
              <p className="text-sm font-semibold">{status}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                The camera image is sent to the VisionVitals backend. Returned analysis is not a medical diagnosis.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between px-6">
          <button
            type="button"
            aria-label="Flip camera"
            disabled={!cameraReady || phase !== "idle"}
            onClick={() => setFacing((current) => (current === "user" ? "environment" : "user"))}
            className="press glass grid size-14 place-items-center rounded-2xl disabled:opacity-40"
          >
            <SwitchCamera className="size-5" />
          </button>

          <button
            type="button"
            disabled={!cameraReady || phase === "analyzing"}
            onClick={() => void startScan()}
            className="press relative grid size-20 place-items-center rounded-full aurora shadow-[var(--shadow-glow)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={phase === "idle" ? "Capture image and submit for analysis" : "Analysis in progress"}
          >
            {phase === "idle" ? (
              <span className="size-14 rounded-full border-4 border-white/70" />
            ) : (
              <RefreshCw className="size-7 animate-spin-slow text-primary-foreground" />
            )}
          </button>

          <button
            type="button"
            aria-label="Retry camera access"
            onClick={() => {
              setCaptureError(null);
              setCameraRetry((current) => current + 1);
            }}
            className="press glass grid size-14 place-items-center rounded-2xl"
          >
            <RefreshCw className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Overlay({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-8">
      <div className={cn("relative h-[72%] w-[78%] rounded-[30px] border", active ? "border-secondary/50" : "border-white/25")}>
        <span className="absolute top-0 left-0 h-8 w-8 rounded-tl-2xl border-t-2 border-l-2 border-secondary" />
        <span className="absolute top-0 right-0 h-8 w-8 rounded-tr-2xl border-t-2 border-r-2 border-secondary" />
        <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-secondary" />
        <span className="absolute right-0 bottom-0 h-8 w-8 rounded-br-2xl border-r-2 border-b-2 border-secondary" />
      </div>
    </div>
  );
}

function WaitingOverlay() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-black/20 px-6">
      <div className="glass-strong rounded-3xl px-6 py-5 text-center">
        <RefreshCw className="mx-auto size-6 animate-spin-slow text-secondary" />
        <p className="mt-3 text-sm font-semibold">Waiting for VisionVitals</p>
        <p className="mt-1 text-xs text-muted-foreground">No result is shown until the service responds.</p>
      </div>
    </div>
  );
}
