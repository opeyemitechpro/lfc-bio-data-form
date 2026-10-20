"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAdminAction, AUDIT_ACTIONS } from "@/lib/audit";
import {
  requirePermission,
  PERMISSIONS,
  AuthorizationError,
} from "@/lib/auth/permissions";
import { getFormSettings, getPrivacyNotice, updateSetting } from "@/lib/settings";

export interface SettingsActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const privacySchema = z.object({
  version: z.string().trim().min(1, "Enter a notice version.").max(20),
  updatedAt: z.string().trim().min(1).max(40),
  organisation: z.string().trim().min(1, "Enter the organisation name.").max(200),
  contactEmail: z.string().trim().email("Enter a valid email address."),
  contactPhone: z.string().trim().max(40),
  retentionYears: z.number().int().min(1).max(100),
  thirdParties: z.array(z.string().trim().min(1).max(200)).max(20),
});

const formSchema = z.object({
  requireAddress: z.boolean(),
  maxUploadBytes: z.number().int().min(100_000).max(20_000_000),
  acceptsChildren: z.boolean(),
  requireGuardianConsent: z.boolean(),
  allowAdditionalPhones: z.boolean(),
  allowSuggestions: z.boolean(),
  successMessage: z.string().trim().min(1).max(400),
});

const retentionSchema = z.object({
  memberYears: z.number().int().min(1).max(100),
  deletedRecordMonths: z.number().int().min(1).max(120),
  photoDeletionOnPermanentDelete: z.boolean(),
});

/** Updates the privacy notice shown on the public registration form. */
export async function updatePrivacyNoticeAction(
  payload: unknown
): Promise<SettingsActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = privacySchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors };
  }

  await updateSetting("privacy_notice", parsed.data, context.userId);

  await logAdminAction(context, AUDIT_ACTIONS.SETTINGS_CHANGED, {
    entityType: "setting",
    entityRef: "privacy_notice",
    summary: { version: parsed.data.version },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/register");
  revalidatePath("/privacy-policy");
  return { ok: true, message: "The privacy notice was updated." };
}

/** Updates the public registration form behaviour. */
export async function updateFormSettingsAction(
  payload: unknown
): Promise<SettingsActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.FORM_SETTINGS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = formSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors };
  }

  await updateSetting("form_settings", parsed.data, context.userId);

  await logAdminAction(context, AUDIT_ACTIONS.SETTINGS_CHANGED, {
    entityType: "setting",
    entityRef: "form_settings",
    summary: parsed.data as Record<string, unknown>,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/register");
  return { ok: true, message: "The form settings were updated." };
}

/** Updates the data retention policy. */
export async function updateRetentionPolicyAction(
  payload: unknown
): Promise<SettingsActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = retentionSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Please correct the highlighted fields." };
  }

  await updateSetting("retention_policy", parsed.data, context.userId);

  await logAdminAction(context, AUDIT_ACTIONS.SETTINGS_CHANGED, {
    entityType: "setting",
    entityRef: "retention_policy",
    summary: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "The retention policy was updated." };
}

export { getFormSettings, getPrivacyNotice };
