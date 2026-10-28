import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard } from "@/components/vv/glass-card";
import { requireAccount, accountName, accountInitials } from "@/lib/account";
import { updateDisplayName } from "@/lib/saved-reports";
export const Route = createFileRoute("/profile")({
  beforeLoad: requireAccount,
  head: () => ({ meta: [{ title: "Your profile — VisionVitals" }] }),
  component: Profile,
});
function Profile() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [name, setName] = useState(user.display_name ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <AppShell>
      <PageHeader title="Your profile" subtitle="Your account details" />
      <GlassCard className="p-6">
        <span className="aurora grid size-16 place-items-center rounded-2xl text-xl font-bold">
          {accountInitials(user)}
        </span>
        <h2 className="mt-4 break-words text-xl font-semibold">{accountName(user)}</h2>
        <p className="mt-2 break-words text-sm text-muted-foreground">{user.email}</p>
        <form
          className="mt-6 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending) return;
            setPending(true);
            setSaved(false);
            setError(null);
            try {
              await updateDisplayName({ data: name });
              await router.invalidate();
              setSaved(true);
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Your name could not be saved.");
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="text-sm">
            Display name
            <input
              aria-label="Display name"
              autoComplete="name"
              maxLength={120}
              disabled={pending}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
              className="glass mt-2 w-full rounded-xl p-3"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Leave blank to display your email address. This name is saved to your account.
          </p>
          {error ? (
            <p role="alert" className="text-sm text-warning">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p role="status" className="text-sm text-secondary">
              Profile saved.
            </p>
          ) : null}
          <button disabled={pending} type="submit" className="aurora rounded-2xl p-4 font-semibold">
            {pending ? "Saving…" : "Save profile"}
          </button>
        </form>
      </GlassCard>
      <Link to="/settings" className="mt-5 inline-block text-secondary">
        Account settings
      </Link>
    </AppShell>
  );
}
