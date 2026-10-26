import { createServerFn } from "@tanstack/react-start";

export type DeviceRecord = {
  id: string;
  device_identifier: string;
  device_name: string;
  device_type: string;
  status: string;
  firmware_version: string | null;
  software_version: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export const listMyDevices = createServerFn({ method: "GET" })
  .handler(async () => (await import("./devices.server")).listMyDevices());

export const registerBrowserDevice = createServerFn({ method: "POST" })
  .handler(async () => (await import("./devices.server")).registerBrowserDevice());

export const revokeMyDevice = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (
      typeof data !== "object" ||
      data === null ||
      !("id" in data) ||
      typeof data.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(data.id)
    ) {
      throw new Error("Select a valid device.");
    }
    return { id: data.id };
  })
  .handler(async ({ data }) => (await import("./devices.server")).revokeMyDevice(data.id));
