import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { accountName, requireAccount } from "@/lib/account";
import { logoutAccount } from "@/lib/auth";
export const Route = createFileRoute("/settings")({
  beforeLoad: requireAccount,
  head: () => ({ meta: [{ title: "Settings — VisionVitals" }] }),
  component: SettingsScreen,
});
function SettingsScreen() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Account and photo processing" />
      <GlassCard className="p-5">
        <Link to="/profile" className="block">
          <p className="break-words font-semibold">{accountName(user)}</p>
          <p className="mt-2 break-words text-sm text-muted-foreground">{user.email}</p>
          <span className="mt-3 inline-block text-sm text-secondary">Edit display name</span>
        </Link>
      </GlassCard>
      <SectionTitle title="How photos are processed" className="mt-8 mb-3" />
      <GlassCard className="space-y-3 p-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          When you start a scan, one camera image is uploaded to the VisionVitals backend and sent
          to Google Gemini for visual analysis. Processing is not performed entirely on your phone.
        </p>
        <p>
          The report is saved to your account. Uploaded images use server storage; their
          availability can depend on the hosting service. Deleting a report also removes its stored
          image from this backend.
        </p>
        <Link to="/history" className="block text-secondary">
          Manage your saved reports
        </Link>
      </GlassCard>
      <SectionTitle title="Camera help" className="mt-8 mb-3" />
      <GlassCard className="space-y-3 p-5 text-sm text-muted-foreground">
        <p>
          Allow camera access in your browser, use even lighting, and keep the camera steady. If
          camera access fails, allow permission and tap Restart scan.
        </p>
        <p>
          Results describe the image. Heart rate, height, weight, and other unsupported measurements
          are marked as not measured.
        </p>
        <p>
          Theme: dark · Language: English. Reminders and additional preferences are not available in
          this version.
        </p>
      </GlassCard>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-warning">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className="glass mt-6 w-full rounded-2xl p-4 font-semibold text-destructive"
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const result = await logoutAccount();
            if (!result.serverRevoked)
              toast.warning("Signed out on this device. Server sign-out could not be confirmed.");
            router.options.context?.queryClient.clear();
            await navigate({ to: "/auth", replace: true });
            await router.invalidate();
          } catch {
            setError(
              "Sign-out could not be confirmed. Please reload the page and sign in again if needed.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Signing out…" : "Log out"}
      </button>
    </AppShell>
  );
}
