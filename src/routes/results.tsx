import { createFileRoute, Link, redirect, useLocation } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, CircleHelp } from "lucide-react";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { LocalizedDate } from "@/components/vv/localized-date";
import { getCurrentUser } from "@/lib/auth";
import { getAnalysis, type AnalysisRecord } from "@/lib/records";
import type { VisionCaptureResult } from "@/lib/vision-vitals";

declare module "@tanstack/history" {
  interface HistoryState {
    result?: VisionCaptureResult;
  }
}

export const Route = createFileRoute("/results")({
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    analysisId:
      typeof search.analysisId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(search.analysisId)
        ? search.analysisId
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ analysisId: search.analysisId }),
  loader: ({ deps }) =>
    deps.analysisId ? getAnalysis({ data: { id: deps.analysisId } }) : null,
  head: () => ({
    meta: [
      { title: "Scan result — VisionVitals AI" },
      {
        name: "description",
        content: "Review the saved analysis, warnings and limitations returned by VisionVitals.",
      },
    ],
  }),
  component: Results,
});

function Results() {
  const location = useLocation();
  const savedAnalysis = Route.useLoaderData() as AnalysisRecord | null;
  const result = location.state?.result;
  const analysis = savedAnalysis ?? result?.analysis ?? null;
  const observation = analysis?.result;
  const createdAt = result?.capture?.created_at ?? analysis?.created_at;

  return (
    <AppShell>
      <PageHeader
        eyebrow={createdAt ? <LocalizedDate value={createdAt} /> : "Saved analysis"}
        title="Your analysis"
        subtitle={observation?.result_status ?? analysis?.status ?? "No analysis selected"}
      />

      {analysis ? (
        <>
          <GlassCard className="p-6">
            <div className="flex items-start gap-3">
              {observation?.warnings.length ? (
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-300" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{observation?.model ?? "Analysis service"}</p>
                <p className="mt-2 text-sm leading-relaxed">
                  {observation?.observation ?? "The service has not returned an observation for this scan."}
                </p>
                {observation?.confidence != null ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Model confidence: {Math.round(observation.confidence * 100)}%
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Result status: {observation?.result_status ?? analysis.status ?? "UNAVAILABLE"}
                </p>
              </div>
            </div>
          </GlassCard>

          {observation?.warnings.length ? (
            <>
              <SectionTitle className="mt-6 mb-3" title="Warnings" />
              <GlassCard className="p-5">
                <ul className="grid gap-2">
                  {observation.warnings.map((warning, index) => (
                    <li key={index + "-" + warning} className="flex gap-2 text-sm leading-relaxed">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </>
          ) : null}

          {observation?.limitations.length ? (
            <>
              <SectionTitle className="mt-6 mb-3" title="Limitations" />
              <GlassCard className="p-5">
                <ul className="grid gap-2">
                  {observation.limitations.map((limitation, index) => (
                    <li key={index + "-" + limitation} className="text-sm leading-relaxed text-muted-foreground">
                      {limitation}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </>
          ) : null}

          <Link to="/history" className="mt-5 inline-flex rounded-xl border border-border px-4 py-3 text-sm font-semibold">
            Back to scan history
          </Link>
        </>
      ) : (
        <GlassCard className="p-6">
          <CircleHelp className="size-5 text-secondary" />
          <p className="mt-3 text-sm font-semibold">
            {result?.capture ? "Capture completed without a saved analysis" : "No scan result is open"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {result?.capture
              ? "The service did not return an analysis record for this capture. No measurements are filled in here."
              : "Open a saved record from Scan history or run a new scan. This screen will not substitute demo measurements for a missing result."}
          </p>
          <Link to="/history" className="mt-4 inline-flex rounded-xl aurora px-4 py-3 text-sm font-semibold text-primary-foreground">
            Open scan history
          </Link>
        </GlassCard>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        VisionVitals results may be incomplete or uncertain. They are not a medical diagnosis and should not replace professional medical advice.
      </p>
    </AppShell>
  );
}
