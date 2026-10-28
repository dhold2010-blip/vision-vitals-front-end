import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { Chip, GlassCard } from "@/components/vv/glass-card";
import { ProgressRing } from "@/components/vv/progress";
import { history as seed } from "@/lib/vitals";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Scan history — VisionVitals AI" },
      {
        name: "description",
        content: "Search, filter and manage every past body scan on a clean animated timeline.",
      },
      { property: "og:title", content: "Scan history — VisionVitals AI" },
      { property: "og:description", content: "Your full timeline of AI body scans." },
    ],
  }),
  component: History,
});

const filters = ["All", "Full body", "Face only", "Posture"] as const;

function History() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [removed, setRemoved] = useState<string[]>([]);

  const items = useMemo(
    () =>
      seed
        .filter((s) => !removed.includes(s.id))
        .filter((s) => (filter === "All" ? true : s.tag === filter))
        .filter((s) =>
          query.trim()
            ? `${s.date} ${s.time} ${s.tag} ${s.score}`.toLowerCase().includes(query.toLowerCase())
            : true,
        ),
    [query, filter, removed],
  );

  return (
    <AppShell>
      <p className="mb-5 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground">
        Sample dashboard data — these numbers are not measurements from your camera scan. Your real
        photo report appears after scanning.
      </p>
      <PageHeader
        eyebrow="Timeline"
        title="Scan history"
        subtitle={`${items.length} scans stored on this device`}
      />

      <label className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by date, type or score"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Search scans"
        />
      </label>

      <div className="mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        {filters.map((f) => (
          <Chip key={f} active={f === filter} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      <ol className="relative mt-6 grid gap-3 pl-6">
        <span className="absolute top-2 bottom-2 left-[7px] w-px bg-gradient-to-b from-secondary/60 via-primary/40 to-transparent" />
        {items.map((scan, i) => (
          <li
            key={scan.id}
            className="animate-rise relative"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="absolute top-8 -left-[22px] size-3 rounded-full border-2 border-background bg-secondary" />
            <GlassCard className="p-4" interactive>
              <div className="flex items-center gap-4">
                <Link to="/results" className="flex flex-1 items-center gap-4">
                  <ProgressRing value={scan.score} size={56} stroke={5} gradientId={`h-${scan.id}`}>
                    <span className="text-sm font-bold tabular-nums">{scan.score}</span>
                  </ProgressRing>
                  <div>
                    <p className="text-sm font-semibold">
                      {scan.date} · {scan.time}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scan.tag} · BMI {scan.bmi} · posture {scan.posture}%
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={`Export scan ${scan.id}`}
                  onClick={() => toast.success(`Exported ${scan.id}.pdf`)}
                  className="press grid size-9 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:text-foreground"
                >
                  <Download className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete scan ${scan.id}`}
                  onClick={() => {
                    setRemoved((r) => [...r, scan.id]);
                    toast("Scan deleted", {
                      action: {
                        label: "Undo",
                        onClick: () => setRemoved((r) => r.filter((id) => id !== scan.id)),
                      },
                    });
                  }}
                  className="press grid size-9 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </GlassCard>
          </li>
        ))}
        {items.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-sm font-semibold">No scans match that filter</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try another type or clear your search.
            </p>
          </GlassCard>
        ) : null}
      </ol>
    </AppShell>
  );
}
