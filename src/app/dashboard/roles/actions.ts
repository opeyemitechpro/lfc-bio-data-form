"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAdminAction, AUDIT_ACTIONS } from "@/lib/audit";
import {
  requirePermission,
  PERMISSIONS,
  AuthorizationError,
} from "@/lib/auth/permissions";
import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { ALL_PERMISSION_KEYS } from "@/lib/auth/permissions";

export interface RoleActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const roleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a role name.").max(80),
  description: z.string().trim().max(300).optional(),
  permissionKeys: z.array(z.string()).default([]),
});

/** Creates a custom role with a set of permissions. */
export async function saveRoleAction(
  payload: unknown
): Promise<RoleActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.ROLES_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = roleSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors };
  }

  const { id, name, description, permissionKeys } = parsed.data;
  const admin = await createAdminSupabaseClient();

  // Only known permission keys are accepted.
  const validKeys = permissionKeys.filter((key) =>
    ALL_PERMISSION_KEYS.includes(key as never)
  );

  if (id) {
    const { data: existing } = await admin
      .from("roles")
      .select("is_system")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return { ok: false, message: "That role could not be found." };
    }

    const { error } = await admin
      .from("roles")
      .update({
        name,
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { ok: false, message: "The role could not be updated." };
    }

    // Replace the permission assignments.
    await admin.from("role_permissions").delete().eq("role_id", id);
    if (validKeys.length > 0) {
      await admin
        .from("role_permissions")
        .insert(validKeys.map((key) => ({ role_id: id, permission_key: key })));
    }

    await logAdminAction(context, AUDIT_ACTIONS.ROLE_UPDATED, {
      entityType: "role",
      entityId: id,
      summary: { name, permissionCount: validKeys.length },
    });

    await logAdminAction(context, AUDIT_ACTIONS.PERMISSIONS_CHANGED, {
      entityType: "role",
      entityId: id,
      summary: { permissionKeys: validKeys },
    });
  } else {
    const { data: clash } = await admin
      .from("roles")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (clash) {
      return {
        ok: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: { name: "A role with this name already exists." },
      };
    }

    const { data: created, error } = await admin
      .from("roles")
      .insert({
        name,
        description: description?.trim() || null,
        is_system: false,
        created_by: context.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: "The role could not be created." };
    }

    if (validKeys.length > 0) {
      await admin
        .from("role_permissions")
        .insert(validKeys.map((key) => ({ role_id: created.id, permission_key: key })));
    }

    await logAdminAction(context, AUDIT_ACTIONS.ROLE_CREATED, {
      entityType: "role",
      entityId: created.id,
      summary: { name, permissionCount: validKeys.length },
    });
  }

  revalidatePath("/dashboard/roles");
  return { ok: true, message: "The role was saved." };
}

/** Deletes a custom role that is not in use. */
export async function deleteRoleAction(
  id: string
): Promise<RoleActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.ROLES_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const admin = await createAdminSupabaseClient();

  const { data: role } = await admin
    .from("roles")
    .select("is_system, name")
    .eq("id", id)
    .maybeSingle();

  if (!role) {
    return { ok: false, message: "That role could not be found." };
  }

  if (role.is_system) {
    return {
      ok: false,
      message: "Built-in roles cannot be deleted. You can still change their permissions.",
    };
  }

  const { count } = await admin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: "This role is still assigned to one or more users. Reassign them first.",
    };
  }

  const { error } = await admin.from("roles").delete().eq("id", id);
  if (error) {
    return { ok: false, message: "The role could not be deleted." };
  }

  await logAdminAction(context, AUDIT_ACTIONS.ROLE_DELETED, {
    entityType: "role",
    entityId: id,
    summary: { name: role.name },
  });

  revalidatePath("/dashboard/roles");
  return { ok: true, message: "The role was deleted." };
}

/**
 * Sets a per-user permission override.
 *
 * A deny override always wins over the role grants.
 */
export async function setUserPermissionOverrideAction(
  userId: string,
  permissionKey: string,
  effect: "allow" | "deny" | "clear"
): Promise<RoleActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.ROLES_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  if (!ALL_PERMISSION_KEYS.includes(permissionKey as never)) {
    return { ok: false, message: "That permission is not recognised." };
  }

  const admin = await createAdminSupabaseClient();

  // The hidden superadmin principal cannot be constrained.
  const { data: principal } = await admin
    .from("app_principals")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (principal) {
    return { ok: false, message: "That account cannot be changed here." };
  }

  if (effect === "clear") {
    await admin
      .from("user_permission_overrides")
      .delete()
      .eq("user_id", userId)
      .eq("permission_key", permissionKey);
  } else {
    await admin
      .from("user_permission_overrides")
      .upsert(
        {
          user_id: userId,
          permission_key: permissionKey,
          effect,
          created_by: context.userId,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,permission_key" }
      );
  }

  await logAdminAction(context, AUDIT_ACTIONS.PERMISSIONS_CHANGED, {
    entityType: "app_user",
    entityId: userId,
    summary: { permissionKey, effect },
  });

  revalidatePath("/dashboard/roles");
  revalidatePath("/dashboard/users");
  return { ok: true, message: "The permission was updated." };
}
