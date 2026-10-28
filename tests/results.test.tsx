import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";
const { location } = vi.hoisted(() => ({ location: { state: {} as Record<string, unknown> } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useLocation: () => location,
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/components/vv/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header>
      {title} {subtitle}
    </header>
  ),
}));
import { Route } from "../src/routes/results";
const Results = Route.options.component as ComponentType;
afterEach(cleanup);

it("displays the direct analysis result without sample measurements", () => {
  location.state = {
    result: {
      id: "analysis-1",
      created_at: "2026-10-28T10:00:00Z",
      result: {
        model: "test-model",
        observation: "Actual backend observation",
        result_status: "OBSERVATION",
        confidence: 0.8,
        warnings: [],
        limitations: ["Only visible features can be assessed"],
      },
    },
  };
  render(<Results />);
  expect(screen.getAllByText("Actual backend observation").length).toBeGreaterThan(0);
  expect(screen.getByText("test-model")).toBeTruthy();
  expect(screen.queryByText("Est. age")).toBeNull();
  expect(screen.queryByText("72.4")).toBeNull();
  expect(screen.queryByText(/last saved scan fallback/)).toBeNull();
});

it("shows an empty state instead of fabricated results when no result is present", () => {
  location.state = {};
  render(<Results />);
  expect(screen.getByText("Start a scan")).toBeTruthy();
  expect(screen.queryByText("Health score")).toBeNull();
});
