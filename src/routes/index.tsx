import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowUpRight, Bell, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/vv/app-shell";
import { Chip, GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { getCurrentUser } from "@/lib/auth";
import { getMyAnalyses, getMyProfile, type MyProfile, type VisionAnalysis } from "@/lib/vision-vitals";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [
    { title: "VisionVitals AI — Camera-based analysis" },
    { name: "description", content: "Your private VisionVitals account and saved camera analyses." },
  ] }),
  component: Home,
});

const aiTips = [
  "Use bright, even lighting and keep the camera steady.",
  "Make sure the photo is clear and the subject is fully in frame.",
  "Review each analysis carefully; camera estimates are not a medical diagnosis.",
];
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function Home() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [analyses, setAnalyses] = useState<VisionAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getMyProfile(), getMyAnalyses()])
      .then(([p, scans]) => {
        if (!active) return;
        setProfile(p);
        setAnalyses(scans);
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "Could not load your account data."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const name = profile?.profile.display_name?.trim() || "there";
  const initials = profile?.profile.display_name?.trim()
    ? profile.profile.display_name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
    : "VV";
  const latest = analyses[0];

  return (
    <AppShell>
      <div className="animate-rise flex items-center justify-between">
        <Link to="/profile" className="press flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl aurora text-base font-bold text-primary-foreground">{initials}</span>
          <span className="text-left"><span className="block text-xs text-muted-foreground">Welcome,</span><span className="block text-[17px] font-semibold tracking-tight">{name}</span></span>
        </Link>
        <span className="glass grid size-10 place-items-center rounded-full" aria-label="Notifications"><Bell className="size-4" /></span>
      </div>

      {error ? <GlassCard className="mt-5 border border-destructive/40 p-4"><p className="text-sm text-destructive">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-2 text-sm font-semibold text-secondary">Reload</button></GlassCard> : null}

      <GlassCard className="animate-scale-in mt-6 overflow-hidden p-6">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-secondary uppercase">Your account overview</p>
        <p className="mt-3 text-2xl font-bold tracking-tight">{loading ? "Loading your scans…" : `${analyses.length} saved ${analyses.length === 1 ? "analysis" : "analyses"}`}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{latest ? `Latest analysis: ${dateLabel(latest.created_at)} · status ${latest.status}.` : "Your dashboard will show real scan results here after your first successful analysis."}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/scan" className="press inline-flex items-center gap-2 rounded-2xl aurora px-4 py-3 text-sm font-semibold text-primary-foreground"><Sparkles className="size-4" /> Start a scan <ArrowUpRight className="size-4" /></Link>
          <Link to="/profile" className="press glass inline-flex items-center rounded-2xl px-4 py-3 text-sm font-semibold">Edit profile</Link>
        </div>
      </GlassCard>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <GlassCard className="p-4"><p className="text-xs text-muted-foreground">Account</p><p className="mt-2 text-sm font-semibold">{profile?.user.is_active ? "Active" : loading ? "Loading…" : "Unavailable"}</p></GlassCard>
        <GlassCard className="p-4"><p className="text-xs text-muted-foreground">Saved scans</p><p className="mt-2 text-lg font-bold tabular-nums">{loading ? "—" : analyses.length}</p></GlassCard>
        <GlassCard className="col-span-2 p-4 sm:col-span-1"><p className="text-xs text-muted-foreground">Profile name</p><p className="mt-2 truncate text-sm font-semibold">{profile?.profile.display_name || "Not set"}</p></GlassCard>
      </div>

      <SectionTitle className="mt-8 mb-3" title="Scan tips" action={<span className="text-xs text-secondary">For better captures</span>} />
      <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
        {aiTips.map((tip) => <GlassCard key={tip} className="w-[250px] shrink-0 snap-start p-5"><Sparkles className="size-4 text-accent" /><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tip}</p></GlassCard>)}
      </div>

      <SectionTitle className="mt-8 mb-3" title="Recent analyses" action={<Link to="/history" className="text-xs font-medium text-secondary">See all</Link>} />
      {analyses.length ? <ul className="grid gap-3">{analyses.slice(0, 3).map((scan) => <GlassCard as="li" key={scan.id} className="p-4" interactive><Link to="/results" state={{ result: { analysis: scan } }} className="flex items-start gap-3"><span className="mt-1 size-2.5 shrink-0 rounded-full bg-secondary" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{dateLabel(scan.created_at)}</span><span className="mt-1 block text-xs text-muted-foreground">Status: {scan.status}</span><span className="mt-2 block line-clamp-2 text-sm">{scan.result?.observation || "No observation saved."}</span></span><Chip>{scan.status}</Chip></Link></GlassCard>)}</ul> : <GlassCard className="p-6 text-center"><p className="text-sm font-semibold">{loading ? "Loading analyses…" : "No analyses yet"}</p><p className="mt-1 text-xs text-muted-foreground">Only scans saved to your account will appear here.</p></GlassCard>}
    </AppShell>
  );
}
