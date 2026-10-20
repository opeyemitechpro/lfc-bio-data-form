"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { logAdminAction, AUDIT_ACTIONS } from "@/lib/audit";
import {
  requirePermission,
  PERMISSIONS,
  AuthorizationError,
} from "@/lib/auth/permissions";
import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { destroyImage } from "@/lib/cloudinary";
import { getCustomFields } from "@/lib/members/custom-fields";
import { validateCustomValues } from "@/lib/custom-fields";
import { registerMember } from "@/lib/members/register";
import { assertMemberVisible } from "@/lib/members/scope";
import { getPrivacyNotice } from "@/lib/settings";
import { normalizeEmail, normalizePhone } from "@/lib/phone";
import { adminMemberSchema } from "@/lib/validation/registration";

export interface MemberActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  memberId?: string;
  referenceNo?: string;
}

async function requestIp(): Promise<string | null> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    return forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip");
  } catch {
    return null;
  }
}

/** Creates a member record from the administrator dashboard. */
export async function createMemberAction(
  payload: unknown
): Promise<MemberActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.MEMBERS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = adminMemberSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      message: "Please correct the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  const notice = await getPrivacyNotice();

  const customFields = await getCustomFields({ activeOnly: true });
  const customErrors = validateCustomValues(customFields, data.customValues ?? {});
  if (Object.keys(customErrors).length > 0) {
    return {
      ok: false,
      message: "Please correct the highlighted fields and try again.",
      fieldErrors: customErrors,
    };
  }

  const admin = await createAdminSupabaseClient();
  const { data: title } = await admin
    .from("titles")
    .select("id")
    .eq("id", data.titleId)
    .maybeSingle();

  if (!title) {
    return {
      ok: false,
      message: "Please correct the highlighted fields and try again.",
      fieldErrors: { titleId: "Please select a valid title." },
    };
  }

  try {
    const result = await registerMember({
      fullName: data.fullName,
      titleId: data.titleId,
      gender: data.gender,
      ageCategory: data.ageCategory,
      birthDay: data.birthDay ?? null,
      birthMonth: data.birthMonth ?? null,
      primaryPhone: data.primaryPhone,
      whatsappSameAsPrimary: data.whatsappSameAsPrimary,
      whatsappPhone: data.whatsappPhone.trim() || null,
      additionalPhones: (data.additionalPhones ?? []).filter((p) => p.trim().length > 0),
      email: data.email.trim() || null,
      residentialAddress: data.residentialAddress.trim() || null,
      membershipDuration: data.membershipDuration,
      suggestions: data.suggestions.trim() || null,
      photoPublicId: data.photo?.publicId ?? null,
      photoFormat: data.photo?.format ?? null,
      photoWidth: data.photo?.width ?? null,
      photoHeight: data.photo?.height ?? null,
      photoBytes: data.photo?.bytes ?? null,
      serviceUnitIds: (data.serviceUnitIds ?? []).filter((id) => id !== "__none__"),
      customValues: data.customValues ?? {},
      consent: {
        noticeVersion: notice.version,
        isChildRegistration: data.isChildRegistration,
        guardianName: data.guardianName.trim() || null,
        guardianRelationship: data.guardianRelationship.trim() || null,
        guardianPhone: data.guardianPhone.trim() || null,
      },
      registrationSource: "admin",
      createdBy: context.userId,
    });

    await logAdminAction(context, AUDIT_ACTIONS.MEMBER_CREATED, {
      entityType: "member",
      entityId: result.memberId,
      entityRef: result.referenceNo,
      summary: { source: "admin" },
      ipAddress: await requestIp(),
    });

    revalidatePath("/dashboard/members");
    return {
      ok: true,
      memberId: result.memberId,
      referenceNo: result.referenceNo,
      message: "The member record was created.",
    };
  } catch (error) {
    console.error("[create-member] failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return {
      ok: false,
      message: "The member record could not be created. Please try again.",
    };
  }
}

