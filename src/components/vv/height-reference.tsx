import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { HeightReference, ReferencePoint } from "@/lib/measurement-inputs";
const steps = [
  "top of the reference",
  "bottom of the reference",
  "top of your head",
  "bottom of your feet",
];
export function HeightReferenceCapture({
  url,
  width,
  height,
  onComplete,
}: {
  url: string;
  width: number;
  height: number;
  onComplete: (value: HeightReference | null) => void;
}) {
  const [points, setPoints] = useState<ReferencePoint[]>([]);
  const [length, setLength] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const reference = Number(length);
  const ready =
    points.length === 4 &&
    confirmed &&
    Number.isFinite(reference) &&
    reference >= 20 &&
    reference <= 250;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
    >
      <DialogContent className="max-h-[94dvh] overflow-y-auto rounded-2xl p-4 sm:max-w-xl">
        <DialogTitle>Estimate height with a reference</DialogTitle>
        <DialogDescription>
          Use a vertical object of known length beside you at the same distance from the camera.
          Stand upright, barefoot, with head and feet visible. Keep the camera level. Without this
          setup, skip the estimate. Perspective can make it inaccurate.
        </DialogDescription>
        <p className="text-sm font-semibold" aria-live="polite">
          {points.length < 4
            ? `Step ${points.length + 1}/4: tap the ${steps[points.length]}.`
            : "Check all four marks, then confirm below."}
        </p>
        <div className="relative mx-auto w-full max-w-sm">
          <img
            src={url}
            alt="Captured full body and reference for height marking"
            className="block w-full select-none rounded-xl"
            draggable={false}
          />
          <button
            type="button"
            aria-label={
              points.length < 4 ? `Mark ${steps[points.length]}` : "Four height marks selected"
            }
            disabled={points.length === 4}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setPoints([
                ...points,
                {
                  x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                  y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
                },
              ]);
            }}
            className="absolute inset-0 cursor-crosshair rounded-xl border border-white/30"
          />
          {points.map((p, i) => (
            <span
              key={i}
              className="pointer-events-none absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-secondary text-xs font-bold text-black"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <button type="button" className="text-sm text-secondary" onClick={() => setPoints([])}>
          Reset marks
        </button>
        <label className="text-sm">
          Reference length (cm)
          <input
            type="number"
            min="20"
            max="250"
            step="0.1"
            inputMode="decimal"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background p-3"
          />
        </label>
        <label className="flex gap-2 text-xs">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I know the reference length. It is upright, beside me at the same camera distance; my
          whole body is upright and visible, and the camera is level.
        </label>
        <p className="text-xs text-muted-foreground">
          This is a rough reference-based estimate, not a calibrated medical measurement. It will
          not be used for BMI.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="glass rounded-xl p-3 text-sm"
            onClick={() => onComplete(null)}
          >
            Skip height estimate
          </button>
          <button
            type="button"
            disabled={!ready}
            className="aurora rounded-xl p-3 text-sm font-semibold disabled:opacity-40"
            onClick={() =>
              onComplete({
                reference_cm: reference,
                points,
                same_plane_confirmed: true,
                width,
                height,
              })
            }
          >
            Use reference marks
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
