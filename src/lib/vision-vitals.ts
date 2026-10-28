import { createServerFn } from "@tanstack/react-start";
import { requireUserAccessToken } from "@/lib/auth";
import { requestPhoneAnalysis, validateScanImage } from "@/lib/vision-api";

export const captureVision = createServerFn({ method: "POST" })
  .validator(validateScanImage)
  .handler(async ({ data }) => {
    const userAccessToken = await requireUserAccessToken();
    const backendUrl = process.env["VISION_VITALS_BACKEND_URL"]?.trim();
    if (!backendUrl) {
      throw new Error("The scan service is not configured. Please contact support.");
    }
    return requestPhoneAnalysis(backendUrl, userAccessToken, data.get("image") as File);
  });