const updateSchema = z.object({
  memberId: z.string().uuid(),
  fullName: z.string().trim().min(2, "Please enter the full name.").max(200),
  titleId: z.string().trim().min(1, "Please select a title."),
  gender: z.enum(["male", "female"]),
  ageCategory: z.enum(["child", "youth", "adult"]),
  birthDay: z.number().int().min(1).max(31).optional(),
  birthMonth: z.number().int().min(1).max(12).optional(),
  primaryPhone: z.string().trim().min(7).max(30),
  whatsappSameAsPrimary: z.boolean(),
  whatsappPhone: z.string().trim().max(30),
  additionalPhones: z.array(z.string().trim().max(30)).max(5).optional(),
  email: z.string().trim().max(200),
  residentialAddress: z.string().trim().max(500),
  membershipDuration: z.enum(["lt_1y", "y1_3", "y4_6", "y7_10", "gt_10y"]),
  suggestions: z.string().trim().max(2000),
  serviceUnitIds: z.array(z.string().uuid()).optional(),
  customValues: z.record(z.string(), z.unknown()).optional(),
  photo: z
    .object({
      publicId: z.string().min(1),
      format: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      bytes: z.number().int().positive(),
    })
    .nullable()
    .optional(),
  removePhoto: z.boolean().optional(),
});

