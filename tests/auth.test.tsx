import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";
const { login, register, navigate } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  loginAccount: login,
  registerAccount: register,
  getCurrentUser: async () => null,
  logoutAccount: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => navigate,
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/components/vv/app-shell", () => ({ Backdrop: () => null }));
import { Route } from "../src/routes/auth";
const Auth = Route.options.component as ComponentType;
beforeEach(() => {
  login.mockReset();
  register.mockReset();
  navigate.mockReset();
});
afterEach(cleanup);
async function showAuth() {
  await act(async () => {
    render(<Auth />);
  });
}
function fill(password: string) {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "person@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}
async function submit() {
  await act(async () => {
    fireEvent.submit(screen.getByLabelText("Password").closest("form")!);
  });
}
it("does not silently disable sign-in for a short existing password", async () => {
  login.mockResolvedValue({ id: "user", email: "person@example.com", role: "USER" });
  await showAuth();
  fill("existing");
  expect((screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement).disabled).toBe(
    false,
  );
  await submit();
  expect(login).toHaveBeenCalledWith({
    data: { email: "person@example.com", password: "existing" },
  });
  expect(navigate).toHaveBeenCalledWith({ to: "/" });
});
it("explains the signup password requirement and does not submit an invalid password", async () => {
  await showAuth();
  fireEvent.click(screen.getByRole("button", { name: "Create one" }));
  fill("short");
  expect(screen.getByText("Use 12–128 characters for your new password.")).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Create account" }) as HTMLButtonElement).disabled,
  ).toBe(false);
  await submit();
  expect(screen.getByRole("alert").textContent).toContain("at least 12 characters");
  expect(register).not.toHaveBeenCalled();
});
it("submits valid signup details and navigates after account creation", async () => {
  register.mockResolvedValue({ id: "user", email: "person@example.com", role: "USER" });
  await showAuth();
  fireEvent.click(screen.getByRole("button", { name: "Create one" }));
  fill("correct horse battery staple");
  await submit();
  expect(register).toHaveBeenCalledOnce();
  expect(navigate).toHaveBeenCalledWith({ to: "/" });
});
it("shows login rejection and allows another attempt", async () => {
  login.mockRejectedValue(new Error("Email or password is incorrect."));
  await showAuth();
  fill("incorrect");
  await submit();
  expect(screen.getByRole("alert").textContent).toContain("Email or password is incorrect");
  expect((screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement).disabled).toBe(
    false,
  );
});
it("only disables submission while the request is pending", async () => {
  let resolve!: (value: unknown) => void;
  login.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await showAuth();
  fill("existing");
  await submit();
  expect((screen.getByRole("button", { name: /Please wait/ }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  await submit();
  expect(login).toHaveBeenCalledOnce();
  await act(async () => {
    resolve({ id: "user", email: "person@example.com", role: "USER" });
  });
});
