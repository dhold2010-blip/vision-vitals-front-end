import { redirect } from "@tanstack/react-router";
import { getCurrentUser, type AuthUser } from "./auth";

export async function requireAccount() {
  const user = await getCurrentUser();
  if (!user) throw redirect({ to: "/auth", replace: true });
  return { user };
}

export function accountName(user: AuthUser): string {
  return user.display_name?.trim() || user.email;
}

export function accountInitials(user: AuthUser): string {
  return accountName(user)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