/** Updates an existing member record. */
export async function updateMemberAction(
  payload: unknown
): Promise<MemberActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.MEMBERS_EDIT);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      message: "Please correct the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    await assertMemberVisible(context, data.memberId);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const admin = await createAdminSupabaseClient();

  // Fetch the current state so we can detect changes and clean up the old
  // photograph only after the new one is safely stored.
  const { data: current, error: currentError } = await admin
    .from("members")
    .select("*")
    .eq("id", data.memberId)
    .maybeSingle();

  if (currentError || !current) {
    return { ok: false, message: "The member record could not be found." };
  }

  const customFields = await getCustomFields({ activeOnly: true });
  const customErrors = validateCustomValues(customFields, data.customValues ?? {});
  if (Object.keys(customErrors).length > 0) {
    return {
      ok: false,
      message: "Please correct the highlighted fields and try again.",
      fieldErrors: customErrors,
    };
  }

  const primaryPhoneNormalized = normalizePhone(data.primaryPhone);
  const whatsappPhone = data.whatsappSameAsPrimary
    ? null
    : data.whatsappPhone.trim() || null;

  const changedFields: string[] = [];
  if (current.full_name !== data.fullName) changedFields.push("full_name");
  if (current.primary_phone_normalized !== primaryPhoneNormalized)
    changedFields.push("primary_phone");
  if ((current.email_normalized ?? "") !== normalizeEmail(data.email))
    changedFields.push("email");
  if (current.membership_duration !== data.membershipDuration)
    changedFields.push("membership_duration");

  const photoChanged = data.photo !== undefined && data.photo !== null;
  const photoRemoved = data.removePhoto === true;

  const { error: updateError } = await admin
    .from("members")
    .update({
      full_name: data.fullName,
      title_id: data.titleId,
      gender: data.gender,
      age_category: data.ageCategory,
      birth_day: data.birthDay ?? null,
      birth_month: data.birthMonth ?? null,
      primary_phone: data.primaryPhone,
      primary_phone_normalized: primaryPhoneNormalized,
      whatsapp_same_as_primary: data.whatsappSameAsPrimary,
      whatsapp_phone: whatsappPhone,
      whatsapp_phone_normalized: whatsappPhone
        ? normalizePhone(whatsappPhone)
        : primaryPhoneNormalized,
      email: data.email.trim() || null,
      email_normalized: normalizeEmail(data.email) || null,
      residential_address: data.residentialAddress.trim() || null,
      membership_duration: data.membershipDuration,
      suggestions: data.suggestions.trim() || null,
      ...(photoChanged
        ? {
            photo_public_id: data.photo?.publicId,
            photo_format: data.photo?.format,
            photo_width: data.photo?.width,
            photo_height: data.photo?.height,
            photo_bytes: data.photo?.bytes,
            photo_uploaded_at: new Date().toISOString(),
          }
        : {}),
      ...(photoRemoved
        ? {
            photo_public_id: null,
            photo_format: null,
            photo_width: null,
            photo_height: null,
            photo_bytes: null,
            photo_uploaded_at: null,
          }
        : {}),
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.memberId);

  if (updateError) {
    console.error("[update-member] failed", { error: updateError.message });
    return { ok: false, message: "The member record could not be updated." };
  }

  // Replace the phone numbers.
  await admin.from("member_phones").delete().eq("member_id", data.memberId);

  const phoneRows = [
    {
      member_id: data.memberId,
      phone: data.primaryPhone,
      phone_normalized: primaryPhoneNormalized,
      label: "primary",
      is_primary: true,
    },
  ];

  if (data.whatsappSameAsPrimary) {
    phoneRows.push({
      member_id: data.memberId,
      phone: data.primaryPhone,
      phone_normalized: primaryPhoneNormalized,
      label: "whatsapp" as const,
      is_primary: false,
    });
  } else if (whatsappPhone) {
    phoneRows.push({
      member_id: data.memberId,
      phone: whatsappPhone,
      phone_normalized: normalizePhone(whatsappPhone),
      label: "whatsapp" as const,
      is_primary: false,
    });
  }

  for (const extra of data.additionalPhones ?? []) {
    if (!extra.trim()) continue;
    phoneRows.push({
      member_id: data.memberId,
      phone: extra.trim(),
      phone_normalized: normalizePhone(extra),
      label: "other" as const,
      is_primary: false,
    });
  }

  await admin.from("member_phones").insert(phoneRows);

  // Replace the service unit assignments.
  const unitIds = (data.serviceUnitIds ?? []).filter((id) => id !== "__none__");
  await admin.from("member_service_units").delete().eq("member_id", data.memberId);
  if (unitIds.length > 0) {
    await admin.from("member_service_units").insert(
      unitIds.map((serviceUnitId) => ({
        member_id: data.memberId,
        service_unit_id: serviceUnitId,
        assigned_by: context.userId,
      }))
    );
  }

  // Replace the custom field values.
  if (data.customValues) {
    const fieldByKey = new Map(customFields.map((field) => [field.field_key, field]));
    const { data: existingValues } = await admin
      .from("member_custom_values")
      .select("field_id")
      .eq("member_id", data.memberId);

    const existingIds = new Set((existingValues ?? []).map((row) => row.field_id));
    const upsertRows: {
      member_id: string;
      field_id: string;
      value: unknown;
    }[] = [];

    for (const [key, value] of Object.entries(data.customValues)) {
      const field = fieldByKey.get(key);
      if (!field) continue;
      upsertRows.push({ member_id: data.memberId, field_id: field.id, value });
      existingIds.delete(field.id);
    }

    if (upsertRows.length > 0) {
      await admin
        .from("member_custom_values")
        .upsert(upsertRows, { onConflict: "member_id,field_id" });
    }

    // Values for fields that are no longer submitted are removed.
    if (existingIds.size > 0) {
      await admin
        .from("member_custom_values")
        .delete()
        .eq("member_id", data.memberId)
        .in("field_id", Array.from(existingIds));
    }
  }

  // Clean up the replaced or removed photograph.
  const oldPhoto = current.photo_public_id as string | null;
  if ((photoChanged || photoRemoved) && oldPhoto && oldPhoto !== data.photo?.publicId) {
    await destroyImage(oldPhoto);
  }

  await logAdminAction(context, AUDIT_ACTIONS.MEMBER_UPDATED, {
    entityType: "member",
    entityId: data.memberId,
    entityRef: current.reference_no,
    summary: {
      changedFields,
      photoChanged,
      photoRemoved,
    },
    ipAddress: await requestIp(),
  });

  revalidatePath("/dashboard/members");
  revalidatePath(`/dashboard/members/${data.memberId}`);

  return { ok: true, message: "The member record was updated." };
}

