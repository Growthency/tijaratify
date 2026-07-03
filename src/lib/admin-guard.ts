import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Guard for admin-only API route handlers. The middleware protects the
 * /admin/* pages, but not /api/* — so mutating endpoints must re-check the
 * signed-in user against the ADMIN_EMAILS allowlist themselves.
 *
 * Returns the admin's email when authorised, or null when it isn't.
 */
export async function requireAdmin(): Promise<{ email: string } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase();
    if (!email) return null;

    const allow = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // An empty allowlist means "any signed-in user is an admin" — mirrors the
    // rule used by src/middleware.ts.
    if (allow.length && !allow.includes(email)) return null;
    return { email };
  } catch {
    return null;
  }
}
