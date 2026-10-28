import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";
const { state, update, logout, navigate, invalidate } = vi.hoisted(() => ({
  state: {
    user: { id: "real", email: "person@example.com", role: "USER", display_name: "Actual User" },
  },
  update: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
    useRouteContext: () => state,
    useLoaderData: () => [],
  }),
  useRouter: () => ({ options: {}, invalidate }),
  useNavigate: () => navigate,
  redirect: vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(), logoutAccount: logout }));
vi.mock("@/lib/saved-reports", () => ({ listSavedReports: vi.fn(), updateDisplayName: update }));
vi.mock("sonner", () => ({ toast: { warning: vi.fn() } }));
vi.mock("@/components/vv/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header>
      {title} {subtitle}
    </header>
  ),
}));
import { Route as HomeRoute } from "../src/routes/index";
import { Route as ProfileRoute } from "../src/routes/profile";
import { Route as SettingsRoute } from "../src/routes/settings";
const Home = HomeRoute.options.component as ComponentType;
const Profile = ProfileRoute.options.component as ComponentType;
const Settings = SettingsRoute.options.component as ComponentType;
beforeEach(() => {
  update.mockReset();
  logout.mockReset();
  navigate.mockReset();
  invalidate.mockReset();
});
afterEach(cleanup);
it("shows the signed-in name and a real empty dashboard", () => {
  render(<Home />);
  expect(screen.getByText("Actual User")).toBeTruthy();
  expect(screen.getByText(/No scans yet/)).toBeTruthy();
  expect(screen.queryByText("Aarav Mehta")).toBeNull();
  expect(screen.queryByText("86")).toBeNull();
});
it("saves profile edits and refreshes the authenticated user", async () => {
  update.mockResolvedValue({ display_name: "New Name" });
  render(<Profile />);
  fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "New Name" } });
  await act(async () => fireEvent.click(screen.getByText("Save profile")));
  expect(update).toHaveBeenCalledWith({ data: "New Name" });
  expect(invalidate).toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toContain("Profile saved");
});
it("keeps profile edits recoverable after a save failure", async () => {
  update.mockRejectedValue(new Error("Save failed"));
  render(<Profile />);
  await act(async () => fireEvent.click(screen.getByText("Save profile")));
  expect(screen.getByRole("alert").textContent).toBe("Save failed");
  expect(screen.queryByRole("status")).toBeNull();
});
it("actually logs out and leaves protected pages", async () => {
  logout.mockResolvedValue({ loggedOut: true, serverRevoked: true });
  render(<Settings />);
  await act(async () => fireEvent.click(screen.getByText("Log out")));
  expect(logout).toHaveBeenCalledOnce();
  expect(navigate).toHaveBeenCalledWith({ to: "/auth", replace: true });
  expect(invalidate).toHaveBeenCalled();
  expect(screen.queryByText("On-device processing")).toBeNull();
});
