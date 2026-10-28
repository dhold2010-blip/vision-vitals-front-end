import { ReportDate } from "@/components/vv/report-date";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { accountName, accountInitials, requireAccount } from "@/lib/account";
import { listSavedReports } from "@/lib/saved-reports";

export const Route = createFileRoute("/")({
  beforeLoad: requireAccount,
  loader: () => listSavedReports({ data: 0 }),
  head: () => ({ meta: [{ title: "Your dashboard — VisionVitals" }] }),
  component: Home,
});
function Home() {
  const { user } = Route.useRouteContext();
  const reports = Route.useLoaderData();
  return (
    <AppShell>
      <Link to="/profile" className="mb-6 flex items-center gap-3">
        <span className="aurora grid size-12 place-items-center rounded-2xl font-bold">
          {accountInitials(user)}
        </span>
        <span className="min-w-0 break-words">
          <span className="block text-xs text-muted-foreground">Your account</span>
          {accountName(user)}
        </span>
      </Link>
      <PageHeader title="Your dashboard" subtitle="Photo observations saved to your account" />
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold">Ready for a photo scan?</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Get observations about framing, lighting, and visible body position. Health measurements
          are not produced by this scan.
        </p>
        <Link to="/scan" className="aurora mt-5 inline-block rounded-2xl px-6 py-3 font-semibold">
          Start a scan
        </Link>
      </GlassCard>
      <SectionTitle
        title="Recent reports"
        className="mt-8 mb-4"
        action={
          <Link to="/history" className="text-sm text-secondary">
            See all
          </Link>
        }
      />
      <div className="grid gap-3">
        {reports.slice(0, 3).map((report) => (
          <GlassCard key={report.id} className="p-5">
            <Link to="/results" search={{ id: report.id }}>
              <p className="text-sm font-semibold">{<ReportDate value={report.created_at} />}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {report.result?.observation ?? "No observations available."}
              </p>
              <span className="mt-3 inline-block text-xs text-secondary">Open report</span>
            </Link>
          </GlassCard>
        ))}
        {!reports.length ? (
          <GlassCard className="p-6 text-sm text-muted-foreground">
            No scans yet. Your first completed scan will appear here.
          </GlassCard>
        ) : null}
      </div>
    </AppShell>
  );
}