/** Soft-deletes a member record. */
export async function deleteMemberAction(
  memberId: string,
  reason?: string
): Promise<MemberActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.MEMBERS_DELETE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  if (!/^[0-9a-f-]{36}$/i.test(memberId)) {
    return { ok: false, message: "That member record could not be found." };
  }

  try {
    await assertMemberVisible(context, memberId);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const admin = await createAdminSupabaseClient();
  const { data: current } = await admin
    .from("members")
    .select("reference_no")
    .eq("id", memberId)
    .maybeSingle();

  if (!current) {
    return { ok: false, message: "That member record could not be found." };
  }

  const { error } = await admin
    .from("members")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by: context.userId,
      deletion_reason: reason?.trim() || null,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) {
    console.error("[delete-member] failed", { error: error.message });
    return { ok: false, message: "The member record could not be deleted." };
  }

  await logAdminAction(context, AUDIT_ACTIONS.MEMBER_DELETED, {
    entityType: "member",
    entityId: memberId,
    entityRef: current.reference_no,
    summary: { reason: reason?.trim() || null, recoverable: true },
    ipAddress: await requestIp(),
  });

  revalidatePath("/dashboard/members");
  return { ok: true, message: "The member record was deleted and can be restored." };
}

/** Restores a soft-deleted member record. */
export async function restoreMemberAction(
  memberId: string
): Promise<MemberActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.MEMBERS_DELETE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  if (!/^[0-9a-f-]{36}$/i.test(memberId)) {
    return { ok: false, message: "That member record could not be found." };
  }

  const admin = await createAdminSupabaseClient();
  const { data: current } = await admin
    .from("members")
    .select("reference_no, status")
    .eq("id", memberId)
    .maybeSingle();

  if (!current) {
    return { ok: false, message: "That member record could not be found." };
  }

  const { error } = await admin
    .from("members")
    .update({
      status: "active",
      deleted_at: null,
      deleted_by: null,
      deletion_reason: null,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) {
    return { ok: false, message: "The member record could not be restored." };
  }

  await logAdminAction(context, AUDIT_ACTIONS.MEMBER_RESTORED, {
    entityType: "member",
    entityId: memberId,
    entityRef: current.reference_no,
    summary: {},
    ipAddress: await requestIp(),
  });

  revalidatePath("/dashboard/members");
  return { ok: true, message: "The member record was restored." };
}

/** Permanently removes a member record and its photograph. */
export async function purgeMemberAction(
  memberId: string,
  confirmation: string
): Promise<MemberActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.MEMBERS_DELETE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  if (confirmation !== "DELETE PERMANENTLY") {
    return {
      ok: false,
      message: 'Type "DELETE PERMANENTLY" to confirm this action.',
    };
  }

  const admin = await createAdminSupabaseClient();
  const { data: current } = await admin
    .from("members")
    .select("reference_no, photo_public_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!current) {
    return { ok: false, message: "That member record could not be found." };
  }

  const { error } = await admin.from("members").delete().eq("id", memberId);
  if (error) {
    return { ok: false, message: "The member record could not be removed." };
  }

  if (current.photo_public_id) {
    await destroyImage(current.photo_public_id);
  }

  await logAdminAction(context, AUDIT_ACTIONS.MEMBER_PERMANENTLY_DELETED, {
    entityType: "member",
    entityId: memberId,
    entityRef: current.reference_no,
    summary: { photoRemoved: Boolean(current.photo_public_id) },
    ipAddress: await requestIp(),
  });

  revalidatePath("/dashboard/members");
  return { ok: true, message: "The member record was permanently removed." };
}
