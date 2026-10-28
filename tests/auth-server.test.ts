// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const { cookies, setCookie, deleteCookie } = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));
vi.mock("@tanstack/react-start/server", () => ({
  getCookie: (name: string) => cookies.get(name),
  setCookie,
  deleteCookie,
}));
import { getCurrentUser, logout, authenticatedRequest } from "../src/lib/auth.server";
const user = { id: "one", email: "real@example.com", role: "USER", is_active: true };
const me = { data: { user, profile: { display_name: "Real User", timezone: "Asia/Kolkata" } } };
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  cookies.clear();
  setCookie.mockReset();
  deleteCookie.mockReset();
  vi.stubEnv("VISION_VITALS_BACKEND_URL", "https://backend.example");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("has no session without cookies and does not call the backend", async () => {
  expect(await getCurrentUser()).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("uses the authenticated user's saved name and email", async () => {
  cookies.set("vv_access", "access");
  fetchMock.mockResolvedValue(Response.json(me));
  expect(await getCurrentUser()).toEqual({
    id: "one",
    email: "real@example.com",
    role: "USER",
    display_name: "Real User",
    timezone: "Asia/Kolkata",
  });
});
it("rotates expired access credentials and then reads the account", async () => {
  cookies.set("vv_access", "expired");
  cookies.set("vv_refresh", "refresh");
  fetchMock
    .mockResolvedValueOnce(Response.json({}, { status: 401 }))
    .mockResolvedValueOnce(
      Response.json({
        data: { tokens: { access_token: "new-access", refresh_token: "new-refresh" } },
      }),
    )
    .mockResolvedValueOnce(Response.json(me));
  expect((await getCurrentUser())?.display_name).toBe("Real User");
  expect(setCookie).toHaveBeenCalledWith(
    "vv_refresh",
    "new-refresh",
    expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
  );
  expect(fetchMock.mock.calls[2]?.[1].headers.Authorization).toBe("Bearer new-access");
});
it.each([429, 503])("does not destroy the session when refresh returns %s", async (status) => {
  cookies.set("vv_refresh", "refresh");
  fetchMock.mockResolvedValue(Response.json({}, { status }));
  await expect(getCurrentUser()).rejects.toThrow("temporarily unavailable");
  expect(deleteCookie).not.toHaveBeenCalled();
});
it("clears rejected refresh credentials", async () => {
  cookies.set("vv_refresh", "revoked");
  fetchMock.mockResolvedValue(Response.json({}, { status: 401 }));
  expect(await getCurrentUser()).toBeNull();
  expect(deleteCookie).toHaveBeenCalledTimes(2);
});
it("reports a backend outage without clearing an active account", async () => {
  cookies.set("vv_access", "access");
  fetchMock.mockResolvedValue(Response.json({}, { status: 503 }));
  await expect(getCurrentUser()).rejects.toThrow("temporarily unavailable");
  expect(deleteCookie).not.toHaveBeenCalled();
});
it("signs out locally even when the backend cannot be reached", async () => {
  cookies.set("vv_access", "access");
  fetchMock.mockRejectedValue(new Error("private endpoint"));
  expect(await logout()).toEqual({ loggedOut: true, serverRevoked: false });
  expect(deleteCookie).toHaveBeenCalledTimes(2);
});
it("revokes the backend session and clears both cookies", async () => {
  cookies.set("vv_access", "access");
  fetchMock
    .mockResolvedValueOnce(Response.json(me))
    .mockResolvedValueOnce(Response.json({ data: { logged_out: true } }));
  expect(await logout()).toEqual({ loggedOut: true, serverRevoked: true });
  expect(deleteCookie).toHaveBeenCalledTimes(2);
});
it("never exposes backend details for another account's report", async () => {
  cookies.set("vv_access", "access");
  fetchMock
    .mockResolvedValueOnce(Response.json(me))
    .mockResolvedValueOnce(
      Response.json({ error: { message: "private detail" } }, { status: 403 }),
    );
  await expect(authenticatedRequest("/api/v1/analyses/other")).rejects.toThrow(
    "does not belong to your account",
  );
});
