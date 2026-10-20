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
import { assertMemberVisible } from "@/lib/members/scope";

const resolveSchema = z.object({
  flagId: z.string().uuid(),
  decision: z.enum(["confirmed", "distinct"]),
  notes: z.string().trim().max(1000).optional(),
});

export interface DuplicateActionResult {
  ok: boolean;
  message?: string;
}

/**
 * Resolves a duplicate flag.
 *
 * "Confirmed" means the two records belong to the same person and should
 * be merged by an administrator; the flag is closed with that decision.
 * "Distinct" means the two records are different people.
 *
 * No record is merged or deleted automatically — a merge is always an
 * explicit, separately audited administrative action.
 */
export async function resolveDuplicateAction(
  payload: unknown
): Promise<DuplicateActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.DUPLICATES_RESOLVE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = resolveSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "The resolution request was not valid." };
  }

  const { flagId, decision, notes } = parsed.data;

  const admin = await createAdminSupabaseClient();
  const { data: flag } = await admin
    .from("duplicate_flags")
    .select("id, member_a_id, member_b_id, status")
    .eq("id", flagId)
    .maybeSingle();

  if (!flag) {
    return { ok: false, message: "That duplicate alert could not be found." };
  }

  if (flag.status !== "pending") {
    return {
      ok: false,
      message: "That duplicate alert has already been reviewed.",
    };
  }

  try {
    await assertMemberVisible(context, flag.member_a_id);
    await assertMemberVisible(context, flag.member_b_id);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const { error } = await admin
    .from("duplicate_flags")
    .update({
      status: decision,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
      notes: notes?.trim() || null,
    })
    .eq("id", flagId)
    .eq("status", "pending");

  if (error) {
    console.error("[resolve-duplicate] failed", { error: error.message });
    return { ok: false, message: "The duplicate alert could not be updated." };
  }

  await logAdminAction(context, AUDIT_ACTIONS.DUPLICATE_RESOLVED, {
    entityType: "duplicate_flag",
    entityId: flagId,
    summary: {
      decision,
      memberA: flag.member_a_id,
      memberB: flag.member_b_id,
      notes: notes?.trim() || null,
    },
  });

  revalidatePath("/dashboard/duplicates");
  return {
    ok: true,
    message:
      decision === "confirmed"
        ? "Marked as the same person. An administrator can now merge the records."
        : "Marked as two different people.",
  };
}

/** Re-opens a previously resolved duplicate alert. */
export async function reopenDuplicateAction(
  flagId: string
): Promise<DuplicateActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.DUPLICATES_RESOLVE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const admin = await createAdminSupabaseClient();
  const { error } = await admin
    .from("duplicate_flags")
    .update({
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", flagId);

  if (error) {
    return { ok: false, message: "The duplicate alert could not be reopened." };
  }

  await logAdminAction(context, AUDIT_ACTIONS.DUPLICATE_RESOLVED, {
    entityType: "duplicate_flag",
    entityId: flagId,
    summary: { decision: "reopened" },
  });

  revalidatePath("/dashboard/duplicates");
  return { ok: true, message: "The duplicate alert was reopened for review." };
}
