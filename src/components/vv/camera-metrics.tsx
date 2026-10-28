import type { CameraMetrics } from "@/lib/vision-api";
import { GlassCard, SectionTitle } from "./glass-card";

export function CameraMeasurements({ report }: { report?: CameraMetrics | null }) {
  return (
    <section aria-label="Camera measurements" className="mt-6">
      <SectionTitle title="Camera measurements" className="mb-3" />
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Estimated angles in this image, calculated from detected body landmarks. Camera tilt and
        perspective affect the values. These are not a health score or clinical measurements.
      </p>
      {report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.metrics.map((metric) => (
              <GlassCard key={metric.key} className="p-5">
                <h3 className="text-sm font-semibold">{metric.label}</h3>
                <p className="mt-2 text-3xl font-bold text-secondary">
                  {metric.value === null ? "—" : `${metric.value.toFixed(1)}°`}
                </p>
                <p className="mt-1 text-xs font-semibold">
                  {metric.status === "ESTIMATED"
                    ? "Estimated · 2D camera"
                    : "Not measurable in this capture"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {metric.reason}
                </p>
              </GlassCard>
            ))}
          </div>
          <details className="mt-4 text-xs leading-relaxed text-muted-foreground">
            <summary className="cursor-pointer">Measurement method and limitations</summary>
            <p className="mt-2">{report.method}</p>
            <ul className="mt-2 list-disc space-y-2 pl-4">
              {report.limitations.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <GlassCard className="p-5 text-sm text-muted-foreground">
          This report predates camera measurements. Take a new scan to record body landmarks and
          estimate visible joint angles.
        </GlassCard>
      )}
    </section>
  );
}
