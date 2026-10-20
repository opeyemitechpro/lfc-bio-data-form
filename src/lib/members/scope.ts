import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import type { AuthContext } from "@/lib/types";
import { AuthorizationError } from "@/lib/auth/permissions";

/**
 * Data-access scoping.
 *
 * Every member query is filtered by the acting user's access scope. A user
 * without a service-unit scope sees every member; a user with a scope only
 * sees members assigned to one of those units (plus members with no unit
 * assignment, so that records are not silently hidden from scoped staff).
 *
 * The same scope is applied to the directory, the profile page, search
 * results, exports, print operations and aggregate statistics.
 */

export interface MemberScope {
  /** null means unrestricted. */
  serviceUnitIds: string[] | null;
  /** true when the superadmin bypasses all restrictions. */
  unrestricted: boolean;
}

export function scopeFromContext(context: AuthContext): MemberScope {
  if (context.isSuperadmin) {
    return { serviceUnitIds: null, unrestricted: true };
  }
  return {
    serviceUnitIds: context.serviceUnitScopeIds,
    unrestricted: false,
  };
}

/**
 * Returns the IDs of members visible to the user. When the user is
 * unrestricted an empty array is returned, meaning "no member-ID filter
 * required".
 */
export async function resolveVisibleMemberIds(
  context: AuthContext
): Promise<string[] | null> {
  const scope = scopeFromContext(context);
  if (scope.unrestricted || scope.serviceUnitIds === null) return null;

  const admin = await createAdminSupabaseClient();
  const { data } = await admin
    .from("member_service_units")
    .select("member_id")
    .in("service_unit_id", scope.serviceUnitIds);

  const scoped = new Set((data ?? []).map((row) => row.member_id));

  // Members with no unit assignment are visible to scoped users so that
  // unassigned registrations are not silently invisible.
  const { data: unassigned } = await admin
    .from("members")
    .select("id")
    .eq("status", "active")
    .not("id", "in", `(${Array.from(scoped).join(",") || "''"})`);

  const result = new Set<string>(scoped);
  for (const row of unassigned ?? []) result.add(row.id);

  return Array.from(result);
}

/**
 * Applies the access scope to a PostgREST query on the `members` table.
 * Returns the query with the scope filter applied.
 */
export function applyMemberScope<
  T extends { in: (column: string, values: readonly string[]) => T }
>(query: T, visibleMemberIds: string[] | null): T {
  if (visibleMemberIds === null) return query;
  if (visibleMemberIds.length === 0) {
    // No visible members at all — force an empty result set.
    return query.in("id", ["00000000-0000-0000-0000-000000000000"]);
  }
  return query.in("id", visibleMemberIds);
}

/** Throws when a member is outside the user's access scope. */
export async function assertMemberVisible(
  context: AuthContext,
  memberId: string
): Promise<void> {
  const visible = await resolveVisibleMemberIds(context);
  if (visible === null) return;
  if (!visible.includes(memberId)) {
    throw new AuthorizationError("You do not have access to this member record.", 403);
  }
}
