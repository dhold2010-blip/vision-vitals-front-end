import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { getCurrentUser } from "@/lib/auth";
import { getMyAnalyses, type VisionAnalysis } from "@/lib/vision-vitals";

export const Route = createFileRoute("/reports")({
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Progress reports — VisionVitals AI" }, { name: "description", content: "Review analyses saved to your account." }] }),
  component: Reports,
});

function Reports() {
  const [records, setRecords] = useState<VisionAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getMyAnalyses().then((items) => active && setRecords(items)).catch((e: unknown) => active && setError(e instanceof Error ? e.message : "Could not load reports.")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  const completed = records.filter((item) => item.status.toLowerCase() === "completed");
  const withObservations = records.filter((item) => Boolean(item.result?.observation));
  const dates = records.map((item) => new Date(item.created_at)).filter((date) => !Number.isNaN(date.getTime()));
  const first = dates.length ? Math.min(...dates.map((date) => date.getTime())) : null;
  const latest = dates.length ? Math.max(...dates.map((date) => date.getTime())) : null;

  return (
    <AppShell>
      <PageHeader eyebrow="Account analytics" title="Reports" subtitle="Only saved analyses from your account are included." />
      {error ? <GlassCard className="border border-destructive/40 p-4"><p className="text-sm text-destructive">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-2 text-sm font-semibold text-secondary">Try again</button></GlassCard> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <GlassCard className="p-5"><p className="text-xs text-muted-foreground">Saved analyses</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? "—" : records.length}</p></GlassCard>
        <GlassCard className="p-5"><p className="text-xs text-muted-foreground">Completed</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? "—" : completed.length}</p></GlassCard>
        <GlassCard className="col-span-2 p-5 sm:col-span-1"><p className="text-xs text-muted-foreground">With observations</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? "—" : withObservations.length}</p></GlassCard>
      </div>
      <SectionTitle className="mt-8 mb-3" title="Your timeline" />
      <GlassCard className="p-5">
        {loading ? <p className="text-sm text-muted-foreground">Loading your report data…</p> : records.length ? <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">First saved analysis</p><p className="mt-1 text-sm font-semibold">{first === null ? "—" : new Date(first).toLocaleString()}</p></div><div><p className="text-xs text-muted-foreground">Most recent analysis</p><p className="mt-1 text-sm font-semibold">{latest === null ? "—" : new Date(latest).toLocaleString()}</p></div></div> : <p className="text-sm leading-relaxed text-muted-foreground">There are no saved analyses to chart yet. After a successful scan, this report will update with data from your account. We do not invent health scores, body measurements, or trends.</p>}
      </GlassCard>
      <SectionTitle className="mt-8 mb-3" title="Analysis observations" />
      {withObservations.length ? <ul className="grid gap-3">{withObservations.slice(0, 10).map((item) => <li key={item.id}><GlassCard className="p-4"><p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()} · {item.status}</p><p className="mt-2 text-sm leading-relaxed">{item.result?.observation}</p>{item.result?.confidence != null ? <p className="mt-2 text-xs text-secondary">Confidence {Math.round(item.result.confidence * 100)}%</p> : null}</GlassCard></li>)}</ul> : <GlassCard className="p-5"><Sparkles className="size-4 text-accent" /><p className="mt-3 text-sm text-muted-foreground">Your analysis observations will appear here when the backend has saved them.</p><Link to="/scan" className="mt-3 inline-block text-sm font-semibold text-secondary">Start a scan</Link></GlassCard>}
    </AppShell>
  );
}
