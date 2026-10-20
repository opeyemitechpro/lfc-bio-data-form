import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/permissions";
import type { AuthContext } from "@/lib/types";

/**
 * Page-level guard for the administrative area.
 *
 * Redirects unauthenticated visitors to the sign-in page, and users whose
 * temporary password has not yet been changed to the forced-change screen.
 */
export const requireAdmin = cache(async (): Promise<AuthContext> => {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login");
  }
  if (context.mustChangePassword) {
    redirect("/account/change-password?forced=1");
  }
  return context;
});
