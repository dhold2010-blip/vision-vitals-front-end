import { ReportDate } from "@/components/vv/report-date";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { GlassCard } from "./glass-card";
import { deleteSavedReport, listSavedReports } from "@/lib/saved-reports";
import { downloadReport } from "@/lib/scan-report";
import type { VisionAnalysis } from "@/lib/vision-api";

export function SavedReportList({
  initial,
  allowDelete = false,
}: {
  initial: VisionAnalysis[];
  allowDelete?: boolean;
}) {
  const [reports, setReports] = useState(initial);
  const [offset, setOffset] = useState(initial.length);
  const [hasMore, setHasMore] = useState(initial.length === 20);
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visible = reports.filter((report) =>
    `${report.created_at} ${report.result?.observation ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <label className="block text-sm">
        Search loaded reports
        <input
          className="glass mt-2 w-full rounded-2xl p-4"
          aria-label="Search reports"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Date or observation"
        />
      </label>
      {error ? (
        <p role="alert" className="my-4 text-sm text-warning">
          {error}
        </p>
      ) : null}
      <ul className="mt-5 grid gap-3">
        {visible.map((report) => (
          <GlassCard as="li" key={report.id} className="p-5">
            <Link to="/results" search={{ id: report.id }} className="block">
              <h2 className="text-sm font-semibold">{<ReportDate value={report.created_at} />}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {report.result?.observation ?? "No observations available."}
              </p>
              <span className="mt-3 inline-block text-xs text-secondary">Open report</span>
            </Link>
            <div className="mt-4 flex gap-4">
              <button
                type="button"
                className="text-sm text-secondary"
                onClick={() => downloadReport(report)}
              >
                Download report
              </button>
              {allowDelete ? (
                <button
                  type="button"
                  disabled={pending}
                  className="text-sm text-destructive"
                  onClick={() => setConfirmId(report.id)}
                >
                  Delete report
                </button>
              ) : null}
            </div>
            {confirmId === report.id ? (
              <div className="mt-4 rounded-xl border border-border p-4">
                <p className="text-sm">Permanently delete this report and its uploaded image?</p>
                <div className="mt-3 flex gap-5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={async () => {
                      setPending(true);
                      setError(null);
                      try {
                        const response = await deleteSavedReport({ data: report.id });
                        if (!response.deleted) throw new Error("The report could not be deleted.");
                        setReports((items) => items.filter((item) => item.id !== report.id));
                        setOffset((value) => Math.max(0, value - 1));
                        setConfirmId(null);
                      } catch (reason) {
                        setError(
                          reason instanceof Error
                            ? reason.message
                            : "Deletion failed. Please retry.",
                        );
                      } finally {
                        setPending(false);
                      }
                    }}
                    className="text-sm text-destructive"
                  >
                    {pending ? "Deleting…" : "Delete permanently"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmId(null)}
                    className="text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </GlassCard>
        ))}
      </ul>
      {!visible.length ? (
        <GlassCard className="mt-5 p-6">
          <p>
            {reports.length
              ? "No loaded reports match your search."
              : "You have no saved reports yet."}
          </p>
          <Link to="/scan" className="mt-3 inline-block text-secondary">
            Start a scan
          </Link>
        </GlassCard>
      ) : null}
      {hasMore ? (
        <button
          type="button"
          disabled={pending}
          className="glass mt-5 w-full rounded-2xl p-4"
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              const next = await listSavedReports({ data: offset });
              setReports((items) => [
                ...items,
                ...next.filter((item) => !items.some((existing) => existing.id === item.id)),
              ]);
              setOffset((value) => value + next.length);
              setHasMore(next.length === 20);
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Could not load more reports.");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? "Loading…" : "Load more reports"}
        </button>
      ) : null}
    </>
  );
}
