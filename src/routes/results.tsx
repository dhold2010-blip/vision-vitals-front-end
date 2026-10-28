import { OpticalMeasurements } from "@/components/vv/optical-measurements";
import type { VisionAnalysis } from "@/lib/vision-api";
import { AdditionalMeasurements } from "@/components/vv/supplemental-metrics";
import { CameraMeasurements } from "@/components/vv/camera-metrics";
import { ReportDate } from "@/components/vv/report-date";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { ProgressRing } from "@/components/vv/progress";
import { requireAccount } from "@/lib/account";
import { getSavedReport } from "@/lib/saved-reports";
import { downloadReport, remainingMeasurements } from "@/lib/scan-report";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/results")({
  beforeLoad: requireAccount,
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  loaderDeps: ({ search }) => ({ id: search.id }),
  loader: ({ deps }) => (deps.id ? getSavedReport({ data: deps.id }) : null),
  head: () => ({
    meta: [
      { title: "Scan results — VisionVitals AI" },
      {
        name: "description",
        content: "Photo observations, capture tips, and measurement availability.",
      },
    ],
  }),
  component: Results,
});

function Results() {
  const loaded = Route.useLoaderData();
  const [updated, setUpdated] = useState<VisionAnalysis | null>(null);
  const analysis = updated && updated.id === loaded?.id ? updated : loaded;
  const result = analysis?.result;
  const [open, setOpen] = useState<string | null>(null);

  if (!analysis || !result) {
    return (
      <AppShell>
        <PageHeader title="Your analysis" subtitle="No analysis result is available." />
        <GlassCard className="p-6">
          <p className="text-sm text-muted-foreground">
            Start a new scan to get an analysis of your camera image.
          </p>
          <Link to="/scan" className="mt-4 inline-block text-secondary">
            Start a scan
          </Link>
        </GlassCard>
      </AppShell>
    );
  }

  const visual = result.visual_assessment;
  const unavailable = result.result_status === "UNAVAILABLE" || visual?.subject_visible === false;
  const observations = visual
    ? [
        { label: "Framing", detail: visual.framing },
        { label: "Lighting", detail: visual.lighting },
        { label: "Visible posture", detail: visual.posture },
      ]
    : [];
  const notes = [...new Set([...result.warnings, ...result.limitations])];

  return (
    <AppShell>
      <PageHeader
        eyebrow={<ReportDate value={analysis.created_at} />}
        title="Your photo report"
        subtitle={
          unavailable
            ? "Photo received · a clearer capture may be needed"
            : "Camera angle estimates and photo observations"
        }
      />
      <GlassCard className="animate-scale-in overflow-hidden p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ProgressRing
            value={unavailable ? 0 : 100}
            label={unavailable ? "Retake" : "Ready"}
            size={180}
            caption="Photo report"
            gradientId="res-ring"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">
              {unavailable ? "Photo could not be assessed" : "What is visible"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {result.observation}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Visual descriptions are AI generated and may be mistaken. They are not clinical
              measurements.
            </p>
          </div>
        </div>
      </GlassCard>

      <OpticalMeasurements
        id={analysis.id}
        report={result.optical_metrics ?? null}
        onSaved={setUpdated}
      />

      {result.supplemental_metrics ? (
        <AdditionalMeasurements report={result.supplemental_metrics} />
      ) : null}
      <CameraMeasurements report={result.camera_metrics ?? null} />

      <SectionTitle className="mt-8 mb-3" title="Photo observations" />
      {observations.length ? (
        <div className="grid gap-3">
          {observations.map((item) => (
            <GlassCard key={item.label} className="p-5">
              <h3 className="text-sm font-semibold text-secondary">{item.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-5">
          <p className="text-sm text-muted-foreground">
            {result.camera_metrics
              ? "Separate photo descriptions are unavailable for this capture. Any usable camera measurements are shown above."
              : "This older report contains only the summary above. Take a new photo for separate framing, lighting, and visible posture observations."}
          </p>
        </GlassCard>
      )}

      <SectionTitle className="mt-8 mb-3" title="Not measured by this scan" />
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        These require other inputs, calibration, sensors, or validated methods. No readings are
        invented from appearance.
      </p>
      <ul className="grid gap-3">
        {remainingMeasurements(result).map((item) => (
          <GlassCard as="li" key={item.key} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === item.key ? null : item.key)}
              aria-expanded={open === item.key}
              aria-controls={`metric-${item.key}`}
              className="press flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="min-w-0 flex-1 text-sm font-semibold">{item.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">Not measured</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  open === item.key && "rotate-180",
                )}
              />
            </button>
            <div
              id={`metric-${item.key}`}
              hidden={open !== item.key}
              className="border-t border-border p-4 text-sm leading-relaxed text-muted-foreground"
            >
              {item.reason}
            </div>
          </GlassCard>
        ))}
      </ul>

      {visual && visual.capture_tips.length > 0 ? (
        <>
          <SectionTitle className="mt-8 mb-3" title="Tips for your next photo" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {visual.capture_tips.map((tip, index) => (
              <GlassCard
                as="li"
                key={index}
                className="p-5 text-sm leading-relaxed text-muted-foreground"
              >
                {tip}
              </GlassCard>
            ))}
          </ul>
        </>
      ) : null}
      {notes.length > 0 ? (
        <GlassCard className="mt-6 p-5">
          <h2 className="text-sm font-semibold">Report limitations</h2>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </GlassCard>
      ) : null}
      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link
          to="/scan"
          className="press glass flex items-center justify-center gap-2 rounded-3xl p-4 text-sm"
        >
          <RefreshCw className="size-4 text-secondary" />
          Retake photo
        </Link>
        <button
          type="button"
          onClick={() => downloadReport(analysis)}
          className="press aurora flex items-center justify-center gap-2 rounded-3xl p-4 text-sm font-semibold text-primary-foreground"
        >
          <Download className="size-4" />
          Download report
        </button>
      </div>
      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        This report describes a photo. It is not a medical measurement or diagnosis.{" "}
        <Link to="/settings" className="text-secondary">
          Privacy settings
        </Link>
      </p>
    </AppShell>
  );
}
