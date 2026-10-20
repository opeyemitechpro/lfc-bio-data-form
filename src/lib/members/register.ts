import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { normalizeEmail, normalizePhone } from "@/lib/phone";
import { validateCustomValues } from "@/lib/custom-fields";
import type { CustomFieldDefinition } from "@/lib/types";

export interface RegistrationInput {
  fullName: string;
  titleId: string | null;
  gender: "male" | "female";
  ageCategory: "child" | "youth" | "adult";
  birthDay: number | null;
  birthMonth: number | null;
  primaryPhone: string;
  whatsappSameAsPrimary: boolean;
  whatsappPhone: string | null;
  additionalPhones: string[];
  email: string | null;
  residentialAddress: string | null;
  membershipDuration: "lt_1y" | "y1_3" | "y4_6" | "y7_10" | "gt_10y";
  suggestions: string | null;
  photoPublicId: string | null;
  photoFormat: string | null;
  photoWidth: number | null;
  photoHeight: number | null;
  photoBytes: number | null;
  serviceUnitIds: string[];
  customValues: Record<string, unknown>;
  consent: {
    noticeVersion: string;
    isChildRegistration: boolean;
    guardianName: string | null;
    guardianRelationship: string | null;
    guardianPhone: string | null;
  };
  registrationSource?: "public_form" | "admin";
  createdBy?: string | null;
  idempotencyKey?: string | null;
}

export interface RegistrationResult {
  memberId: string;
  referenceNo: string;
  duplicateFlagged: boolean;
}

/**
 * Persists a validated registration.
 *
 * Steps:
 *   1. generate the member reference number (collision-safe sequence),
 *   2. insert the member row,
 *   3. insert related phones, service units, custom values and consent,
 *   4. run duplicate detection and flag possible matches for review.
 *
 * The member row and its related rows are written in a single logical
 * transaction via the PostgREST RPC `create_member_registration`, which is
 * defined in migration 005. A failed write leaves no partial record.
 */
export async function registerMember(
  input: RegistrationInput
): Promise<RegistrationResult> {
  const admin = await createAdminSupabaseClient();

  const primaryPhoneNormalized = normalizePhone(input.primaryPhone);
  const whatsappPhoneNormalized = input.whatsappSameAsPrimary
    ? primaryPhoneNormalized
    : input.whatsappPhone
      ? normalizePhone(input.whatsappPhone)
      : null;

  const additionalPhoneRows = input.additionalPhones
    .map((phone) => ({ phone: phone.trim(), normalized: normalizePhone(phone) }))
    .filter((row) => row.phone.length > 0 && row.normalized !== primaryPhoneNormalized);

  const emailNormalized = input.email ? normalizeEmail(input.email) : null;

  const { data, error } = await admin.rpc("create_member_registration", {
    p_full_name: input.fullName.trim().replace(/\s+/g, " "),
    p_title_id: input.titleId,
    p_gender: input.gender,
    p_age_category: input.ageCategory,
    p_birth_day: input.birthDay,
    p_birth_month: input.birthMonth,
    p_primary_phone: input.primaryPhone.trim(),
    p_primary_phone_normalized: primaryPhoneNormalized,
    p_whatsapp_same_as_primary: input.whatsappSameAsPrimary,
    p_whatsapp_phone: input.whatsappSameAsPrimary ? null : input.whatsappPhone,
    p_whatsapp_phone_normalized: whatsappPhoneNormalized,
    p_email: input.email ? input.email.trim() : null,
    p_email_normalized: emailNormalized,
    p_residential_address: input.residentialAddress?.trim() || null,
    p_membership_duration: input.membershipDuration,
    p_suggestions: input.suggestions?.trim() || null,
    p_photo_public_id: input.photoPublicId,
    p_photo_format: input.photoFormat,
    p_photo_width: input.photoWidth,
    p_photo_height: input.photoHeight,
    p_photo_bytes: input.photoBytes,
    p_registration_source: input.registrationSource ?? "public_form",
    p_created_by: input.createdBy ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_service_unit_ids: input.serviceUnitIds.length > 0 ? input.serviceUnitIds : null,
    p_additional_phones: additionalPhoneRows.length > 0 ? additionalPhoneRows : null,
    p_custom_values: input.customValues,
    p_notice_version: input.consent.noticeVersion,
    p_is_child_registration: input.consent.isChildRegistration,
    p_guardian_name: input.consent.guardianName,
    p_guardian_relationship: input.consent.guardianRelationship,
    p_guardian_phone: input.consent.guardianPhone,
  });

  if (error) {
    throw new Error(`Failed to save registration: ${error.message}`);
  }

  const result = Array.isArray(data) ? data[0] : data;
  const memberId = String(result?.member_id ?? "");
  const referenceNo = String(result?.reference_no ?? "");
  const duplicateFlagged = Boolean(result?.duplicate_flagged);

  if (!memberId) {
    throw new Error("The registration could not be completed. Please try again.");
  }

  return { memberId, referenceNo, duplicateFlagged };
}

