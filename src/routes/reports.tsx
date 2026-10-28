import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { SavedReportList } from "@/components/vv/saved-report-list";
import { requireAccount } from "@/lib/account";
import { listSavedReports } from "@/lib/saved-reports";
export const Route = createFileRoute("/reports")({
  beforeLoad: requireAccount,
  loader: () => listSavedReports({ data: 0 }),
  head: () => ({ meta: [{ title: "Your reports — VisionVitals" }] }),
  component: Reports,
});
function Reports() {
  const initial = Route.useLoaderData();
  return (
    <AppShell>
      <PageHeader
        title="Your reports"
        subtitle="Open or download a saved photo report. Health trends are not measured by this app."
      />
      <SavedReportList key={initial.map((item) => item.id).join()} initial={initial} />
    </AppShell>
  );
}
