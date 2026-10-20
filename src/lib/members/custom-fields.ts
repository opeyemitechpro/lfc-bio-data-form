import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { readOptions, readValidation } from "@/lib/custom-fields";
import type { CustomFieldDefinition } from "@/lib/types";

/** Reads custom field definitions from the database and normalises them. */
export async function getCustomFields(options?: {
  activeOnly?: boolean;
  publicOnly?: boolean;
}): Promise<CustomFieldDefinition[]> {
  const admin = await createAdminSupabaseClient();

  let query = admin.from("custom_fields").select("*").order("sort_order", { ascending: true });

  if (options?.activeOnly) query = query.eq("is_active", true);
  if (options?.publicOnly) {
    query = query.eq("is_active", true).eq("show_on_public_form", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load custom fields: ${error.message}`);

  return (data ?? []).map((row) => normaliseField(row as Record<string, unknown>));
}

export async function getActiveCustomFields(): Promise<CustomFieldDefinition[]> {
  return getCustomFields({ activeOnly: true });
}

export async function getPublicCustomFields(): Promise<CustomFieldDefinition[]> {
  return getCustomFields({ publicOnly: true });
}

/** Normalises a raw database row into a `CustomFieldDefinition`. */
export function normaliseField(row: Record<string, unknown>): CustomFieldDefinition {
  return {
    id: String(row.id),
    field_key: String(row.field_key),
    label: String(row.label),
    field_type: row.field_type as CustomFieldDefinition["field_type"],
    help_text: (row.help_text as string | null) ?? null,
    is_required: Boolean(row.is_required),
    default_value: row.default_value ?? null,
    options: readOptions(row.options),
    validation: readValidation(row.validation),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    show_on_public_form: Boolean(row.show_on_public_form),
    show_on_profile: Boolean(row.show_on_profile),
    show_on_card: Boolean(row.show_on_card),
    show_in_table: Boolean(row.show_in_table),
    show_in_export: Boolean(row.show_in_export),
    is_sensitive: Boolean(row.is_sensitive),
    required_permission: (row.required_permission as string | null) ?? null,
  };
}
