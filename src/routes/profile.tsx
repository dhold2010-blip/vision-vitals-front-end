import { getCurrentUser } from "@/lib/auth";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Save, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { getMyProfile, updateMyProfile } from "@/lib/records";

export const Route = createFileRoute("/profile")({
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  loader: () => getMyProfile(),
  head: () => ({
    meta: [
      { title: "Your profile — VisionVitals AI" },
      {
        name: "description",
        content: "View and update the name and timezone saved to your VisionVitals account.",
      },
    ],
  }),
  component: Profile,
});

function Profile() {
  const profile = Route.useLoaderData();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.profile.display_name ?? "");
  const [timezone, setTimezone] = useState(profile.profile.timezone ?? "");
  const [saving, setSaving] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateMyProfile({ data: { display_name: displayName.trim() || null, timezone: timezone.trim() || null } });
      await router.invalidate();
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const visibleName = profile.profile.display_name?.trim() || profile.user.email;

  return (
    <AppShell>
      <div className="animate-rise mb-6 flex items-center justify-between">
        <Link
          to="/settings"
          aria-label="Back to settings"
          className="press glass grid size-10 place-items-center rounded-full"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="text-xs text-muted-foreground">Account profile</span>
      </div>

      <GlassCard className="animate-scale-in p-7 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-[28px] aurora">
          <UserRound className="size-8 text-primary-foreground" />
        </span>
        <h1 className="mt-5 break-all text-xl font-extrabold tracking-tight">{visibleName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{profile.user.email}</p>
        <p className="mt-2 text-xs text-muted-foreground">Role: {profile.user.role.toLowerCase()}</p>
      </GlassCard>

      <SectionTitle className="mt-8 mb-3" title="Personal details" />
      <GlassCard className="p-5">
        <form className="grid gap-4" onSubmit={saveProfile}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={120}
              autoComplete="name"
              placeholder="How should we address you?"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none focus:border-secondary"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Timezone</span>
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              maxLength={64}
              placeholder="e.g. Asia/Kolkata"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none focus:border-secondary"
            />
            <span className="text-xs text-muted-foreground">
              Optional IANA timezone identifier. This field does not change your device clock.
            </span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="press flex items-center justify-center gap-2 rounded-2xl aurora px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </GlassCard>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Only the account fields supported by the current backend are editable here. No age, weight, body-composition or medical details are fabricated.
      </p>
    </AppShell>
  );
}
