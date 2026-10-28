import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  expect(screen.getByText("What is visible")).toBeTruthy();
  expect(screen.getByText(/This older report/)).toBeTruthy();
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

it("renders image-specific findings and separates unsupported measurements", () => {
  location.state = {
    result: {
      id: "visual-report",
      created_at: "2026-10-29T00:00:00Z",
      result: {
        observation: "A person stands with both arms raised.",
        result_status: "OBSERVATION",
        confidence: null,
        warnings: [],
        limitations: [],
        visual_assessment: {
          subject_visible: true,
          framing: "Full body in frame.",
          lighting: "Bright light from the left.",
          posture: "Both arms are raised.",
          capture_tips: ["Face the camera for a clearer view."],
        },
      },
    },
  };
  render(<Results />);
  expect(screen.getByText("Both arms are raised.")).toBeTruthy();
  expect(screen.getByText("Bright light from the left.")).toBeTruthy();
  expect(screen.getByText("Face the camera for a clearer view.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Heart rate/ }));
  expect(screen.getByText(/does not record or process a pulse signal/).hidden).toBe(false);
  expect(screen.queryByText("68")).toBeNull();
  expect(screen.queryByText("0%")).toBeNull();
  expect(screen.queryByText("94%")).toBeNull();
});

it("shows a recapture reason rather than a zero score for an unavailable report", () => {
  location.state = {
    result: {
      created_at: "2026-10-29T00:00:00Z",
      result: {
        observation: "No person is visible in the frame.",
        result_status: "UNAVAILABLE",
        confidence: 0,
        warnings: [],
        limitations: [],
      },
    },
  };
  render(<Results />);
  expect(screen.getByText("Photo could not be assessed")).toBeTruthy();
  expect(screen.getByText("No person is visible in the frame.")).toBeTruthy();
  expect(screen.getByText("Retake photo")).toBeTruthy();
  expect(screen.queryByText("0%")).toBeNull();
});
