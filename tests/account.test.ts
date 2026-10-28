import { expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
import { accountName, accountInitials, requireAccount } from "../src/lib/account";
import { getCurrentUser } from "../src/lib/auth";
const user = { id: "real", email: "real@example.com", role: "USER" as const };
it("uses email until the user saves a name, never a demo identity", () => {
  expect(accountName(user)).toBe("real@example.com");
  expect(accountName({ ...user, display_name: "  Jane Doe " })).toBe("Jane Doe");
  expect(accountInitials({ ...user, display_name: "Jane Doe" })).toBe("JD");
});
it("redirects signed-out visits before loading personal data", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  await expect(requireAccount()).rejects.toMatchObject({ options: { to: "/auth", replace: true } });
});
it("passes the actual user to protected pages", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(user);
  expect(await requireAccount()).toEqual({ user });
});
