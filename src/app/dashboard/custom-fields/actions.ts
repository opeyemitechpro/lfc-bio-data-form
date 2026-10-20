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
import {
  customFieldDefinitionSchema,
  readOptions,
  type CustomFieldDefinitionInput,
} from "@/lib/custom-fields";
import { slugify } from "@/lib/utils";

export interface CustomFieldActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const fieldSchema = customFieldDefinitionSchema.extend({
  id: z.string().uuid().optional(),
});

/** Creates or updates a custom field definition. */
export async function saveCustomFieldAction(
  payload: unknown
): Promise<CustomFieldActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.CUSTOM_FIELDS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  const parsed = fieldSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const { id, ...data } = parsed.data;
  const admin = await createAdminSupabaseClient();

  // The field key is stored as a plain identifier — never as executable
  // content — and must be unique.
  const fieldKey = slugify(data.field_key).replace(/-/g, "_");
  if (!/^[a-z][a-z0-9_]*$/.test(fieldKey)) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        field_key:
          "Use lowercase letters, numbers and underscores, starting with a letter.",
      },
    };
  }

  const { data: keyClash } = await admin
    .from("custom_fields")
    .select("id")
    .eq("field_key", fieldKey)
    .neq("id", id ?? "")
    .maybeSingle();

  if (keyClash) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: { field_key: "A field with this key already exists." },
    };
  }

  const record = {
    field_key: fieldKey,
    label: data.label,
    field_type: data.field_type,
    help_text: data.help_text?.trim() || null,
    is_required: data.is_required,
    default_value: data.default_value ?? null,
    options: data.options.map((option) => ({
      label: option.label,
      value: option.value,
    })),
    validation: data.validation,
    sort_order: data.sort_order,
    is_active: data.is_active,
    show_on_public_form: data.show_on_public_form,
    show_on_profile: data.show_on_profile,
    show_on_card: data.show_on_card,
    show_in_table: data.show_in_table,
    show_in_export: data.show_in_export,
    is_sensitive: data.is_sensitive,
    required_permission: data.required_permission?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await admin
      .from("custom_fields")
      .update(record)
      .eq("id", id);

    if (error) {
      return { ok: false, message: "The field could not be updated." };
    }

    await logAdminAction(context, AUDIT_ACTIONS.CUSTOM_FIELD_UPDATED, {
      entityType: "custom_field",
      entityId: id,
      summary: {
        field_key: fieldKey,
        is_active: data.is_active,
        show_on_public_form: data.show_on_public_form,
      },
    });
  } else {
    const { data: created, error } = await admin
      .from("custom_fields")
      .insert({ ...record, created_at: new Date().toISOString() })
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: "The field could not be created." };
    }

    await logAdminAction(context, AUDIT_ACTIONS.CUSTOM_FIELD_CREATED, {
      entityType: "custom_field",
      entityId: created.id,
      summary: { field_key: fieldKey, field_type: data.field_type },
    });
  }

  revalidatePath("/dashboard/custom-fields");
  revalidatePath("/register");
  return { ok: true, message: "The custom field was saved." };
}

/** Deactivates a custom field, preserving the values already stored. */
export async function toggleCustomFieldAction(
  id: string,
  isActive: boolean
): Promise<CustomFieldActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.CUSTOM_FIELDS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  const admin = await createAdminSupabaseClient();
  const { error } = await admin
    .from("custom_fields")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, message: "The field could not be updated." };
  }

  await logAdminAction(context, AUDIT_ACTIONS.CUSTOM_FIELD_UPDATED, {
    entityType: "custom_field",
    entityId: id,
    summary: { action: isActive ? "activated" : "deactivated", valuesPreserved: true },
  });

  revalidatePath("/dashboard/custom-fields");
  revalidatePath("/register");
  return {
    ok: true,
    message: isActive
      ? "The field is active again."
      : "The field was deactivated. Existing values were preserved.",
  };
}

/** Moves a custom field up or down in the display order. */
export async function reorderCustomFieldAction(
  id: string,
  direction: "up" | "down"
): Promise<CustomFieldActionResult> {
  await requirePermission(PERMISSIONS.CUSTOM_FIELDS_MANAGE);

  const admin = await createAdminSupabaseClient();
  const { data: fields } = await admin
    .from("custom_fields")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  const list = fields ?? [];
  const index = list.findIndex((field) => field.id === id);
  if (index === -1) {
    return { ok: false, message: "That field could not be found." };
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.length) {
    return { ok: true, message: "The order was already at the end." };
  }

  const current = list[index];
  const target = list[targetIndex];

  await admin
    .from("custom_fields")
    .update({ sort_order: target.sort_order })
    .eq("id", current.id);
  await admin
    .from("custom_fields")
    .update({ sort_order: current.sort_order })
    .eq("id", target.id);

  revalidatePath("/dashboard/custom-fields");
  revalidatePath("/register");
  return { ok: true, message: "The order was updated." };
}

export { readOptions };
export type { CustomFieldDefinitionInput };
