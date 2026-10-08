import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, CircleAlert, RefreshCw, SwitchCamera, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Backdrop } from "@/components/vv/app-shell";
import { scanStages } from "@/lib/vitals";
import { captureVision, type VisionCaptureResult } from "@/lib/vision-vitals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Live AI scan — VisionVitals AI" },
      {
        name: "description",
        content:
          "Run a live camera scan with face and body landmark detection, a scanning progress ring and real-time AI status.",
      },
      { property: "og:title", content: "Live AI scan — VisionVitals AI" },
      { property: "og:description", content: "Face and body landmark detection in 14 seconds." },
    ],
  }),
  component: ScanScreen,
});

type Phase = "idle" | "scanning" | "analyzing";

function ScanScreen() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const captureCurrentFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error("The camera frame is not ready. Please retry the scan.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The browser could not prepare the camera image.");
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The camera image could not be created."));
      }, "image/jpeg", 0.9);
    });
    const image = new File([imageBlob], "vision-vitals-camera.jpg", {
      type: "image/jpeg",
    });
    const formData = new FormData();
    formData.append("image", image);
    formData.append("image_width", String(canvas.width));
    formData.append("image_height", String(canvas.height));

    return captureVision({ data: formData });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stop();
        streamRef.current = stream;
        setCameraError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        if (!cancelled)
          setCameraError("Camera access is blocked. You can still run a simulated scan.");
      }
    }
    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, stop]);

  useEffect(() => {
    if (phase === "idle") return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        const next = p + (phase === "scanning" ? 1.6 : 2.4);
        return next >= 100 ? 100 : next;
      });
    }, 60);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (progress < 100) return;
    if (phase === "scanning") {
      setProgress(0);
      setPhase("analyzing");
    } else if (phase === "analyzing") {
      setCaptureError(null);
      void captureCurrentFrame()
        .then((result) => {
          stop();
          navigate({ to: "/results", state: { result } });
        })
        .catch((error: unknown) => {
          stop();
          const message =
            error instanceof Error
              ? error.message
              : "The scan could not be completed. Please try again.";
          setCaptureError(message);
          setPhase("idle");
          setProgress(0);
        });
    }
  }, [captureCurrentFrame, navigate, phase, progress, stop]);

  const stageIndex = Math.min(
    scanStages.length - 1,
    Math.floor((progress / 100) * scanStages.length),
  );
  const status =
    phase === "idle"
      ? "Stand 1.5 m back, full body in frame"
      : phase === "scanning"
        ? ["Detecting face…", "Analyzing body…", "Hold still…"][stageIndex % 3]
        : scanStages[stageIndex];

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Backdrop />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-10">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            aria-label="Close scanner"
            className="press glass grid size-10 place-items-center rounded-full"
          >
            <X className="size-4" />
          </Link>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-secondary uppercase">
            {phase === "analyzing" ? "Neural analysis" : "Live scan"}
          </p>
          <button
            type="button"
            aria-label="Toggle torch"
            aria-pressed={torch}
            onClick={() => setTorch((t) => !t)}
            className={cn(
              "press glass grid size-10 place-items-center rounded-full",
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

          {cameraError || captureError ? (
            <div className="absolute inset-0 grid place-items-center px-8 text-center">
              <div>
                <CircleAlert className="mx-auto size-6 text-warning" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {cameraError || captureError}
                </p>
              </div>
            </div>
          ) : null}

          <Overlay phase={phase} />

          {phase !== "idle" ? (
            <div className="animate-sweep absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-secondary/25 to-transparent" />
          ) : null}

          {phase === "analyzing" ? <NeuralField progress={progress} /> : null}

          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="glass-strong rounded-3xl px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{status}</p>
                <span className="text-sm font-bold tabular-nums text-secondary">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full aurora"
                  style={{ width: `${progress}%`, transition: "width 0.2s linear" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between px-6">
          <button
            type="button"
            aria-label="Flip camera"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className="press glass grid size-14 place-items-center rounded-2xl"
          >
            <SwitchCamera className="size-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (phase === "idle") {
                setProgress(0);
                setPhase("scanning");
              } else {
                setPhase("idle");
                setProgress(0);
              }
            }}
            className="press relative grid size-20 place-items-center rounded-full aurora shadow-[var(--shadow-glow)]"
            aria-label={phase === "idle" ? "Start scan" : "Cancel scan"}
          >
            <span className="animate-pulse-ring absolute inset-0 rounded-full border border-secondary/60" />
            {phase === "idle" ? (
              <span className="size-14 rounded-full border-4 border-white/70" />
            ) : (
              <X className="size-7 text-primary-foreground" />
            )}
          </button>

          <button
            type="button"
            aria-label="Restart scan"
            onClick={() => {
              setPhase("idle");
              setProgress(0);
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

function Overlay({ phase }: { phase: Phase }) {
  const dots = [
    [50, 20],
    [42, 26],
    [58, 26],
    [38, 34],
    [62, 34],
    [50, 33],
    [44, 40],
    [56, 40],
    [50, 46],
    [36, 52],
    [64, 52],
    [50, 58],
    [40, 70],
    [60, 70],
    [42, 84],
    [58, 84],
  ];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-6 rounded-[28px] border border-white/15" />
      {[
        "left-6 top-6 border-t-2 border-l-2 rounded-tl-[28px]",
        "right-6 top-6 border-t-2 border-r-2 rounded-tr-[28px]",
        "left-6 bottom-6 border-b-2 border-l-2 rounded-bl-[28px]",
        "right-6 bottom-6 border-b-2 border-r-2 rounded-br-[28px]",
      ].map((c) => (
        <span key={c} className={cn("absolute size-12 border-secondary", c)} />
      ))}

      <div
        className={cn(
          "absolute top-[12%] left-1/2 h-[26%] w-[42%] -translate-x-1/2 rounded-[50%] border transition-all duration-700",
          phase === "idle" ? "border-white/25" : "border-secondary/80 shadow-[var(--shadow-glow)]",
        )}
      />
      {phase !== "idle"
        ? dots.map(([x, y], i) => (
            <span
              key={`${x}-${y}`}
              className="animate-scale-in absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_10px_var(--color-secondary)]"
              style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 45}ms` }}
            />
          ))
        : null}
    </div>
  );
}

function NeuralField({ progress }: { progress: number }) {
  const nodes = Array.from({ length: 22 }, (_, i) => ({
    x: 12 + ((i * 37) % 76),
    y: 10 + ((i * 53) % 80),
  }));
  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full opacity-70">
        {nodes.map((n, i) =>
          nodes
            .slice(i + 1, i + 3)
            .map((m, j) => (
              <line
                key={`${i}-${j}`}
                x1={n.x}
                y1={n.y}
                x2={m.x}
                y2={m.y}
                stroke="var(--color-primary)"
                strokeWidth="0.15"
                opacity="0.55"
              />
            )),
        )}
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x}
            cy={n.y}
            r="0.7"
            fill="var(--color-secondary)"
            className="animate-scale-in"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </svg>
      <div className="relative grid size-48 place-items-center">
        <span className="animate-spin-slow absolute inset-0 rounded-full border-t-2 border-secondary/70" />
        <span className="animate-spin-slow absolute inset-5 rounded-full border-b-2 border-accent/70 [animation-direction:reverse]" />
        <span className="animate-pulse-ring absolute inset-8 rounded-full border border-primary/60" />
        <div className="text-center">
          <p className="text-4xl font-extrabold tabular-nums">{Math.round(progress)}%</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            <Check className="size-3 text-success" /> AI thinking
          </p>
        </div>
      </div>
    </div>
  );
}
