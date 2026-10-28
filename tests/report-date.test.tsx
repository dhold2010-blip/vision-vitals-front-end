import { renderToString } from "react-dom/server";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ReportDate } from "../src/components/vv/report-date";
afterEach(cleanup);
it("uses a deterministic UTC value for server rendering", () => {
  expect(renderToString(<ReportDate value="2026-10-29T00:00:00Z" />)).toContain(
    "2026-10-29 00:00 UTC",
  );
  expect(renderToString(<ReportDate value="2026-10-29T00:00:00" />)).toContain(
    "2026-10-29 00:00 UTC",
  );
});
it("uses browser-local formatting after hydration and handles invalid dates", () => {
  render(<ReportDate value="2026-10-29T00:00:00Z" />);
  expect(screen.getByText(new Date("2026-10-29T00:00:00Z").toLocaleString())).toBeTruthy();
  cleanup();
  render(<ReportDate value="invalid" />);
  expect(screen.getByText("Date unavailable")).toBeTruthy();
});
