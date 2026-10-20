import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { applyMemberScope, resolveVisibleMemberIds } from "@/lib/members/scope";
import type { AuthContext } from "@/lib/types";
import {
  AGE_CATEGORY_LABELS,
  GENDER_LABELS,
  MEMBERSHIP_DURATION_LABELS,
} from "@/lib/types";
import { normalizeEmail, normalizePhone } from "@/lib/phone";
import type { CustomFieldDefinition } from "@/lib/types";

export interface ExportRow {
  reference_no: string;
  full_name: string;
  title: string;
  gender: string;
  age_category: string;
  birth_day: string;
  birth_month: string;
  primary_phone: string;
  whatsapp_phone: string;
  additional_phones: string;
  email: string;
  residential_address: string;
  membership_duration: string;
  service_units: string;
  registration_source: string;
  registered_at: string;
  has_photo: string;
  [key: string]: string;
}

export interface ExportOptions {
  /** Restrict the export to these member IDs (bulk selection). */
  memberIds?: string[];
  /** Custom fields to include, already filtered by visibility. */
  customFields?: CustomFieldDefinition[];
  /** Include the photograph URL column. */
  includePhotoUrl?: boolean;
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Collects the member rows for an export.
 *
 * The data is fetched on the server with the service-role client, after
 * the access scope and the export permission have been verified. The
 * browser never filters the result set.
 */
export async function collectExportRows(
  context: AuthContext,
  options: ExportOptions = {}
): Promise<ExportRow[]> {
  const admin = await createAdminSupabaseClient();
  const visibleMemberIds = await resolveVisibleMemberIds(context);

  let query = admin
    .from("members")
    .select("*")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (options.memberIds && options.memberIds.length > 0) {
    query = query.in("id", options.memberIds);
  }

  query = applyMemberScope(query, visibleMemberIds);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to collect export rows: ${error.message}`);

  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const memberIds = rows.map((row) => String(row.id));

  // Service units.
  const { data: assignments } = await admin
    .from("member_service_units")
    .select("member_id, service_units ( name )")
    .in("member_id", memberIds);

  const unitMap = new Map<string, string[]>();
  for (const assignment of assignments ?? []) {
    const unit = assignment.service_units as unknown as { name: string } | null;
    if (!unit) continue;
    const list = unitMap.get(assignment.member_id) ?? [];
    list.push(unit.name);
    unitMap.set(assignment.member_id, list);
  }

  // Titles.
  const titleIds = Array.from(
    new Set(rows.map((row) => row.title_id).filter(Boolean).map(String))
  );
  const titleMap = new Map<string, string>();
  if (titleIds.length > 0) {
    const { data: titles } = await admin
      .from("titles")
      .select("id, name")
      .in("id", titleIds);
    for (const title of titles ?? []) titleMap.set(title.id, title.name);
  }

  // Additional phones.
  const { data: extraPhones } = await admin
    .from("member_phones")
    .select("member_id, phone, label")
    .in("member_id", memberIds)
    .eq("label", "other");

  const extraPhoneMap = new Map<string, string[]>();
  for (const phone of extraPhones ?? []) {
    const list = extraPhoneMap.get(phone.member_id) ?? [];
    list.push(phone.phone);
    extraPhoneMap.set(phone.member_id, list);
  }

  // Custom values.
  const customFields = options.customFields ?? [];
  const customMap = new Map<string, Record<string, unknown>>();
  if (customFields.length > 0) {
    const fieldIds = customFields.map((field) => field.id);
    const { data: customRows } = await admin
      .from("member_custom_values")
      .select("member_id, field_id, value")
      .in("member_id", memberIds)
      .in("field_id", fieldIds);

    for (const customRow of customRows ?? []) {
      const values = customMap.get(customRow.member_id) ?? {};
      values[customRow.field_id] = customRow.value;
      customMap.set(customRow.member_id, values);
    }
  }

  return rows.map((row) => {
    const memberId = String(row.id);
    const customValues = customMap.get(memberId) ?? {};

    const exportRow: ExportRow = {
      reference_no: String(row.reference_no),
      full_name: String(row.full_name),
      title: row.title_id ? titleMap.get(String(row.title_id)) ?? "" : "",
      gender: GENDER_LABELS[row.gender as keyof typeof GENDER_LABELS] ?? String(row.gender),
      age_category:
        AGE_CATEGORY_LABELS[row.age_category as keyof typeof AGE_CATEGORY_LABELS] ??
        String(row.age_category),
      birth_day: row.birth_day ? String(row.birth_day) : "",
      birth_month: row.birth_month
        ? MONTH_NAMES[Number(row.birth_month)] ?? String(row.birth_month)
        : "",
      primary_phone: String(row.primary_phone),
      whatsapp_phone: row.whatsapp_same_as_primary
        ? String(row.primary_phone)
        : String(row.whatsapp_phone ?? ""),
      additional_phones: (extraPhoneMap.get(memberId) ?? []).join("; "),
      email: String(row.email ?? ""),
      residential_address: String(row.residential_address ?? ""),
      membership_duration:
        MEMBERSHIP_DURATION_LABELS[
          row.membership_duration as keyof typeof MEMBERSHIP_DURATION_LABELS
        ] ?? String(row.membership_duration),
      service_units: (unitMap.get(memberId) ?? []).join("; "),
      registration_source: String(row.registration_source),
      registered_at: String(row.created_at),
      has_photo: row.photo_public_id ? "Yes" : "No",
    };

    for (const field of customFields) {
      const value = customValues[field.id];
      exportRow[field.field_key] = formatCustomValue(value);
    }

    if (options.includePhotoUrl && row.photo_public_id) {
      exportRow.photo_url = String(row.photo_public_id);
    }

    return exportRow;
  });
}

/** Renders a custom-field value as a plain string. */
function formatCustomValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Neutralises spreadsheet formula injection.
 *
 * A cell value that begins with `=`, `+`, `-` or `@` is treated as a
 * formula by Excel and Sheets. Prefixing it with an apostrophe keeps the
 * text as text.
 */
export function sanitizeSpreadsheetValue(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);

  // Strip control characters that can be used to hide the leading character.
  text = text.replace(/[\u0000-\u001F\u007F]/g, "");

  // A cell value that begins with `=`, `+`, `-` or `@` is treated as a
  // formula by Excel and Sheets. Inserting an apostrophe before the
  // trigger character keeps the text as text. The apostrophe is placed
  // before any leading whitespace so the trigger is neutralised wherever
  // it occurs.
  const match = /^(\s*)([=+\-@])/.exec(text);
  if (match) {
    text = `${match[1]}'${match[2]}${text.slice(match[0].length)}`;
  }

