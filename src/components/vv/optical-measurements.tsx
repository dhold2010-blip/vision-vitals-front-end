import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { GlassCard, SectionTitle } from "./glass-card";
import { saveCameraMeasurement } from "@/lib/optical-api";
import { captureFace, openOpticalCamera, recordPulse } from "@/lib/optical-capture";
import type { VisionAnalysis } from "@/lib/vision-api";
import type { OpticalMetrics } from "@/lib/optical-types";

type Mode = "pulse" | "face";
const labels = { pulse: "Camera heart rate", face: "Face symmetry" };

export function OpticalMeasurements({
  id,
  report,
  onSaved,
}: {
  id: string;
  report?: OpticalMetrics | null;
  onSaved: (analysis: VisionAnalysis) => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  return (
    <section aria-label="Automatic camera estimates" className="mt-6">
      <SectionTitle title="Automatic camera estimates" className="mb-3" />
      <p className="mb-4 text-sm text-muted-foreground">
        No manual readings needed. These use separate guided captures and are experimental, not
        clinical measurements.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["pulse", "face"] as const).map((kind) => {
          const metric = report?.[kind];
          return (
            <GlassCard key={kind} className="p-5">
              <h3 className="font-semibold">{labels[kind]}</h3>
              <p className="mt-3 text-3xl font-bold text-secondary">
                {metric?.value != null ? `${metric.value} ${metric.unit}` : "—"}
              </p>
              <p className="mt-2 text-xs font-semibold">
                {metric?.status === "ESTIMATED"
                  ? "Experimental camera estimate"
                  : metric
                    ? "Unable to estimate · retake capture"
                    : "Separate camera capture needed"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {metric?.reason ??
                  (kind === "pulse"
                    ? "Cover the rear phone lens with your fingertip for 30 seconds."
                    : "Take a close-up, neutral, front-facing capture. The result describes left–right landmark differences.")}
              </p>
              {metric && (
                <details className="mt-3 text-xs text-muted-foreground">
                  <summary>Method and limitations</summary>
                  <p className="mt-2">{metric.method}</p>
                  <p>Capture: {metric.captured_at}</p>
                </details>
              )}
              <button
                type="button"
                aria-label={`${metric ? "Measure again" : "Measure with camera"} ${labels[kind]}`}
                onClick={() => setMode(kind)}
                className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-background"
              >
                {metric ? "Measure again" : "Measure with camera"}
                <span className="sr-only"> {labels[kind]}</span>
              </button>
            </GlassCard>
          );
        })}
      </div>
      {mode && (
        <CaptureDialog
          key={mode}
          id={id}
          mode={mode}
          close={() => setMode(null)}
          onSaved={onSaved}
        />
      )}
    </section>
  );
}

