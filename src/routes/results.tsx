import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard } from "@/components/vv/glass-card";
import type { VisionCaptureResult } from "@/lib/vision-vitals";

declare module "@tanstack/history" { interface HistoryState { result?: VisionCaptureResult } }

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Scan results — VisionVitals AI" }] }),
  component: Results,
});

function Results() {
  const location = useLocation();
  const result = location.state?.result;
  const analysis = result?.analysis;
  const detail = analysis?.result;
  const createdAt = result?.capture?.created_at || analysis?.created_at;
  return (
    <AppShell>
      <PageHeader eyebrow={createdAt ? new Date(createdAt).toLocaleString() : "Analysis details"} title="Your analysis" subtitle={analysis ? `Status: ${analysis.status}` : "Saved scan details"} />
      {!analysis ? (
        <GlassCard className="p-6">
          <CircleAlert className="size-6 text-warning" />
          <p className="mt-3 text-sm font-semibold">No analysis selected</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Open a saved scan from your history. Missing results are not replaced with sample health measurements.</p>
          <Link to="/history" className="mt-4 inline-block text-sm font-semibold text-secondary">Open scan history</Link>
        </GlassCard>
      ) : (
        <>
          <GlassCard className="animate-scale-in p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">{detail?.result_status || analysis.status}</p>
            <p className="mt-3 text-sm leading-relaxed">{detail?.observation || "The analysis did not return an observation."}</p>
            {detail?.model ? <p className="mt-3 text-xs text-muted-foreground">Model: {detail.model}</p> : null}
            {detail?.confidence != null ? <p className="mt-2 text-xs text-muted-foreground">Model confidence: {Math.round(detail.confidence * 100)}%</p> : null}
          </GlassCard>
          {detail?.warnings?.length ? <GlassCard className="mt-4 p-5"><p className="text-sm font-semibold">Warnings</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{detail.warnings.map((item, i) => <li key={i}>{item}</li>)}</ul></GlassCard> : null}
          {detail?.limitations?.length ? <GlassCard className="mt-4 p-5"><p className="text-sm font-semibold">Limitations</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{detail.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul></GlassCard> : null}
        </>
      )}
      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">Camera-based estimates can be uncertain and are not a medical diagnosis.</p>
      <div className="mt-5 flex gap-3"><Link to="/history" className="press glass flex-1 rounded-2xl px-4 py-3 text-center text-sm font-semibold">Scan history</Link><Link to="/scan" className="press flex-1 rounded-2xl aurora px-4 py-3 text-center text-sm font-semibold text-primary-foreground">New scan</Link></div>
    </AppShell>
  );
}
