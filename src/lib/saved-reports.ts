import { createServerFn } from "@tanstack/react-start";
import { isAnalysis } from "./vision-api";

function reportId(data: unknown): string {
  if (typeof data !== "string" || !/^[a-zA-Z0-9-]{1,64}$/.test(data))
    throw new Error("Invalid report ID.");
  return data;
}

export const listSavedReports = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const offset = typeof data === "number" ? data : 0;
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid page.");
    return offset;
  })
  .handler(async ({ data }) => {
    const { authenticatedRequest } = await import("./auth.server");
    const reports = await authenticatedRequest<unknown>(`/api/v1/analyses?limit=20&offset=${data}`);
    if (!Array.isArray(reports) || !reports.every(isAnalysis))
      throw new Error("The saved reports response was invalid.");
    return reports;
  });

export const getSavedReport = createServerFn({ method: "GET" })
  .validator(reportId)
  .handler(async ({ data }) => {
    const { authenticatedRequest } = await import("./auth.server");
    const report = await authenticatedRequest<unknown>(`/api/v1/analyses/${data}`);
    if (!isAnalysis(report)) throw new Error("The saved report response was invalid.");
    return report;
  });

export const deleteSavedReport = createServerFn({ method: "POST" })
  .validator(reportId)
  .handler(async ({ data }) => {
    const { authenticatedRequest } = await import("./auth.server");
    return authenticatedRequest<{ deleted: boolean }>(`/api/v1/analyses/${data}`, {
      method: "DELETE",
    });
  });

export const updateDisplayName = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "string" || data.trim().length > 120)
      throw new Error("Use a name of 120 characters or fewer.");
    return data.trim() || null;
  })
  .handler(async ({ data }) => {
    const { authenticatedRequest, getCurrentUser } = await import("./auth.server");
    const user = await getCurrentUser();
    return authenticatedRequest<{ display_name: string | null }>("/api/v1/users/me/profile", {
      method: "PATCH",
      body: JSON.stringify({ display_name: data, timezone: user?.timezone ?? null }),
    });
  });