/**
 * Runs duplicate detection for a member against existing records using
 * normalised phone numbers and email addresses.
 */
export async function detectDuplicates(
  memberId: string
): Promise<number> {
  const admin = await createAdminSupabaseClient();

  const { data: member } = await admin
    .from("members")
    .select("primary_phone_normalized, whatsapp_phone_normalized, email_normalized, full_name")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) return 0;

  const phoneKeys = [member.primary_phone_normalized, member.whatsapp_phone_normalized]
    .filter((value): value is string => Boolean(value));

  const candidates = new Map<string, { reason: string; score: number }>();

  if (phoneKeys.length > 0) {
    const filters = phoneKeys.flatMap((key) => [
      `primary_phone_normalized.eq.${key}`,
      `whatsapp_phone_normalized.eq.${key}`,
    ]);

    const { data } = await admin
      .from("members")
      .select("id, primary_phone_normalized, whatsapp_phone_normalized")
      .eq("status", "active")
      .neq("id", memberId)
      .or(filters.join(","));

    for (const row of data ?? []) {
      candidates.set(row.id, { reason: "Matching phone number", score: 100 });
    }
  }

  if (member.email_normalized) {
    const { data } = await admin
      .from("members")
      .select("id")
      .eq("status", "active")
      .neq("id", memberId)
      .eq("email_normalized", member.email_normalized);

    for (const row of data ?? []) {
      const existing = candidates.get(row.id);
      candidates.set(row.id, {
        reason: existing ? "Matching phone number and email address" : "Matching email address",
        score: existing ? 100 : 80,
      });
    }
  }

  // Similar names are a weak signal — flagged with a low score for review.
  const nameKey = String(member.full_name ?? "").trim().toLowerCase();
  if (nameKey.length >= 4) {
    const { data } = await admin
      .from("members")
      .select("id")
      .eq("status", "active")
      .neq("id", memberId)
      .ilike("full_name", `%${nameKey}%`);

    for (const row of data ?? []) {
      if (!candidates.has(row.id)) {
        candidates.set(row.id, { reason: "Similar name", score: 40 });
      }
    }
  }

  let flagged = 0;
  for (const [otherId, info] of candidates) {
    const memberA = memberId < otherId ? memberId : otherId;
    const memberB = memberId < otherId ? otherId : memberId;

    const { error } = await admin.from("duplicate_flags").upsert(
      {
        member_a_id: memberA,
        member_b_id: memberB,
        match_reason: info.reason,
        match_score: info.score,
        status: "pending",
      },
      { onConflict: "member_a_id,member_b_id", ignoreDuplicates: true }
    );

    if (!error) flagged += 1;
  }

  return flagged;
}

/** Validates custom values for a set of field definitions. */
export function validateRegistrationCustomValues(
  fields: CustomFieldDefinition[],
  values: Record<string, unknown>
): Record<string, string> {
  return validateCustomValues(fields, values);
}
