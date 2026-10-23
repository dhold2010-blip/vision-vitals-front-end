import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ChevronLeft, Pencil, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { getCurrentUser } from "@/lib/auth";
import { getMyProfile, updateMyProfile, type MyProfile } from "@/lib/vision-vitals";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — VisionVitals AI" },
      { name: "description", content: "View and edit your VisionVitals account profile." },
    ],
  }),
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  component: Profile,
});

function Profile() {
  const [data, setData] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((value) => {
        if (!active) return;
        setData(value);
        setName(value.profile.display_name ?? "");
        setTimezone(value.profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "Could not load your profile."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const profile = await updateMyProfile({ data: { display_name: name, timezone } });
      setData((current) => current ? { ...current, profile } : current);
      setEditing(false);
      toast.success("Profile saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = data?.profile.display_name?.trim() || "Your profile";
  const initials = displayName === "Your profile" ? "VV" : displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <div className="animate-rise mb-6 flex items-center justify-between">
        <Link to="/settings" aria-label="Back" className="press glass grid size-10 place-items-center rounded-full">
          <ChevronLeft className="size-4" />
        </Link>
        <button type="button" onClick={() => { setEditing((value) => !value); setError(null); }} className="press glass flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium">
          <Pencil className="size-3.5 text-secondary" /> {editing ? "Cancel" : "Edit profile"}
        </button>
      </div>

      <GlassCard className="animate-scale-in p-7 text-center">
        <span className="mx-auto grid size-24 place-items-center rounded-[32px] aurora text-2xl font-extrabold text-primary-foreground">{initials}</span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{loading ? "Loading profile…" : displayName}</h1>
        <p className="text-sm text-muted-foreground">{data?.user.email ?? ""}</p>
        {editing ? (
          <div className="mt-6 grid gap-3 text-left">
            <label className="grid gap-1 text-xs text-muted-foreground">Display name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Enter your name" className="rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm text-foreground outline-none focus:border-secondary" />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">Time zone
              <input value={timezone} onChange={(e) => setTimezone(e.target.value)} maxLength={64} placeholder="Asia/Kolkata" className="rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm text-foreground outline-none focus:border-secondary" />
            </label>
            <button type="button" disabled={saving || !name.trim()} onClick={() => void save()} className="press rounded-xl aurora px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>
          </div>
        ) : null}
      </GlassCard>

      {error ? <GlassCard className="mt-4 border border-destructive/40 p-4"><p className="text-sm text-destructive">{error}</p></GlassCard> : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GlassCard className="p-4"><p className="text-xs text-muted-foreground">Account status</p><p className="mt-1 text-sm font-semibold">{data?.user.is_active ? "Active" : loading ? "Loading…" : "Inactive"}</p></GlassCard>
        <GlassCard className="p-4"><p className="text-xs text-muted-foreground">Time zone</p><p className="mt-1 break-words text-sm font-semibold">{data?.profile.timezone || "Not set"}</p></GlassCard>
      </div>

      <SectionTitle className="mt-8 mb-3" title="Personal measurements" />
      <GlassCard className="p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">Height, weight, age, and other measurements will appear here only when you add verified data. VisionVitals won't fill your profile with example measurements.</p>
      </GlassCard>

      <SectionTitle className="mt-8 mb-3" title="Goal" />
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white/6"><Target className="size-4 text-secondary" /></span>
          <div><p className="text-sm font-semibold">No goal saved</p><p className="text-xs text-muted-foreground">You can add goal tracking when that feature is connected to your account.</p></div>
        </div>
      </GlassCard>
    </AppShell>
  );
}
