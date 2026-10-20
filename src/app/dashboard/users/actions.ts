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
import { normalizeEmail } from "@/lib/phone";

export interface UserActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const createUserSchema = z.object({
  email: z.string().trim().min(1, "Enter an email address.").email("Enter a valid email address."),
  fullName: z.string().trim().max(200).optional(),
  temporaryPassword: z
    .string()
    .min(12, "The temporary password must be at least 12 characters long.")
    .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), {
      message: "The temporary password must include at least one letter and one number.",
    }),
  roleIds: z.array(z.string().uuid()).default([]),
  serviceUnitScopeIds: z.array(z.string().uuid()).default([]),
});

/**
 * Creates an administrator account.
 *
 * The account is created with a temporary password that the user MUST
 * change at first sign-in. The password is never stored in the
 * application's tables — Supabase Auth manages it.
 */
export async function createUserAction(
  payload: unknown
): Promise<UserActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.USERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;
  const email = normalizeEmail(data.email);
  const admin = await createAdminSupabaseClient();

  // Refuse to create a second account for an address that already exists.
  const { data: existing } = await admin
    .from("app_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: { email: "An account already exists for this email address." },
    };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: data.temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: data.fullName?.trim() || null },
  });

  if (authError) {
    return {
      ok: false,
      message: "The account could not be created. The email address may already be registered.",
    };
  }

  const userId = authData.user.id;

  const { error: profileError } = await admin.from("app_users").insert({
    id: userId,
    email,
    full_name: data.fullName?.trim() || null,
    is_active: true,
    status: "active",
    // The temporary password must be changed at first sign-in.
    must_change_password: true,
    created_by: context.userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    // Roll back the Auth identity so no orphan account is left behind.
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, message: "The account could not be created." };
  }

  if (data.roleIds.length > 0) {
    await admin.from("user_roles").insert(
      data.roleIds.map((roleId) => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: context.userId,
      }))
    );
  }

  if (data.serviceUnitScopeIds.length > 0) {
    await admin.from("user_service_unit_scopes").insert(
      data.serviceUnitScopeIds.map((serviceUnitId) => ({
        user_id: userId,
        service_unit_id: serviceUnitId,
      }))
    );
  }

  await logAdminAction(context, AUDIT_ACTIONS.USER_CREATED, {
    entityType: "app_user",
    entityId: userId,
    entityRef: email,
    summary: {
      roleIds: data.roleIds,
      scopedServiceUnits: data.serviceUnitScopeIds.length,
      mustChangePassword: true,
    },
  });

  revalidatePath("/dashboard/users");
  return {
    ok: true,
    message: `The account for ${email} was created. Share the temporary password securely and ask them to change it at first sign-in.`,
  };
}

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().max(200).optional(),
  roleIds: z.array(z.string().uuid()),
  serviceUnitScopeIds: z.array(z.string().uuid()),
});

/** Updates a user's profile, roles and service unit scope. */
export async function updateUserAction(
  payload: unknown
): Promise<UserActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.USERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "The update request was not valid." };
  }

  const { userId, fullName, roleIds, serviceUnitScopeIds } = parsed.data;
  const admin = await createAdminSupabaseClient();

  // The hidden superadmin principal must never be modified through the
  // ordinary user-management code path.
  const { data: principal } = await admin
    .from("app_principals")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (principal) {
    return {
      ok: false,
      message: "That account cannot be modified here.",
    };
  }

  const { data: target } = await admin
    .from("app_users")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();

  if (!target) {
    return { ok: false, message: "That account could not be found." };
  }

  const { error: profileError } = await admin
    .from("app_users")
    .update({
      full_name: fullName?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return { ok: false, message: "The account could not be updated." };
  }

  // Replace the role assignments.
  await admin.from("user_roles").delete().eq("user_id", userId);
  if (roleIds.length > 0) {
    await admin.from("user_roles").insert(
      roleIds.map((roleId) => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: context.userId,
      }))
    );
  }

  // Replace the service unit scope.
  await admin.from("user_service_unit_scopes").delete().eq("user_id", userId);
  if (serviceUnitScopeIds.length > 0) {
    await admin.from("user_service_unit_scopes").insert(
      serviceUnitScopeIds.map((serviceUnitId) => ({
        user_id: userId,
        service_unit_id: serviceUnitId,
      }))
    );
  }

  await logAdminAction(context, AUDIT_ACTIONS.USER_UPDATED, {
    entityType: "app_user",
    entityId: userId,
    entityRef: target.email,
    summary: { roleIds, scopedServiceUnits: serviceUnitScopeIds.length },
  });

  revalidatePath("/dashboard/users");
  return { ok: true, message: "The account was updated." };
}

