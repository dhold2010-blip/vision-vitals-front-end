import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronRight, FileText, Globe, LogOut, Moon, Ruler, ShieldCheck, CircleQuestionMark } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { logoutAccount } from "@/lib/auth";
import { getMyProfile, type MyProfile } from "@/lib/vision-vitals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — VisionVitals AI" }, { name: "description", content: "Account, appearance and privacy settings." }] }),
  component: SettingsScreen,
});

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("press relative h-7 w-12 rounded-full border transition-colors duration-300", checked ? "border-transparent aurora" : "border-border bg-white/8")}><span className={cn("absolute top-0.5 size-5.5 rounded-full bg-white shadow transition-all duration-300 ease-[var(--ease-smooth)]", checked ? "left-[calc(100%-1.5rem)]" : "left-0.5")} /></button>;
}

function Row({ icon: Icon, label, hint, right, onClick }: { icon: typeof Bell; label: string; hint?: string; right?: React.ReactNode; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return <Comp {...(onClick ? { type: "button" as const, onClick } : {})} className="flex w-full items-center gap-3.5 px-5 py-4 text-left"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6"><Icon className="size-4 text-secondary" /></span><span className="flex-1"><span className="block text-sm font-medium">{label}</span>{hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}</span>{right ?? <ChevronRight className="size-4 text-muted-foreground" />}</Comp>;
}

function SettingsScreen() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [dark, setDark] = useState(true);
  const [notify, setNotify] = useState(true);
  const [metric, setMetric] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getMyProfile().then((value) => active && setProfile(value)).catch(() => active && setProfile(null));
    return () => { active = false; };
  }, []);

  const name = profile?.profile.display_name?.trim() || "Name not set";
  const initials = profile?.profile.display_name?.trim() ? profile.profile.display_name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "VV";

  async function signOut() {
    setBusy(true);
    try {
      await logoutAccount();
      await navigate({ to: "/auth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign out.");
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Preferences" title="Settings" subtitle="Your account and app preferences" />
      <GlassCard className="animate-scale-in p-5" interactive>
        <Link to="/profile" className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl aurora text-lg font-bold text-primary-foreground">{initials}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{name}</span><span className="block truncate text-xs text-muted-foreground">{profile?.user.email || "Loading account…"}</span><span className="mt-1 block text-xs text-muted-foreground">{profile?.profile.timezone || "Time zone not set"}</span></span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </GlassCard>

      <SectionTitle className="mt-8 mb-3" title="Appearance & alerts" />
      <GlassCard className="divide-y divide-border overflow-hidden">
        <Row icon={Moon} label="Dark mode" hint="Visual preference for this session" right={<Switch checked={dark} onChange={setDark} label="Dark mode" />} />
        <Row icon={Bell} label="Scan reminders" hint="Reminder preference for this session" right={<Switch checked={notify} onChange={setNotify} label="Scan reminders" />} />
        <Row icon={Ruler} label="Units" hint={metric ? "Metric · cm / kg" : "Imperial · ft / lb"} right={<Switch checked={metric} onChange={setMetric} label="Units" />} />
        <Row icon={Globe} label="Language" hint="English" />
      </GlassCard>

      <SectionTitle className="mt-8 mb-3" title="Privacy & data" />
      <GlassCard className="divide-y divide-border overflow-hidden">
        <Row icon={ShieldCheck} label="Private account data" hint="Profile and scans are requested for your signed-in account" />
        <Row icon={FileText} label="Terms & privacy policy" hint="Policy links are not configured yet" />
        <Row icon={CircleQuestionMark} label="Help centre" hint="Contact support if a scan fails" />
      </GlassCard>

      <button type="button" disabled={busy} onClick={() => void signOut()} className="press glass mt-6 flex w-full items-center justify-center gap-2 rounded-3xl py-4 text-sm font-semibold text-destructive disabled:opacity-50"><LogOut className="size-4" /> {busy ? "Signing out…" : "Log out"}</button>
      <p className="mt-6 text-center text-[11px] text-muted-foreground">VisionVitals AI · version 2.4.0</p>
    </AppShell>
  );
}
