"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { createUploadSignature } from "@/lib/cloudinary";
import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { getFormSettings, getPrivacyNotice } from "@/lib/settings";
import { registerMember } from "@/lib/members/register";
import { getActiveCustomFields } from "@/lib/members/custom-fields";
import { validateCustomValues } from "@/lib/custom-fields";
import { normalizePhone } from "@/lib/phone";
import { registrationSchema } from "@/lib/validation/registration";
import { checkRateLimit } from "@/lib/rate-limit";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
}

async function requestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip");
    return { ip: ip ?? null, userAgent: headerList.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Issues a signed Cloudinary upload ticket for the public registration form.
 * Rate limited so the signing endpoint cannot be abused.
 */
export async function requestUploadSignature(): Promise<
  ActionResult<{ signature: string; timestamp: number; folder: string; publicId: string; apiKey: string; maxBytes: number; allowedFormats: string; transformation: string }>
> {
  const { ip } = await requestContext();
  const settings = await getFormSettings();

  const allowed = await checkRateLimit("upload", ip ?? "anonymous", 20);
  if (!allowed) {
    return {
      ok: false,
      message: "Too many upload attempts. Please wait a few minutes and try again.",
    };
  }

  try {
    const params = createUploadSignature({ maxBytes: settings.maxUploadBytes });
    return {
      ok: true,
      data: {
        signature: params.signature,
        timestamp: params.timestamp,
        folder: params.folder,
        publicId: params.public_id,
        apiKey: params.api_key,
        maxBytes: params.max_file_size,
        allowedFormats: params.allowed_formats,
        transformation: params.transformation,
      },
    };
  } catch (error) {
    console.error("[upload-signature] failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return {
      ok: false,
      message: "Photograph uploads are temporarily unavailable. Please try again shortly.",
    };
  }
}

/**
 * Handles a public registration submission.
 *
 * The submission is validated on the server, persisted transactionally and
 * flagged for duplicate review when a possible match is detected.
 */
export async function submitRegistration(
  payload: unknown
): Promise<ActionResult<{ referenceNo: string }>> {
  const { ip, userAgent } = await requestContext();

  const allowed = await checkRateLimit("registration", ip ?? "anonymous", 10);
  if (!allowed) {
    return {
      ok: false,
      message:
        "Too many registration attempts from this connection. Please contact the church office if this is a mistake.",
    };
  }

  const parsed = registrationSchema.safeParse(payload);
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
  const settings = await getFormSettings();
  const notice = await getPrivacyNotice();

  const residentialAddress = data.residentialAddress.trim() || null;
  const email = data.email.trim() || null;
  const suggestions = data.suggestions.trim() || null;
  const guardianName = data.guardianName.trim() || null;
  const guardianRelationship = data.guardianRelationship.trim() || null;
  const guardianPhone = data.guardianPhone.trim() || null;
  const whatsappPhone = data.whatsappPhone.trim() || null;

  // Server-side business rules that the client cannot bypass.
  if (settings.requireAddress && !residentialAddress) {
    return {
      ok: false,
      message: "Please correct the highlighted fields and try again.",
      fieldErrors: { residentialAddress: "Your residential address is required." },
    };
  }

  if (data.ageCategory === "child" && !settings.acceptsChildren) {
    return {
      ok: false,
      message: "Child registrations are currently closed. Please contact the church office.",
    };
  }

  if (data.isChildRegistration && !settings.requireGuardianConsent) {
    // Guardian consent is not required by policy, but the data is still collected.
  }

  // Idempotency: the same submission id is never stored twice.
  const admin = await createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("members")
    .select("id, reference_no")
    .eq("idempotency_key", data.submissionId)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      data: { referenceNo: existing.reference_no },
      message: "Your registration has already been received.",
    };
  }

  // Validate custom field values against their definitions.
  const customFields = await getActiveCustomFields();
  const publicFields = customFields.filter((field) => field.show_on_public_form);
  const customErrors = validateCustomValues(publicFields, data.customValues ?? {});
  if (Object.keys(customErrors).length > 0) {
    return {
      ok: false,
      message: "Please correct the highlighted fields and try again.",
      fieldErrors: customErrors,
    };
  }

  // "No Service Units Yet" clears every other selection.
  const serviceUnitIds = (data.serviceUnitIds ?? []).filter((id) => id !== "__none__");

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
      whatsappPhone,
      additionalPhones: (data.additionalPhones ?? []).filter((phone) => phone.trim().length > 0),
      email,
      residentialAddress,
      membershipDuration: data.membershipDuration,
      suggestions: settings.allowSuggestions ? suggestions : null,
      photoPublicId: data.photo?.publicId ?? null,
      photoFormat: data.photo?.format ?? null,
      photoWidth: data.photo?.width ?? null,
      photoHeight: data.photo?.height ?? null,
      photoBytes: data.photo?.bytes ?? null,
      serviceUnitIds,
      customValues: data.customValues ?? {},
      idempotencyKey: data.submissionId,
      consent: {
        noticeVersion: notice.version,
        isChildRegistration: data.isChildRegistration,
        guardianName,
        guardianRelationship,
        guardianPhone,
      },
      registrationSource: "public_form",
    });

    await logAuditEvent({
      action: AUDIT_ACTIONS.REGISTRATION_RECEIVED,
      entityType: "member",
      entityId: result.memberId,
      entityRef: result.referenceNo,
      summary: {
        source: "public_form",
        duplicateFlagged: result.duplicateFlagged,
        hasPhoto: Boolean(data.photo),
        userAgent: userAgent ? userAgent.slice(0, 200) : null,
      },
      ipAddress: ip,
    });

    revalidatePath("/dashboard/members");

    return {
      ok: true,
      data: { referenceNo: result.referenceNo },
      message: settings.successMessage,
    };
  } catch (error) {
    console.error("[registration] failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return {
      ok: false,
      message:
        "We could not save your registration. Please check your connection and try again, or contact the church office.",
    };
  }
}

/**
 * Reports a possible duplicate for a phone number the member typed.
 * Used to warn the member before submitting, without exposing any member
 * data — only a boolean count of matches is returned.
 */
export async function checkPossibleDuplicate(
  phone: string,
  email?: string | null
): Promise<ActionResult<{ possible: boolean }>> {
  const { ip } = await requestContext();
  const allowed = await checkRateLimit("duplicate-check", ip ?? "anonymous", 30);
  if (!allowed) {
    return { ok: false, message: "Please try again shortly." };
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { ok: false, message: "Please enter a phone number." };
  }

  const admin = await createAdminSupabaseClient();

  const { data: phoneMatches } = await admin
    .from("members")
    .select("id")
    .eq("status", "active")
    .or(
      `primary_phone_normalized.eq.${normalizedPhone},whatsapp_phone_normalized.eq.${normalizedPhone}`
    );

  let possible = (phoneMatches ?? []).length > 0;

  if (!possible && email) {
    const { data: emailMatches } = await admin
      .from("members")
      .select("id")
      .eq("status", "active")
      .eq("email_normalized", email.trim().toLowerCase());
    possible = (emailMatches ?? []).length > 0;
  }

  return { ok: true, data: { possible } };
}
