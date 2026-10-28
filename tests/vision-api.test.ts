// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { getScanError, requestPhoneAnalysis, validateScanImage } from "../src/lib/vision-api";

const analysis = {
  id: "analysis-1",
  status: "COMPLETED",
  created_at: "2026-10-28T10:00:00Z",
  updated_at: "2026-10-28T10:00:00Z",
  result: {
    provider: "mock",
    model: "test",
    observation: "Test observation",
    result_status: "UNAVAILABLE",
    confidence: null,
    warnings: [],
    limitations: ["Test only"],
    request_id: "request-1",
  },
};
afterEach(() => vi.unstubAllGlobals());

describe("phone analysis API", () => {
  it("uses only user authentication and unwraps the direct analysis response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, data: analysis }));
    vi.stubGlobal("fetch", fetchMock);
    const image = new File(["image"], "phone.jpg", { type: "image/jpeg" });
    expect(await requestPhoneAnalysis("https://api.example/", "user-token", image)).toEqual(
      analysis,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example/api/v1/analyses");
    expect(options.headers).toEqual({ Authorization: "Bearer user-token" });
    expect(options.body.get("source")).toBe("APP_CAMERA");
    expect(options.body.get("image")).toBe(image);
    expect(options.body.has("device_id")).toBe(false);
  });

  it.each([
    [401, "AUTH_TOKEN_EXPIRED", "sign in again"],
    [403, "RESOURCE_FORBIDDEN", "permission"],
    [404, "RESOURCE_NOT_FOUND", "contact support"],
    [413, "UPLOAD_TOO_LARGE", "too large"],
    [422, "IMAGE_RECAPTURE_REQUIRED", "image quality"],
    [422, "UPLOAD_INVALID", "retake the photo"],
    [429, "RATE_LIMITED", "Too many scans"],
    [500, "INTERNAL_ERROR", "temporarily unavailable"],
    [503, "AI_PROVIDER_ERROR", "temporarily unavailable"],
  ])("preserves the meaning of HTTP %i %s", (status, code, expected) => {
    const error = getScanError(new Response(null, { status }), {
      error: { code, message: "private backend detail" },
      request_id: "trace-123",
    });
    expect(error.message).toContain(expected);
    expect(error.message).toContain("Reference: trace-123");
    expect(error.message).not.toMatch(/device authentication|private backend detail/i);
  });

  it("handles an HTML proxy error without losing its status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>Bad gateway</html>", {
          status: 502,
          headers: { "X-Request-ID": "proxy-1" },
        }),
      ),
    );
    await expect(
      requestPhoneAnalysis("https://api.example", "token", new File(["x"], "x.jpg")),
    ).rejects.toThrow("temporarily unavailable. Please retry later. Reference: proxy-1");
  });

  it("reports network errors safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private URL and credentials")));
    await expect(
      requestPhoneAnalysis("https://api.example", "token", new File(["x"], "x.jpg")),
    ).rejects.toThrow("could not be reached");
  });

  it.each([
    null,
    { success: true, data: {} },
    {
      success: true,
      data: {
        ...analysis,
        result: { ...analysis.result, visual_assessment: { subject_visible: "true" } },
      },
    },
    { success: true, data: { ...analysis, result: { ...analysis.result, warnings: "invalid" } } },
  ])("rejects malformed success envelopes", async (payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
    await expect(
      requestPhoneAnalysis("https://api.example", "token", new File(["x"], "x.jpg")),
    ).rejects.toThrow("invalid response");
  });

  it("validates image size and type before sending a request", () => {
    expect(() => validateScanImage({})).toThrow("valid request");
    const form = new FormData();
    form.set("image", new File([], "empty.jpg", { type: "image/jpeg" }));
    expect(() => validateScanImage(form)).toThrow("empty");
    form.set(
      "image",
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" }),
    );
    expect(() => validateScanImage(form)).toThrow("10 MB");
    form.set("image", new File(["text"], "text.txt", { type: "text/plain" }));
    expect(() => validateScanImage(form)).toThrow("JPEG or PNG");
    form.set("image", new File(["image"], "phone.jpg", { type: "image/jpeg" }));
    expect(validateScanImage(form)).toBe(form);
  });
});

it("forwards the browser landmarks unchanged for backend validation and calculation", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, data: analysis }));
  vi.stubGlobal("fetch", fetchMock);
  const pose = JSON.stringify({ version: 1, status: "NO_POSE" });
  await requestPhoneAnalysis("https://api.example", "token", new File(["x"], "x.jpg"), pose);
  expect(fetchMock.mock.calls[0]![1].body.get("pose_capture")).toBe(pose);
});
