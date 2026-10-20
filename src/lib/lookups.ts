import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import type { ServiceUnitOption, TitleOption } from "@/lib/types";

/** Returns the configurable titles available for selection. */
export async function listTitles(options?: {
  activeOnly?: boolean;
}): Promise<TitleOption[]> {
  const admin = await createAdminSupabaseClient();
  let query = admin.from("titles").select("*").order("sort_order", { ascending: true });
  if (options?.activeOnly !== false) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load titles: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    is_active: row.is_active,
    sort_order: row.sort_order,
  }));
}

/** Returns the configurable service units available for selection. */
export async function listServiceUnits(options?: {
  activeOnly?: boolean;
}): Promise<ServiceUnitOption[]> {
  const admin = await createAdminSupabaseClient();
  let query = admin
    .from("service_units")
    .select("*")
    .order("sort_order", { ascending: true });
  if (options?.activeOnly !== false) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load service units: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    is_active: row.is_active,
    sort_order: row.sort_order,
  }));
}
