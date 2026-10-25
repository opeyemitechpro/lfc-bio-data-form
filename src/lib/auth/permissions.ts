import "server-only";

import { cache } from "react";

import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/clients";
import {
  ALL_PERMISSION_KEYS,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/auth/permission-keys";
import type { AuthContext, PermissionDefinition } from "@/lib/types";

/**
 * Re-exported so that server modules can import the catalogue from a single
 * place. The constants themselves live in `permission-keys.ts`, which is
 * safe to import from client components.
 */
export { ALL_PERMISSION_KEYS, PERMISSIONS };
export type { PermissionKey };

/**
 * Resolves the caller's authentication context from the request cookies.
 *
 * The superadmin flag is read from the `app_principals` table, which the
 * ordinary role-management code paths never expose. It is therefore not
 * reachable through client-supplied role names.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;
  if (!user.email) return null;

  const admin = await createAdminSupabaseClient();

  const { data: profile } = await admin
    .from("app_users")
    .select("id, email, full_name, status, is_active, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  // No application profile means the account was never provisioned by the
  // superadmin: refuse access even if the Auth identity is valid.
  if (!profile) return null;

  // Suspended or deactivated accounts lose access immediately.
  if (profile.status !== "active" || profile.is_active !== true) return null;

  const [principalResult, rolesResult, overridesResult, scopesResult] =
    await Promise.all([
      admin
        .from("app_principals")
        .select("principal_type")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("user_roles")
        .select("role_id, roles ( id, name )")
        .eq("user_id", user.id),
      admin
        .from("user_permission_overrides")
        .select("permission_key, effect")
        .eq("user_id", user.id),
      admin
        .from("user_service_unit_scopes")
        .select("service_unit_id")
        .eq("user_id", user.id),
    ]);

  const isSuperadmin = principalResult.data?.principal_type === "superadmin";
  const userRoles = rolesResult.data;

  const roleIds: string[] = [];
  const roleNames: string[] = [];
  const grantedPermissions = new Set<string>();

  for (const row of userRoles ?? []) {
    const role = row.roles as unknown as { id: string; name: string } | null;
    if (!role) continue;
    roleIds.push(role.id);
    roleNames.push(role.name);
  }

  if (roleIds.length > 0) {
    const { data: rolePerms } = await admin
      .from("role_permissions")
      .select("permission_key")
      .in("role_id", roleIds);
    for (const row of rolePerms ?? []) grantedPermissions.add(row.permission_key);
  }

  for (const row of overridesResult.data ?? []) {
    if (row.effect === "deny") grantedPermissions.delete(row.permission_key);
    else grantedPermissions.add(row.permission_key);
  }

  const scopes = scopesResult.data;
  const serviceUnitScopeIds = scopes && scopes.length > 0 ? scopes.map((s) => s.service_unit_id) : null;

  return {
    userId: user.id,
    email: profile.email,
    isSuperadmin,
    permissions: grantedPermissions,
    roleIds,
    roleNames,
    serviceUnitScopeIds,
    mustChangePassword: profile.must_change_password,
  };
});

/** Returns the auth context, throwing when the caller is not authorised. */
export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) {
    throw new AuthorizationError("You must be signed in to perform this action.", 401);
  }
  return context;
}

/** Throws when the caller lacks the given permission. */
export async function requirePermission(permission: PermissionKey | string): Promise<AuthContext> {
  const context = await requireAuthContext();
  if (!context.isSuperadmin && !context.permissions.has(permission)) {
    throw new AuthorizationError("You do not have permission to perform this action.", 403);
  }
  return context;
}

/** Non-throwing permission check for conditional rendering. */
export async function hasPermission(permission: PermissionKey | string): Promise<boolean> {
  const context = await getAuthContext();
  if (!context) return false;
  return context.isSuperadmin || context.permissions.has(permission);
}

/**
 * Returns the list of permission keys the current user effectively holds.
 * The superadmin holds every key in the catalogue.
 */
export async function getEffectivePermissions(): Promise<string[]> {
  const context = await getAuthContext();
  if (!context) return [];
  if (context.isSuperadmin) return [...ALL_PERMISSION_KEYS];
  return [...context.permissions].sort();
}

/** The full catalogue, used by the role editor. */
export async function listPermissionCatalogue(): Promise<PermissionDefinition[]> {
  const admin = await createAdminSupabaseClient();
  const { data } = await admin
    .from("permissions")
    .select("key, label, description, category, sort_order")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  return (data ?? []) as PermissionDefinition[];
}

export class AuthorizationError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

/**
 * Guards a request against horizontal privilege escalation by confirming
 * the acting user holds the permission AND is allowed to act on the
 * target resource.
 */
export function assertCanActOn(context: AuthContext, permission: PermissionKey | string) {
  if (context.isSuperadmin) return;
  if (!context.permissions.has(permission)) {
    throw new AuthorizationError("You do not have permission to perform this action.", 403);
  }
}
