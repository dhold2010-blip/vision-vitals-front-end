import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { SavedReportList } from "@/components/vv/saved-report-list";
import { requireAccount } from "@/lib/account";
import { listSavedReports } from "@/lib/saved-reports";
export const Route = createFileRoute("/history")({
  beforeLoad: requireAccount,
  loader: () => listSavedReports({ data: 0 }),
  head: () => ({ meta: [{ title: "Scan history — VisionVitals" }] }),
  component: History,
});
function History() {
  const initial = Route.useLoaderData();
  return (
    <AppShell>
      <PageHeader title="Scan history" subtitle="Reports saved to your account" />
      <SavedReportList key={initial.map((item) => item.id).join()} initial={initial} allowDelete />
    </AppShell>
  );
}
