import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import type { AppUser, RoleDefinition } from "@/lib/types";

/**
 * Lists the ordinary application users.
 *
 * The hidden superadmin principal is excluded from this list — it is
 * filtered out at the database level by the `app_users_directory` view, and
 * the service-role query applies the same filter here so that the
 * exclusion holds regardless of which path is used.
 */
export async function listAppUsers(): Promise<AppUser[]> {
  const admin = await createAdminSupabaseClient();

  const { data, error } = await admin
    .from("app_users")
    .select(
      "id, email, full_name, status, is_active, must_change_password, last_login_at, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list users: ${error.message}`);

  const users = (data ?? []) as AppUser[];

  // Exclude the hidden superadmin principal.
  const { data: principals } = await admin
    .from("app_principals")
    .select("user_id");

  const principalIds = new Set((principals ?? []).map((p) => p.user_id));
  const ordinaryUsers = users.filter((user) => !principalIds.has(user.id));

  // Attach the roles and service unit scopes.
  if (ordinaryUsers.length === 0) return ordinaryUsers;

  const userIds = ordinaryUsers.map((user) => user.id);

  const { data: userRoles } = await admin
    .from("user_roles")
    .select("user_id, role_id, roles ( id, name )")
    .in("user_id", userIds);

  const { data: scopes } = await admin
    .from("user_service_unit_scopes")
    .select("user_id, service_unit_id")
    .in("user_id", userIds);

  for (const user of ordinaryUsers) {
    const roles = (userRoles ?? []).filter((row) => row.user_id === user.id);
    user.role_ids = roles.map((row) => row.role_id);
    user.role_names = roles.map(
      (row) => (row.roles as unknown as { name: string } | null)?.name ?? "Unknown"
    );
    user.service_unit_scope_ids = (scopes ?? [])
      .filter((row) => row.user_id === user.id)
      .map((row) => row.service_unit_id);
  }

  return ordinaryUsers;
}

/** Lists the roles with their permission assignments. */
export async function listRoles(): Promise<RoleDefinition[]> {
  const admin = await createAdminSupabaseClient();

  const { data, error } = await admin
    .from("roles")
    .select("id, name, description, is_system")
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to list roles: ${error.message}`);

  const roles = (data ?? []) as RoleDefinition[];

  const { data: rolePerms } = await admin
    .from("role_permissions")
    .select("role_id, permission_key");

  const { data: userRoles } = await admin
    .from("user_roles")
    .select("role_id");

  const userCounts = new Map<string, number>();
  for (const row of userRoles ?? []) {
    userCounts.set(row.role_id, (userCounts.get(row.role_id) ?? 0) + 1);
  }

  for (const role of roles) {
    role.permission_keys = (rolePerms ?? [])
      .filter((row) => row.role_id === role.id)
      .map((row) => row.permission_key);
    role.user_count = userCounts.get(role.id) ?? 0;
  }

  return roles;
}

/**
 * Returns the effective permissions of a user, taking role grants and
 * per-user overrides into account.
 */
export async function getUserEffectivePermissions(
  userId: string
): Promise<string[]> {
  const admin = await createAdminSupabaseClient();

  const { data: userRoles } = await admin
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);

  const roleIds = (userRoles ?? []).map((row) => row.role_id);
  const granted = new Set<string>();

  if (roleIds.length > 0) {
    const { data: rolePerms } = await admin
      .from("role_permissions")
      .select("permission_key")
      .in("role_id", roleIds);
    for (const row of rolePerms ?? []) granted.add(row.permission_key);
  }

  const { data: overrides } = await admin
    .from("user_permission_overrides")
    .select("permission_key, effect")
    .eq("user_id", userId);

  for (const row of overrides ?? []) {
    if (row.effect === "deny") granted.delete(row.permission_key);
    else granted.add(row.permission_key);
  }

  return [...granted].sort();
}
