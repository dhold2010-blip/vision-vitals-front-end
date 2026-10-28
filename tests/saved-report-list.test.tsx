import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { VisionAnalysis } from "../src/lib/vision-api";
const { remove, list, download } = vi.hoisted(() => ({
  remove: vi.fn(),
  list: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@/lib/saved-reports", () => ({ deleteSavedReport: remove, listSavedReports: list }));
vi.mock("@/lib/scan-report", () => ({ downloadReport: download }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, search }: { children: ReactNode; search?: { id: string } }) => (
    <a href={search ? `/results?id=${search.id}` : "/scan"}>{children}</a>
  ),
}));
import { SavedReportList } from "../src/components/vv/saved-report-list";
const report: VisionAnalysis = {
  id: "real-report",
  status: "COMPLETED",
  created_at: "2026-10-29T00:00:00Z",
  updated_at: "2026-10-29T00:00:00Z",
  result: {
    provider: "test",
    model: "test",
    request_id: "test",
    observation: "A person is standing.",
    result_status: "OBSERVATION",
    confidence: null,
    warnings: [],
    limitations: [],
  },
};
beforeEach(() => {
  remove.mockReset();
  list.mockReset();
  download.mockReset();
});
afterEach(cleanup);
it("opens a persistent report URL and downloads the actual record", () => {
  render(<SavedReportList initial={[report]} />);
  expect(screen.getByText("Open report").closest("a")?.getAttribute("href")).toBe(
    "/results?id=real-report",
  );
  fireEvent.click(screen.getByText("Download report"));
  expect(download).toHaveBeenCalledWith(report);
});
it("asks before deletion and preserves the report after a failed request", async () => {
  remove.mockRejectedValue(new Error("Deletion failed."));
  render(<SavedReportList initial={[report]} allowDelete />);
  fireEvent.click(screen.getByText("Delete report"));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Cancel"));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Delete report"));
  await act(async () => fireEvent.click(screen.getByText("Delete permanently")));
  expect(screen.getByRole("alert").textContent).toContain("Deletion failed");
  expect(screen.getByText("A person is standing.")).toBeTruthy();
});
it("removes a report only after backend confirmation", async () => {
  remove.mockResolvedValue({ deleted: true });
  render(<SavedReportList initial={[report]} allowDelete />);
  fireEvent.click(screen.getByText("Delete report"));
  await act(async () => fireEvent.click(screen.getByText("Delete permanently")));
  expect(remove).toHaveBeenCalledWith({ data: "real-report" });
  expect(screen.getByText("You have no saved reports yet.")).toBeTruthy();
});
it("filters observations without inventing an empty report", () => {
  render(<SavedReportList initial={[report]} />);
  fireEvent.change(screen.getByLabelText("Search reports"), { target: { value: "missing" } });
  expect(screen.getByText("No loaded reports match your search.")).toBeTruthy();
});
it("loads the next account page and shows a recoverable loading error", async () => {
  list
    .mockRejectedValueOnce(new Error("Try again"))
    .mockResolvedValueOnce([{ ...report, id: "next" }]);
  render(
    <SavedReportList
      initial={Array.from({ length: 20 }, (_, i) => ({ ...report, id: `report-${i}` }))}
    />,
  );
  await act(async () => fireEvent.click(screen.getByText("Load more reports")));
  expect(screen.getByRole("alert").textContent).toBe("Try again");
  await act(async () => fireEvent.click(screen.getByText("Load more reports")));
  expect(list).toHaveBeenLastCalledWith({ data: 20 });
  expect(screen.getAllByText("Open report")).toHaveLength(21);
});
