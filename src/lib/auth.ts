import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";

export type AuthUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  display_name?: string | null;
  timezone?: string | null;
};

export const registerAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (
      typeof data !== "object" ||
      data === null ||
      !("email" in data) ||
      !("password" in data) ||
      typeof data.email !== "string" ||
      typeof data.password !== "string"
    ) {
      throw new Error("Enter a valid email address and password.");
    }
    return { email: data.email.trim(), password: data.password };
  })
  .handler(async ({ data }) => (await import("./auth.server")).register(data));

export const loginAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (
      typeof data !== "object" ||
      data === null ||
      !("email" in data) ||
      !("password" in data) ||
      typeof data.email !== "string" ||
      typeof data.password !== "string"
    ) {
      throw new Error("Enter your email address and password.");
    }
    return { email: data.email.trim(), password: data.password };
  })
  .handler(async ({ data }) => (await import("./auth.server")).login(data));

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () =>
  (await import("./auth.server")).getCurrentUser(),
);

export const logoutAccount = createServerFn({ method: "POST" }).handler(async () =>
  (await import("./auth.server")).logout(),
);

export const requireUserAccessToken = createServerOnlyFn(async () =>
  (await import("./auth.server")).requireUserAccessToken(),
);
