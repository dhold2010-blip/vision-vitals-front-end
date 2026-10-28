import { createServerFn } from "@tanstack/react-start";
import { isAnalysis } from "./vision-api";
import type { OpticalCapture } from "./optical-types";

export const saveCameraMeasurement = createServerFn({ method: "POST" })
  .validator((data: { id: string; capture: OpticalCapture }) => {
    if (
      !data ||
      typeof data.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(data.id) ||
      !data.capture ||
      !["pulse", "face"].includes(data.capture.kind) ||
      JSON.stringify(data.capture).length > 250000
    )
      throw new Error("The camera data is invalid. Please retry.");
    return data;
  })
  .handler(async ({ data }) => {
    const { authenticatedRequest } = await import("./auth.server");
    const report = await authenticatedRequest<unknown>(
      `/api/v1/analyses/${data.id}/camera-measurements`,
      {
        method: "POST",
        body: JSON.stringify(data.capture),
      },
    );
    if (!isAnalysis(report))
      throw new Error("The camera result could not be read. Reload the report.");
    return report;
  });