/** Suspends an account, immediately revoking its access. */
export async function suspendUserAction(
  userId: string
): Promise<UserActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.USERS_ACTIVATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const admin = await createAdminSupabaseClient();

  const { data: principal } = await admin
    .from("app_principals")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (principal) {
    return { ok: false, message: "That account cannot be suspended here." };
  }

  if (userId === context.userId) {
    return { ok: false, message: "You cannot suspend your own account." };
  }

  const { data: target } = await admin
    .from("app_users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (!target) {
    return { ok: false, message: "That account could not be found." };
  }

  const { error } = await admin
    .from("app_users")
    .update({
      status: "suspended",
      is_active: false,
      suspended_at: new Date().toISOString(),
      suspended_by: context.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { ok: false, message: "The account could not be suspended." };
  }

  // Revoke the active sessions so the suspension takes effect at once.
  try {
    await admin.auth.admin.signOut(userId, "global");
  } catch {
    // The database flag is the authoritative check; a failure here is not fatal.
  }

  await logAdminAction(context, AUDIT_ACTIONS.USER_SUSPENDED, {
    entityType: "app_user",
    entityId: userId,
    entityRef: target.email,
    summary: {},
  });

  revalidatePath("/dashboard/users");
  return { ok: true, message: "The account has been suspended." };
}

/** Reactivates a suspended account. */
export async function reactivateUserAction(
  userId: string
): Promise<UserActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.USERS_ACTIVATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const admin = await createAdminSupabaseClient();

  const { data: target } = await admin
    .from("app_users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (!target) {
    return { ok: false, message: "That account could not be found." };
  }

  const { error } = await admin
    .from("app_users")
    .update({
      status: "active",
      is_active: true,
      suspended_at: null,
      suspended_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { ok: false, message: "The account could not be reactivated." };
  }

  await logAdminAction(context, AUDIT_ACTIONS.USER_REACTIVATED, {
    entityType: "app_user",
    entityId: userId,
    entityRef: target.email,
    summary: {},
  });

  revalidatePath("/dashboard/users");
  return { ok: true, message: "The account is active again." };
}

/** Issues a new temporary password, forcing a change at next sign-in. */
export async function resetUserPasswordAction(
  userId: string,
  temporaryPassword: string
): Promise<UserActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.USERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = z
    .string()
    .min(12, "The temporary password must be at least 12 characters long.")
    .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), {
      message: "The temporary password must include at least one letter and one number.",
    })
    .safeParse(temporaryPassword);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const admin = await createAdminSupabaseClient();

  const { data: principal } = await admin
    .from("app_principals")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (principal) {
    return { ok: false, message: "That account cannot be changed here." };
  }

  const { data: target } = await admin
    .from("app_users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (!target) {
    return { ok: false, message: "That account could not be found." };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: parsed.data,
  });

  if (error) {
    return { ok: false, message: "The password could not be reset." };
  }

  await admin
    .from("app_users")
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq("id", userId);

  await logAdminAction(context, AUDIT_ACTIONS.USER_UPDATED, {
    entityType: "app_user",
    entityId: userId,
    entityRef: target.email,
    summary: { action: "password_reset", mustChangePassword: true },
  });

  revalidatePath("/dashboard/users");
  return {
    ok: true,
    message: "A new temporary password was set. The user must change it at next sign-in.",
  };
}
