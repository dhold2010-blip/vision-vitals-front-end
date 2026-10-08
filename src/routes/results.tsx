import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, Download, Save, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { Chip, GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { ProgressBar, ProgressRing } from "@/components/vv/progress";
import { latestScan, metrics, recommendations } from "@/lib/vitals";
import type { VisionCaptureResult } from "@/lib/vision-vitals";
import { cn } from "@/lib/utils";

declare module "@tanstack/history" {
  interface HistoryState {
    result?: VisionCaptureResult;
  }
}

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Scan results — VisionVitals AI" },
      {
        name: "description",
        content:
          "Your full AI body analysis: estimated age, height, weight, BMI, body type, symmetry, posture, heart rate and skin tone.",
      },
      { property: "og:title", content: "Scan results — VisionVitals AI" },
      {
        property: "og:description",
        content: "A complete AI body and health breakdown with confidence scores.",
      },
    ],
  }),
  component: Results,
});

function Results() {
  const location = useLocation();
  const result = location.state?.result;
  const [open, setOpen] = useState<string | null>("age");
  const analysisResult = result?.analysis?.result;
  const hasRealResult = Boolean(analysisResult);
  const resultStatus = analysisResult?.result_status ?? "UNAVAILABLE";
  const resultConfidence = analysisResult?.confidence ?? 0;
  const displayMetrics = useMemo(
    () => [
      {
        key: "observation",
        label: "AI observation",
        value: analysisResult?.observation || "No observation was returned by the analysis service.",
        detail: analysisResult?.limitations?.join(" ") || "The result is limited to the backend response.",
        confidence: Math.round(resultConfidence * 100),
      },
      {
        key: "status",
        label: "Analysis status",
        value: resultStatus,
        detail: analysisResult?.warnings?.join(" ") || "No warnings were returned.",
        confidence: Math.round(resultConfidence * 100),
      },
    ],
    [analysisResult, resultConfidence, resultStatus],
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow={
          result?.capture?.created_at
            ? new Date(result.capture.created_at).toLocaleString()
            : latestScan.capturedAt
        }
        title="Your analysis"
        subtitle={`Status ${resultStatus} · confidence ${Math.round(resultConfidence * 100)}%`}
      />

      {!hasRealResult ? (
        <GlassCard className="animate-scale-in overflow-hidden p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            No capture result was returned. This view is showing the last saved scan fallback.
          </p>
        </GlassCard>
      ) : null}

      <GlassCard className="animate-scale-in overflow-hidden p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ProgressRing
            value={hasRealResult ? Math.round(resultConfidence * 100) : latestScan.score}
            size={180}
            caption={hasRealResult ? "Analysis confidence" : "Health score"}
            gradientId="res-ring"
          />
          {hasRealResult ? (
            <div className="flex-1">
              <p className="text-sm font-semibold">{analysisResult?.model}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {analysisResult?.observation}
              </p>
            </div>
          ) : (
            <div className="grid flex-1 gap-3">
              <ProgressBar value={latestScan.symmetry} label="Face symmetry" tone="accent" />
              <ProgressBar value={latestScan.posture} label="Posture" tone="secondary" />
              <ProgressBar value={latestScan.hydration} label="Hydration" tone="success" />
              <ProgressBar value={latestScan.stress} label="Stress load" tone="warning" />
            </div>
          )}
        </div>
        {!hasRealResult ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Chip active>{latestScan.bodyType}</Chip>
            <Chip>{latestScan.skinTone}</Chip>
            <Chip>{latestScan.heartRate} bpm</Chip>
            <Chip>BMI {latestScan.bmi}</Chip>
          </div>
        ) : null}
      </GlassCard>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Est. age", value: latestScan.estimatedAge, unit: "yrs" },
          { label: "Height", value: latestScan.height, unit: "cm" },
          { label: "Weight", value: latestScan.weight, unit: "kg" },
        ].map((m, i) => (
          <GlassCard key={m.label} className="animate-rise p-4 text-center">
            <div style={{ animationDelay: `${i * 80}ms` }}>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums">{m.value}</p>
              <p className="text-[11px] text-muted-foreground">
                {m.label} · {m.unit}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>

      <SectionTitle className="mt-8 mb-3" title="Full breakdown" />
      <ul className="grid gap-3">
        {(hasRealResult ? displayMetrics : metrics).map((m) => {
          const isOpen = open === m.key;
          return (
            <GlassCard as="li" key={m.key} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : m.key)}
                aria-expanded={isOpen}
                className="press flex w-full items-center gap-4 p-4 text-left"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="text-xs text-muted-foreground">Confidence {m.confidence}%</p>
                </div>
                <span className="text-lg font-bold tabular-nums">
                  {m.value}
                  {m.unit ? (
                    <span className="ml-1 text-xs text-muted-foreground">{m.unit}</span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform duration-300",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              <div
                className="grid transition-all duration-[400ms] ease-[var(--ease-smooth)]"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border px-4 py-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">{m.detail}</p>
                    <div className="mt-4">
                      <ProgressBar value={m.confidence} label="Model confidence" />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </ul>

      {!hasRealResult ? (
        <>
          <SectionTitle className="mt-8 mb-3" title="Recommendations" />
          <div className="grid gap-3 sm:grid-cols-3">
            {recommendations.map((r) => (
              <GlassCard key={r.title} className="p-5" interactive>
                <span
                  className={cn(
                    "block h-1 w-10 rounded-full",
                    r.tone === "primary" && "bg-primary",
                    r.tone === "secondary" && "bg-secondary",
                    r.tone === "accent" && "bg-accent",
                  )}
                />
                <p className="mt-4 text-sm font-semibold">{r.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.body}</p>
              </GlassCard>
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-8 grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => toast.success("Report saved to your history")}
          className="press glass flex flex-col items-center gap-2 rounded-3xl py-4 text-xs font-medium"
        >
          <Save className="size-4 text-secondary" />
          Save
        </button>
        <button
          type="button"
          onClick={() => toast("Share link copied", { description: "Valid for 24 hours" })}
          className="press glass flex flex-col items-center gap-2 rounded-3xl py-4 text-xs font-medium"
        >
          <Share2 className="size-4 text-accent" />
          Share
        </button>
        <button
          type="button"
          onClick={() =>
            toast.success("Exporting PDF…", { description: "VisionVitals-report.pdf" })
          }
          className="press flex flex-col items-center gap-2 rounded-3xl aurora py-4 text-xs font-semibold text-primary-foreground"
        >
          <Download className="size-4" />
          Export PDF
        </button>
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        Estimates are generated by computer vision models and are not a medical diagnosis.{" "}
        <Link to="/settings" className="text-secondary">
          Privacy settings
        </Link>
      </p>
    </AppShell>
  );
}