function CaptureDialog({
  id,
  mode,
  close,
  onSaved,
}: {
  id: string;
  mode: Mode;
  close: () => void;
  onSaved: (a: VisionAnalysis) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<"idle" | "opening" | "ready" | "capturing" | "saving">("idle");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [progress, setProgress] = useState(0);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torch, setTorch] = useState(false);
  const [lightBusy, setLightBusy] = useState(false);
  const stop = () => {
    controller.current?.abort();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        stop();
        setPhase("idle");
        setTorch(false);
        setError("Capture interrupted. Keep this page visible and try again.");
      }
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", stop);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", stop);
    };
  }, []);
  const start = async () => {
    stop();
    const abort = new AbortController();
    controller.current = abort;
    setPhase("opening");
    setError("");
    setProgress(0);
    setTorch(false);
    setTorchAvailable(false);
    try {
      const media = await openOpticalCamera(video.current!, mode, abort.signal);
      if (abort.signal.aborted) return;
      stream.current = media;
      const track = media.getVideoTracks()[0]!;
      track.addEventListener(
        "ended",
        () => {
          if (!abort.signal.aborted) {
            stop();
            setPhase("idle");
            setError("Camera access ended. Please allow access and retry.");
          }
        },
        { once: true },
      );
      const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      setTorchAvailable(mode === "pulse" && caps?.torch === true);
      setPhase("ready");
    } catch (e) {
      if (abort.signal.aborted) return;
      stop();
      setPhase("idle");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings, then retry."
          : e instanceof Error
            ? e.message
            : "Could not open the camera. Please retry.",
      );
    }
  };
  const toggleLight = async () => {
    const track = stream.current?.getVideoTracks()[0];
    if (!track) return;
    setLightBusy(true);
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setError(
        "This camera could not change its light. Use steady ambient light or another phone.",
      );
    } finally {
      setLightBusy(false);
    }
  };
  const measure = async () => {
    const abort = controller.current;
    if (!abort || abort.signal.aborted || !video.current) return;
    setPhase("capturing");
    setError("");
    try {
      const capture =
        mode === "pulse"
          ? await recordPulse(video.current, abort.signal, (p, message) => {
              setProgress(p);
              setHint(message);
            })
          : await captureFace(video.current, abort.signal);
      if (abort.signal.aborted) return;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setTorch(false);
      setPhase("saving");
      const result = await saveCameraMeasurement({ data: { id, capture } });
      if (abort.signal.aborted) return;
      onSaved(result);
      close();
    } catch (e) {
      if (abort.signal.aborted) return;
      stop();
      setPhase("idle");
      setTorch(false);
      setError(
        e instanceof Error ? e.message : "The measurement could not be saved. Please retry.",
      );
    }
  };
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && phase !== "saving") {
          stop();
          close();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          className="fixed inset-x-3 top-[3vh] z-50 mx-auto max-h-[94dvh] max-w-lg overflow-y-auto rounded-3xl border border-border bg-background p-5 shadow-xl"
          aria-describedby="optical-help"
        >
          <Dialog.Title className="text-xl font-bold">{labels[mode]}</Dialog.Title>
          <Dialog.Description
            id="optical-help"
            className="mt-3 text-sm leading-relaxed text-muted-foreground"
          >
            {mode === "pulse"
              ? "Rest your hand on a surface. Gently cover the rear camera lens with your fingertip; do not press hard. Hold still for 30 seconds. If using the light, stop if your finger feels warm. This is an experimental pulse estimate, not a medical monitor."
              : "Hold the front camera at eye level in even light. Keep your face centred, eyes open, mouth relaxed, and remove face obstructions. Look straight ahead. This estimates image geometry, not health or attractiveness."}
          </Dialog.Description>
          <div className="relative mt-4 overflow-hidden rounded-2xl bg-black">
            <video
              ref={video}
              muted
              autoPlay
              playsInline
              className={`aspect-[4/3] w-full object-contain ${mode === "face" ? "-scale-x-100" : ""}`}
            />
            {mode === "face" && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-[25%] inset-y-[10%] rounded-[50%] border-2 border-secondary/70"
              />
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Video stays on this device. Only colour samples or facial landmark coordinates are sent
            to save the estimate; they are not sent to the photo AI. Raw samples are not retained.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-amber-300">
              {error}
            </p>
          )}
          {phase === "capturing" && (
            <div role="status" className="mt-4">
              <p>
                {mode === "pulse"
                  ? `${Math.ceil(progress * 30)} / 30 seconds · ${hint}`
                  : "Finding facial landmarks… Keep facing forward."}
              </p>
              {mode === "pulse" && (
                <progress
                  aria-label="Pulse recording progress"
                  max={1}
                  value={progress}
                  className="mt-2 w-full"
                />
              )}
            </div>
          )}
          {phase === "saving" && (
            <p role="status" className="mt-3">
              Checking signal quality and saving your result…
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {(phase === "idle" || phase === "opening") && (
              <button
                type="button"
                disabled={phase === "opening"}
                onClick={() => void start()}
                className="rounded-xl bg-secondary px-4 py-3 font-semibold text-background disabled:opacity-50"
              >
                {phase === "opening" ? "Opening camera…" : "Open camera"}
              </button>
            )}
            {phase === "ready" && (
              <>
                <button
                  type="button"
                  disabled={lightBusy}
                  onClick={() => void measure()}
                  className="rounded-xl bg-secondary px-4 py-3 font-semibold text-background"
                >
                  {mode === "pulse" ? "Record 30-second pulse" : "Capture face symmetry"}
                </button>
                {torchAvailable && (
                  <button
                    type="button"
                    disabled={lightBusy}
                    onClick={() => void toggleLight()}
                    className="rounded-xl border border-border px-4 py-3"
                  >
                    {torch ? "Turn light off" : "Turn light on"}
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              disabled={phase === "saving"}
              onClick={() => {
                stop();
                close();
              }}
              className="rounded-xl border border-border px-4 py-3 disabled:opacity-50"
            >
              {phase === "capturing" ? "Stop capture" : "Close"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
