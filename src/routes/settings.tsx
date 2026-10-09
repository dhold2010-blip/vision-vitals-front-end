import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, FileText, LogOut, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { getMyProfile } from "@/lib/records";
import { logoutAccount } from "@/lib/auth";

export const Route = createFileRoute("/settings")({
  loader: () => getMyProfile(),
  head: () => ({
    meta: [
      { title: "Settings — VisionVitals AI" },
      {
        name: "description",
        content: "Manage your VisionVitals account, privacy information and installation.",
      },
    ],
  }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const { user, profile } = Route.useLoaderData();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const displayName = profile.display_name?.trim() || user.email;

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logoutAccount();
      toast.success("You have been signed out.");
      await navigate({ to: "/auth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Account" title="Settings" subtitle="Manage your account and app access" />

      <GlassCard className="animate-scale-in p-5">
        <Link to="/profile" className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl aurora text-lg font-bold text-primary-foreground">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </GlassCard>

      <SectionTitle className="mt-8 mb-3" title="Account" />
      <GlassCard className="divide-y divide-border overflow-hidden">
        <Link to="/profile" className="flex items-center gap-3.5 px-5 py-4">
          <UserRound className="size-4 text-secondary" />
          <span className="flex-1">
            <span className="block text-sm font-medium">Personal profile</span>
            <span className="block text-xs text-muted-foreground">Update display name and timezone</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link to="/history" className="flex items-center gap-3.5 px-5 py-4">
          <FileText className="size-4 text-secondary" />
          <span className="flex-1">
            <span className="block text-sm font-medium">Saved analyses</span>
            <span className="block text-xs text-muted-foreground">View or delete records stored in your account</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </GlassCard>

      <SectionTitle className="mt-8 mb-3" title="Privacy and installation" />
      <GlassCard className="divide-y divide-border overflow-hidden">
        <div className="flex items-start gap-3.5 px-5 py-4">
          <ShieldCheck className="mt-0.5 size-4 text-secondary" />
          <div>
            <p className="text-sm font-medium">Secure account access</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Your saved analyses are requested through the signed-in account. Camera images are sent to the VisionVitals backend for processing; they are not guaranteed to stay only on this phone.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3.5 px-5 py-4">
          <Smartphone className="mt-0.5 size-4 text-secondary" />
          <div>
            <p className="text-sm font-medium">Install on iPhone</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Open VisionVitals in Safari, tap Share, choose Add to Home Screen, then tap Add. Installation does not by itself approve a device or create a native iOS app.
            </p>
          </div>
        </div>
      </GlassCard>

      <button
        type="button"
        disabled={signingOut}
        onClick={() => void signOut()}
        className="press glass mt-6 flex w-full items-center justify-center gap-2 rounded-3xl py-4 text-sm font-semibold text-destructive disabled:opacity-50"
      >
        <LogOut className="size-4" /> {signingOut ? "Signing out…" : "Log out"}
      </button>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        VisionVitals AI · Web app
      </p>
    </AppShell>
  );
}
