import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, Download, Save, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { ProgressBar, ProgressRing } from "@/components/vv/progress";
import type { VisionAnalysis } from "@/lib/vision-api";
import { cn } from "@/lib/utils";

declare module "@tanstack/history" {
  interface HistoryState {
    result?: VisionAnalysis;
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
  const [open, setOpen] = useState<string | null>("observation");
  const analysisResult = result?.result;
  const resultStatus = analysisResult?.result_status ?? "UNAVAILABLE";
  const resultConfidence = analysisResult?.confidence ?? 0;
  const displayMetrics = useMemo(
    () => [
      {
        key: "observation",
        unit: "",
        label: "AI observation",
        value:
          analysisResult?.observation || "No observation was returned by the analysis service.",
        detail:
          analysisResult?.limitations?.join(" ") ||
          "The result is limited to the backend response.",
        confidence: Math.round(resultConfidence * 100),
      },
      {
        key: "status",
        unit: "",
        label: "Analysis status",
        value: resultStatus,
        detail: analysisResult?.warnings?.join(" ") || "No warnings were returned.",
        confidence: Math.round(resultConfidence * 100),
      },
    ],
    [analysisResult, resultConfidence, resultStatus],
  );

  if (!analysisResult) {
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

  return (
    <AppShell>
      <PageHeader
        eyebrow={result?.created_at ? new Date(result.created_at).toLocaleString() : "Scan result"}
        title="Your analysis"
        subtitle={`Status ${resultStatus} · confidence ${analysisResult.confidence === null ? "unavailable" : `${Math.round(resultConfidence * 100)}%`}`}
      />

      <GlassCard className="animate-scale-in overflow-hidden p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ProgressRing
            value={Math.round(resultConfidence * 100)}
            label={
              analysisResult.confidence === null ? "—" : `${Math.round(resultConfidence * 100)}%`
            }
            size={180}
            caption="Analysis confidence"
            gradientId="res-ring"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold">{analysisResult.model}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {analysisResult.observation}
            </p>
          </div>
        </div>
      </GlassCard>

      <SectionTitle className="mt-8 mb-3" title="Full breakdown" />
      <ul className="grid gap-3">
        {displayMetrics.map((m) => {
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
                  <p className="text-xs text-muted-foreground">
                    Confidence{" "}
                    {analysisResult.confidence === null ? "unavailable" : `${m.confidence}%`}
                  </p>
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
                      <ProgressBar
                        value={m.confidence}
                        label="Model confidence"
                        right={
                          analysisResult.confidence === null ? "Unavailable" : `${m.confidence}%`
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </ul>

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
