import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";

/**
 * Use from every private route's beforeLoad. The backend validates the
 * HttpOnly access/refresh cookies; no client-side storage flag is trusted.
 */
export async function requireAuthenticatedRoute(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw redirect({ to: "/auth" });
  }
}
