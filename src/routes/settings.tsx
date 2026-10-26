import { getCurrentUser } from "@/lib/auth";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronRight, FileText, LogOut, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { getMyProfile } from "@/lib/records";
import { listMyDevices, registerBrowserDevice, revokeMyDevice } from "@/lib/devices";
import { logoutAccount } from "@/lib/auth";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  loader: async () => {
    const [account, devices] = await Promise.all([getMyProfile(), listMyDevices()]);
    return { account, devices };
  },
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
  const { account, devices } = Route.useLoaderData();
  const { user, profile } = account;
  const navigate = useNavigate();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const displayName = profile.display_name?.trim() || user.email;

  async function registerThisBrowser() {
    if (registering) return;
    setRegistering(true);
    try {
      const result = await registerBrowserDevice();
      toast.success(result.alreadyRegistered ? "This browser is already registered." : "This browser is now registered for camera scans.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not register this browser.");
    } finally {
      setRegistering(false);
    }
  }

  async function revokeDevice(id: string) {
    if (revoking) return;
    if (!window.confirm("Revoke scan access for this device? This cannot be undone.")) return;
    setRevoking(id);
    try {
      await revokeMyDevice({ data: { id } });
      toast.success("Device access revoked.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke this device.");
    } finally {
      setRevoking(null);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await logoutAccount();
      if (result.remoteInvalidated) {
        toast.success("You have been signed out.");
      } else {
        toast.warning("Signed out on this browser, but server session revocation could not be confirmed.");
      }
      await navigate({ to: "/auth", replace: true });
      await router.invalidate();
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

      <SectionTitle className="mt-8 mb-3" title="Trusted scan devices" />
      <GlassCard className="p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Register this browser explicitly before scanning. Each registration belongs to your account, and you can revoke it here. Registering a browser does not approve other browsers or devices.
        </p>
        <button
          type="button"
          disabled={registering}
          onClick={() => void registerThisBrowser()}
          className="press mt-4 w-full rounded-2xl aurora px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {registering ? "Registering…" : "Register this browser"}
        </button>
        <div className="mt-4 grid gap-3">
          {devices.length ? devices.map((device) => (
            <div key={device.id} className="flex items-start gap-3 rounded-xl border border-white/10 p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-secondary" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{device.device_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {device.status} · registered {new Date(device.created_at).toLocaleDateString()}
                </p>
              </div>
              {device.status !== "REVOKED" ? (
                <button
                  type="button"
                  disabled={revoking !== null}
                  onClick={() => void revokeDevice(device.id)}
                  className="text-xs font-semibold text-destructive disabled:opacity-50"
                >
                  {revoking === device.id ? "Revoking…" : "Revoke"}
                </button>
              ) : null}
            </div>
          )) : (
            <p className="text-xs text-muted-foreground">No devices registered to this account yet.</p>
          )}
        </div>
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
