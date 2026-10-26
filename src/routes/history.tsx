import { getCurrentUser } from "@/lib/auth";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard } from "@/components/vv/glass-card";
import { LocalizedDate } from "@/components/vv/localized-date";
import { deleteAnalysis, listAnalyses, type AnalysisRecord } from "@/lib/records";

export const Route = createFileRoute("/history")({
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  loader: () => listAnalyses(),
  head: () => ({
    meta: [
      { title: "Scan history — VisionVitals AI" },
      {
        name: "description",
        content: "Review your saved VisionVitals analyses from your account.",
      },
    ],
  }),
  component: History,
});

function History() {
  const initialItems = Route.useLoaderData() as AnalysisRecord[];
  const [query, setQuery] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const items = useMemo(
    () =>
      initialItems
        .filter((scan) => !removed.includes(scan.id))
        .filter((scan) =>
          query.trim()
            ? `${scan.status} ${scan.result?.result_status ?? ""} ${scan.result?.observation ?? ""} ${scan.created_at}`
                .toLowerCase()
                .includes(query.trim().toLowerCase())
            : true,
        ),
    [initialItems, query, removed],
  );

  async function removeScan(scan: AnalysisRecord) {
    if (deleting) return;
    if (!window.confirm("Delete this saved analysis and its stored camera image? This cannot be undone.")) return;
    setDeleting(scan.id);
    try {
      await deleteAnalysis({ data: { id: scan.id } });
      setRemoved((current) => [...current, scan.id]);
      toast.success("Scan deleted from your account.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this scan.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your account"
        title="Scan history"
        subtitle={`${items.length} saved ${items.length === 1 ? "analysis" : "analyses"}`}
      />

      <label className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search status, date or observation"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Search saved analyses"
        />
      </label>

      <div className="mt-5 grid gap-3">
        {items.map((scan) => (
          <GlassCard key={scan.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  <LocalizedDate value={scan.created_at} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {scan.result?.result_status ?? scan.status}
                  {scan.result?.confidence != null
                    ? ` · ${Math.round(scan.result.confidence * 100)}% confidence`
                    : ""}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {scan.result?.observation ??
                    "No observation is available for this analysis yet."}
                </p>
                {scan.result?.warnings?.length ? (
                  <p className="mt-2 text-xs text-amber-300">
                    {scan.result.warnings.join(" ")}
                  </p>
                ) : null}
                {scan.result?.limitations?.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Limitations: {scan.result.limitations.join(" ")}
                  </p>
                ) : null}
                <Link
                  to="/results"
                  search={{ analysisId: scan.id }}
                  className="mt-3 inline-flex rounded-xl border border-border px-3 py-2 text-xs font-semibold text-secondary"
                >
                  View saved result
                </Link>
              </div>
              <button
                type="button"
                aria-label="Delete saved analysis"
                disabled={deleting !== null}
                onClick={() => void removeScan(scan)}
                className="press grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </GlassCard>
        ))}
        {items.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-sm font-semibold">
              {initialItems.length === 0 ? "No saved analyses yet" : "No analyses match your search"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {initialItems.length === 0
                ? "Your completed scans will appear here after you sign in and run a scan."
                : "Try a different search term."}
            </p>
          </GlassCard>
        ) : null}
      </div>
    </AppShell>
  );
}