  return text;
}

/** Column headings used by every export format. */
export function buildExportHeadings(
  customFields: CustomFieldDefinition[],
  includePhotoUrl: boolean
): string[] {
  const headings = [
    "Reference No",
    "Full Name",
    "Title",
    "Gender",
    "Age Category",
    "Birth Day",
    "Birth Month",
    "Primary Phone",
    "WhatsApp Phone",
    "Additional Phones",
    "Email",
    "Residential Address",
    "Membership Duration",
    "Service Units",
    "Registration Source",
    "Registered At",
    "Has Photograph",
  ];

  for (const field of customFields) {
    headings.push(field.label);
  }

  if (includePhotoUrl) headings.push("Photograph ID");

  return headings;
}

/** Maps an export row onto the heading order. */
export function rowToCells(
  row: ExportRow,
  customFields: CustomFieldDefinition[],
  includePhotoUrl: boolean
): string[] {
  const cells = [
    row.reference_no,
    row.full_name,
    row.title,
    row.gender,
    row.age_category,
    row.birth_day,
    row.birth_month,
    row.primary_phone,
    row.whatsapp_phone,
    row.additional_phones,
    row.email,
    row.residential_address,
    row.membership_duration,
    row.service_units,
    row.registration_source,
    row.registered_at,
    row.has_photo,
  ];

  for (const field of customFields) {
    cells.push(row[field.field_key] ?? "");
  }

  if (includePhotoUrl) cells.push(row.photo_url ?? "");

  return cells.map(sanitizeSpreadsheetValue);
}

/** Generates a report filename that includes the report type and date. */
export function buildExportFilename(reportType: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeType = reportType.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `lfc-laderin-${safeType}-${date}.${extension}`;
}

export { normalizeEmail, normalizePhone };
