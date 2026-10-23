import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { Chip, GlassCard } from "@/components/vv/glass-card";
import { getCurrentUser } from "@/lib/auth";
import { deleteMyAnalysis, getMyAnalyses, type VisionAnalysis } from "@/lib/vision-vitals";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Scan history — VisionVitals AI" }, { name: "description", content: "Your saved VisionVitals analyses." }] }),
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw (await import("@tanstack/react-router")).redirect({ to: "/auth" });
  },
  component: History,
});

const filters = ["All", "Completed", "Processing", "Failed"] as const;
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function History() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [records, setRecords] = useState<VisionAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try { setRecords(await getMyAnalyses()); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load your scans."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  const items = useMemo(() => records
    .filter((scan) => filter === "All" || scan.status.toLowerCase() === filter.toLowerCase())
    .filter((scan) => !query.trim() || `${scan.status} ${scan.result?.observation ?? ""} ${scan.created_at}`.toLowerCase().includes(query.toLowerCase())),
  [records, filter, query]);

  async function remove(id: string) {
    setDeleting(id);
    try {
      await deleteMyAnalysis({ data: { id } });
      setRecords((current) => current.filter((scan) => scan.id !== id));
      toast.success("Scan deleted from your account");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete this scan.");
    } finally { setDeleting(null); }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Timeline" title="Scan history" subtitle={loading ? "Loading your saved scans…" : `${items.length} saved analyses in your account`} />
      <label className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search date, status or observation" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Search scans" />
      </label>
      <div className="mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        {filters.map((f) => <Chip key={f} active={f === filter} onClick={() => setFilter(f)}>{f}</Chip>)}
      </div>
      {error ? <GlassCard className="mt-5 border border-destructive/40 p-4"><p className="text-sm text-destructive">{error}</p><button type="button" onClick={() => void reload()} className="mt-3 text-sm font-semibold text-secondary">Try again</button></GlassCard> : null}
      <ol className="relative mt-6 grid gap-3 pl-6">
        {items.map((scan, i) => (
          <li key={scan.id} className="animate-rise relative" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="absolute top-8 -left-[22px] size-3 rounded-full border-2 border-background bg-secondary" />
            <GlassCard className="p-4" interactive>
              <div className="flex items-start gap-3">
                <Link to="/results" state={{ result: { analysis: scan } }} className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{dateLabel(scan.created_at)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Status: {scan.status}</p>
                  <p className="mt-2 line-clamp-3 text-sm">{scan.result?.observation || "No analysis observation was saved for this scan."}</p>
                  {scan.result?.confidence != null ? <p className="mt-2 text-xs text-secondary">Confidence {Math.round(scan.result.confidence * 100)}%</p> : null}
                </Link>
                <button type="button" disabled={deleting === scan.id} aria-label="Delete scan" onClick={() => void remove(scan.id)} className="press grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:text-destructive disabled:opacity-50"><Trash2 className="size-4" /></button>
              </div>
            </GlassCard>
          </li>
        ))}
      </ol>
      {!loading && items.length === 0 && !error ? <GlassCard className="mt-5 p-8 text-center"><p className="text-sm font-semibold">No saved scans yet</p><p className="mt-1 text-xs text-muted-foreground">Your real scans will appear here after a successful analysis.</p><Link to="/scan" className="mt-4 inline-block text-sm font-semibold text-secondary">Start a scan</Link></GlassCard> : null}
    </AppShell>
  );
}
