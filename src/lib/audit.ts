import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import type { AuthContext } from "@/lib/types";

export const AUDIT_ACTIONS = {
  MEMBER_CREATED: "member.created",
  MEMBER_UPDATED: "member.updated",
  MEMBER_DELETED: "member.deleted",
  MEMBER_RESTORED: "member.restored",
  MEMBER_PERMANENTLY_DELETED: "member.permanently_deleted",
  PHOTO_REPLACED: "member.photo_replaced",
  PHOTO_REMOVED: "member.photo_removed",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_SUSPENDED: "user.suspended",
  USER_REACTIVATED: "user.reactivated",
  ROLE_CREATED: "role.created",
  ROLE_UPDATED: "role.updated",
  ROLE_DELETED: "role.deleted",
  PERMISSIONS_CHANGED: "role.permissions_changed",
  CUSTOM_FIELD_CREATED: "custom_field.created",
  CUSTOM_FIELD_UPDATED: "custom_field.updated",
  CUSTOM_FIELD_DELETED: "custom_field.deleted",
  SERVICE_UNIT_CHANGED: "service_unit.changed",
  TITLE_CHANGED: "title.changed",
  SETTINGS_CHANGED: "settings.changed",
  DUPLICATE_RESOLVED: "duplicate.resolved",
  EXPORT_PERFORMED: "export.performed",
  PRINT_PERFORMED: "print.performed",
  REGISTRATION_RECEIVED: "registration.received",
  LOGIN_SUCCEEDED: "auth.login_succeeded",
  LOGIN_FAILED: "auth.login_failed",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditInput {
  action: AuditAction | string;
  entityType?: string;
  entityId?: string;
  entityRef?: string;
  summary?: Record<string, unknown>;
  actor?: { id: string; email: string } | null;
  ipAddress?: string | null;
}

/**
 * Writes an audit event.
 *
 * Never throws into the caller's control flow: an audit write failure must
 * not roll back the user's action, but it is logged to the server console.
 * Passwords, tokens and secrets are never included in the summary.
 */
export async function logAuditEvent(input: AuditInput): Promise<void> {
  try {
    const admin = await createAdminSupabaseClient();
    await admin.from("audit_events").insert({
      actor_user_id: input.actor?.id ?? null,
      actor_email: input.actor?.email ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      entity_ref: input.entityRef ?? null,
      summary: input.summary ?? {},
      ip_address: input.ipAddress ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to write audit event", {
      action: input.action,
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
}

/** Convenience wrapper for authenticated administrative actions. */
export async function logAdminAction(
  context: AuthContext,
  action: AuditAction | string,
  input: Omit<AuditInput, "action" | "actor"> = {}
): Promise<void> {
  await logAuditEvent({
    ...input,
    action,
    actor: { id: context.userId, email: context.email },
  });
}
