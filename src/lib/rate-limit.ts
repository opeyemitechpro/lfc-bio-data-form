import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";

/**
 * Lightweight rate limiting backed by the `abuse_events` table.
 *
 * This keeps the application within the free tier (no Redis, no paid
 * service) while still protecting the public registration and upload
 * endpoints from abuse.
 */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowHours = 1
): Promise<boolean> {
  try {
    const admin = await createAdminSupabaseClient();
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    const { count, error } = await admin
      .from("abuse_events")
      .select("id", { count: "exact", head: true })
      .eq("bucket", bucket)
      .eq("identifier", identifier)
      .gte("created_at", since);

    if (error) {
      // Fail open rather than blocking legitimate members.
      console.error("[rate-limit] check failed", {
        bucket,
        error: error.message,
      });
      return true;
    }

    if ((count ?? 0) >= limit) return false;

    await admin.from("abuse_events").insert({ bucket, identifier });
    return true;
  } catch (error) {
    console.error("[rate-limit] unexpected error", {
      bucket,
      error: error instanceof Error ? error.message : "unknown error",
    });
    return true;
  }
}

/** Removes abuse events older than the retention window. */
export async function pruneAbuseEvents(): Promise<number> {
  const admin = await createAdminSupabaseClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("abuse_events")
    .delete()
    .lt("created_at", cutoff)
    .select("id");
  if (error) throw new Error(`Failed to prune abuse events: ${error.message}`);
  return data?.length ?? 0;
}
