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
import { slugify } from "@/lib/utils";

export interface LookupActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const serviceUnitSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a name.").max(80),
  description: z.string().trim().max(300).optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(10000),
});

/** Creates, updates, deactivates or reorders a service unit. */
export async function saveServiceUnitAction(
  payload: unknown
): Promise<LookupActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.SERVICE_UNITS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = serviceUnitSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;
  const admin = await createAdminSupabaseClient();

  // A name change must not break the slug that members are matched on.
  let slug = slugify(data.name);
  const { data: slugClash } = await admin
    .from("service_units")
    .select("id")
    .eq("slug", slug)
    .neq("id", data.id ?? "")
    .maybeSingle();

  if (slugClash) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  if (data.id) {
    const { error } = await admin
      .from("service_units")
      .update({
        name: data.name,
        slug,
        description: data.description?.trim() || null,
        is_active: data.is_active,
        sort_order: data.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) {
      return { ok: false, message: "The service unit could not be updated." };
    }

    await logAdminAction(context, AUDIT_ACTIONS.SERVICE_UNIT_CHANGED, {
      entityType: "service_unit",
      entityId: data.id,
      summary: { action: "updated", name: data.name, is_active: data.is_active },
    });
  } else {
    const { data: created, error } = await admin
      .from("service_units")
      .insert({
        name: data.name,
        slug,
        description: data.description?.trim() || null,
        is_active: data.is_active,
        sort_order: data.sort_order,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: "The service unit could not be created." };
    }

    await logAdminAction(context, AUDIT_ACTIONS.SERVICE_UNIT_CHANGED, {
      entityType: "service_unit",
      entityId: created.id,
      summary: { action: "created", name: data.name },
    });
  }

  revalidatePath("/dashboard/service-units");
  revalidatePath("/register");
  return { ok: true, message: "The service unit was saved." };
}

const titleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a name.").max(80),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(10000),
});

/** Creates, updates, deactivates or reorders a title option. */
export async function saveTitleAction(
  payload: unknown
): Promise<LookupActionResult> {
  let context;
  try {
    context = await requirePermission(PERMISSIONS.TITLES_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = titleSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;
  const admin = await createAdminSupabaseClient();

  let slug = slugify(data.name);
  const { data: slugClash } = await admin
    .from("titles")
    .select("id")
    .eq("slug", slug)
    .neq("id", data.id ?? "")
    .maybeSingle();

  if (slugClash) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  if (data.id) {
    const { error } = await admin
      .from("titles")
      .update({
        name: data.name,
        slug,
        is_active: data.is_active,
        sort_order: data.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) {
      return { ok: false, message: "The title could not be updated." };
    }

    await logAdminAction(context, AUDIT_ACTIONS.TITLE_CHANGED, {
      entityType: "title",
      entityId: data.id,
      summary: { action: "updated", name: data.name, is_active: data.is_active },
    });
  } else {
    const { data: created, error } = await admin
      .from("titles")
      .insert({
        name: data.name,
        slug,
        is_active: data.is_active,
        sort_order: data.sort_order,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: "The title could not be created." };
    }

    await logAdminAction(context, AUDIT_ACTIONS.TITLE_CHANGED, {
      entityType: "title",
      entityId: created.id,
      summary: { action: "created", name: data.name },
    });
  }

  revalidatePath("/dashboard/titles");
  revalidatePath("/register");
  return { ok: true, message: "The title was saved." };
}

/** Moves an item up or down in the display order. */
export async function reorderLookupAction(
  kind: "service_units" | "titles",
  id: string,
  direction: "up" | "down"
): Promise<LookupActionResult> {
  let context;
  try {
    context = await requirePermission(
      kind === "service_units"
        ? PERMISSIONS.SERVICE_UNITS_MANAGE
        : PERMISSIONS.TITLES_MANAGE
    );
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const admin = await createAdminSupabaseClient();
  const { data: items, error: listError } = await admin
    .from(kind)
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (listError) {
    return { ok: false, message: "The order could not be changed." };
  }

  const list = items ?? [];
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) {
    return { ok: false, message: "That item could not be found." };
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.length) {
    return { ok: true, message: "The order was already at the end." };
  }

  const current = list[index];
  const target = list[targetIndex];

  await admin
    .from(kind)
    .update({ sort_order: target.sort_order })
    .eq("id", current.id);
  await admin
    .from(kind)
    .update({ sort_order: current.sort_order })
    .eq("id", target.id);

  await logAdminAction(context, AUDIT_ACTIONS.SERVICE_UNIT_CHANGED, {
    entityType: kind,
    entityId: id,
    summary: { action: "reordered", direction },
  });

  revalidatePath(kind === "service_units" ? "/dashboard/service-units" : "/dashboard/titles");
  revalidatePath("/register");
  return { ok: true, message: "The order was updated." };
}
