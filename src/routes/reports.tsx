import { getCurrentUser } from "@/lib/auth";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Activity, AlertTriangle, FileText } from "lucide-react";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { listAnalyses } from "@/lib/records";

export const Route = createFileRoute("/reports")({
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  loader: () => listAnalyses(),
  head: () => ({
    meta: [
      { title: "Reports — VisionVitals AI" },
      {
        name: "description",
        content: "Review the actual analyses and cautions returned by your VisionVitals account.",
      },
    ],
  }),
  component: Reports,
});

function Reports() {
  const analyses = Route.useLoaderData();
  const completed = analyses.filter((item) => item.result !== null).length;
  const withWarnings = analyses.filter((item) => (item.result?.warnings.length ?? 0) > 0).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Account records"
        title="Reports"
        subtitle="A summary of saved analyses returned by the VisionVitals backend"
      />

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <FileText className="size-4 text-secondary" />
          <p className="mt-3 text-2xl font-bold tabular-nums">{analyses.length}</p>
          <p className="text-xs text-muted-foreground">Saved analyses</p>
        </GlassCard>
        <GlassCard className="p-4">
          <Activity className="size-4 text-secondary" />
          <p className="mt-3 text-2xl font-bold tabular-nums">{completed}</p>
          <p className="text-xs text-muted-foreground">With analysis result</p>
        </GlassCard>
      </div>

      {withWarnings > 0 ? (
        <GlassCard className="mt-4 flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-semibold">Review analysis warnings</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {withWarnings} saved {withWarnings === 1 ? "analysis includes" : "analyses include"} warnings returned by the analysis service. Read each result and its limitations carefully.
            </p>
          </div>
        </GlassCard>
      ) : null}

      <SectionTitle className="mt-8 mb-3" title="Analysis timeline" />
      {analyses.length ? (
        <div className="grid gap-3">
          {analyses.map((analysis) => (
            <GlassCard key={analysis.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {new Date(analysis.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {analysis.result?.result_status ?? analysis.status}
                    {analysis.result?.confidence != null
                      ? ` · ${Math.round(analysis.result.confidence * 100)}% confidence`
                      : ""}
                  </p>
                </div>
                {analysis.result?.warnings.length ? (
                  <AlertTriangle className="size-4 shrink-0 text-amber-300" />
                ) : null}
              </div>
              {analysis.result?.observation ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {analysis.result.observation}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  The backend has not returned an observation for this analysis.
                </p>
              )}
              {analysis.result?.limitations.length ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Limitations: {analysis.result.limitations.join(" ")}
                </p>
              ) : null}
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-6">
          <p className="text-sm font-semibold">No reports to show yet</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The backend currently provides analysis records, not a verified time series for health scores, weight, posture or heart rate. This page will not invent charts or measurements.
          </p>
          <Link to="/scan" className="mt-4 inline-flex rounded-xl aurora px-4 py-3 text-sm font-semibold text-primary-foreground">
            Start a scan
          </Link>
        </GlassCard>
      )}
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        AI output may be incomplete or uncertain and is not a medical diagnosis. Follow the limitations provided with each result.
      </p>
    </AppShell>
  );
}
