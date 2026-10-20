import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { applyMemberScope, resolveVisibleMemberIds } from "@/lib/members/scope";
import type {
  AgeCategory,
  AuthContext,
  Gender,
  MemberListItem,
  MemberRecord,
  MembershipDuration,
} from "@/lib/types";
import { normalizeEmail } from "@/lib/phone";

export interface MemberFilters {
  search?: string;
  ageCategory?: AgeCategory | "";
  gender?: Gender | "";
  titleId?: string;
  serviceUnitId?: string;
  membershipDuration?: MembershipDuration | "";
  hasPhoto?: "yes" | "no" | "";
  registeredFrom?: string;
  registeredTo?: string;
  status?: "active" | "deleted" | "all";
  sort?: string;
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface MemberListResult {
  items: MemberListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

const SORTABLE: Record<string, { column: string; fallback: string }> = {
  full_name: { column: "full_name", fallback: "full_name" },
  reference_no: { column: "reference_no", fallback: "reference_no" },
  primary_phone: { column: "primary_phone_normalized", fallback: "primary_phone_normalized" },
  age_category: { column: "age_category", fallback: "age_category" },
  gender: { column: "gender", fallback: "gender" },
  membership_duration: { column: "membership_duration", fallback: "membership_duration" },
  created_at: { column: "created_at", fallback: "created_at" },
};

/**
 * Lists members visible to the acting user, honouring the active search,
 * filters, sorting and pagination. All filtering happens on the server.
 */
export async function listMembers(
  context: AuthContext,
  filters: MemberFilters = {}
): Promise<MemberListResult> {
  const admin = await createAdminSupabaseClient();
  const visibleMemberIds = await resolveVisibleMemberIds(context);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));
  const status = filters.status ?? "active";

  let query = admin.from("members").select("*", { count: "exact" });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const search = filters.search?.trim();
  if (search) {
    // Escape the LIKE metacharacters so a user's `%` is not a wildcard.
    const escaped = search.replace(/[%_,()]/g, (match) => `\\${match}`);
    const pattern = `%${escaped}%`;
    query = query.or(
      `full_name.ilike.${pattern},primary_phone.ilike.${pattern},email.ilike.${pattern},reference_no.ilike.${pattern}`
    );
  }

  if (filters.ageCategory) query = query.eq("age_category", filters.ageCategory);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.titleId) query = query.eq("title_id", filters.titleId);
  if (filters.membershipDuration) {
    query = query.eq("membership_duration", filters.membershipDuration);
  }
  if (filters.hasPhoto === "yes") query = query.not("photo_public_id", "is", null);
  if (filters.hasPhoto === "no") query = query.is("photo_public_id", null);
  if (filters.registeredFrom) query = query.gte("created_at", filters.registeredFrom);
  if (filters.registeredTo) {
    const to = new Date(filters.registeredTo);
    to.setHours(23, 59, 59, 999);
    query = query.lte("created_at", to.toISOString());
  }

  if (filters.serviceUnitId) {
    const { data: memberIds } = await admin
      .from("member_service_units")
      .select("member_id")
      .eq("service_unit_id", filters.serviceUnitId);
    const ids = (memberIds ?? []).map((row) => row.member_id);
    if (ids.length === 0) {
      return { items: [], total: 0, page, pageSize, pageCount: 0 };
    }
    query = query.in("id", ids);
  }

  query = applyMemberScope(query, visibleMemberIds);

  const sortKey = filters.sort && SORTABLE[filters.sort] ? filters.sort : "created_at";
  const sortDef = SORTABLE[sortKey];
  const direction = filters.direction === "asc" ? "asc" : "desc";
  query = query.order(sortDef.column, { ascending: direction === "asc" });

  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list members: ${error.message}`);

  const rows = (data ?? []) as Record<string, unknown>[];
  const total = count ?? 0;

  // Attach service units and titles for the visible rows.
  const ids = rows.map((row) => String(row.id));
  const unitMap = new Map<string, { id: string; name: string }[]>();
  if (ids.length > 0) {
    const { data: assignments } = await admin
      .from("member_service_units")
      .select("member_id, service_units ( id, name )")
      .in("member_id", ids);
    for (const assignment of assignments ?? []) {
      const unit = assignment.service_units as unknown as { id: string; name: string } | null;
      if (!unit) continue;
      const list = unitMap.get(assignment.member_id) ?? [];
      list.push({ id: unit.id, name: unit.name });
      unitMap.set(assignment.member_id, list);
    }
  }

  const titleIds = Array.from(
    new Set(rows.map((row) => row.title_id).filter(Boolean).map((id) => String(id)))
  );
  const titleMap = new Map<string, string>();
  if (titleIds.length > 0) {
    const { data: titles } = await admin
      .from("titles")
      .select("id, name")
      .in("id", titleIds);
    for (const title of titles ?? []) titleMap.set(title.id, title.name);
  }

  // Custom field values for the visible rows.
  const customMap = new Map<string, Record<string, unknown>>();
  if (ids.length > 0) {
    const { data: customRows } = await admin
      .from("member_custom_values")
      .select("member_id, value, custom_fields ( field_key )")
      .in("member_id", ids);

    for (const customRow of customRows ?? []) {
      const field = customRow.custom_fields as unknown as { field_key: string } | null;
      if (!field) continue;
      const values = customMap.get(customRow.member_id) ?? {};
      values[field.field_key] = customRow.value;
      customMap.set(customRow.member_id, values);
    }
  }

  const items: MemberListItem[] = rows.map((row) => ({
    id: String(row.id),
    reference_no: String(row.reference_no),
    full_name: String(row.full_name),
    title_name: row.title_id ? titleMap.get(String(row.title_id)) ?? null : null,
    gender: row.gender as Gender,
    age_category: row.age_category as AgeCategory,
    primary_phone: String(row.primary_phone),
    whatsapp_same_as_primary: Boolean(row.whatsapp_same_as_primary),
    whatsapp_phone: (row.whatsapp_phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    membership_duration: row.membership_duration as MembershipDuration,
    photo_public_id: (row.photo_public_id as string | null) ?? null,
    created_at: String(row.created_at),
    service_units: unitMap.get(String(row.id)) ?? [],
    custom_values: customMap.get(String(row.id)) ?? {},
  }));

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Fetches a single member with all related data. */
export async function getMemberById(
  context: AuthContext,
  memberId: string
): Promise<MemberRecord | null> {
  const admin = await createAdminSupabaseClient();
  const visibleMemberIds = await resolveVisibleMemberIds(context);

  let query = admin.from("members").select("*").eq("id", memberId).limit(1);
  query = applyMemberScope(query, visibleMemberIds);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load member: ${error.message}`);
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return hydrateMember(admin, row);
}

/** Fetches several members by id, preserving scope restrictions. */
export async function getMembersByIds(
  context: AuthContext,
  memberIds: string[]
): Promise<MemberRecord[]> {
  if (memberIds.length === 0) return [];
  const admin = await createAdminSupabaseClient();
  const visibleMemberIds = await resolveVisibleMemberIds(context);

  let query = admin.from("members").select("*").in("id", memberIds);
  query = applyMemberScope(query, visibleMemberIds);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load members: ${error.message}`);

  const members: MemberRecord[] = [];
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    members.push(await hydrateMember(admin, row));
  }
  return members;
}

async function hydrateMember(
  admin: Awaited<ReturnType<typeof createAdminSupabaseClient>>,
  row: Record<string, unknown>
): Promise<MemberRecord> {
  const memberId = String(row.id);

  const { data: assignments } = await admin
    .from("member_service_units")
    .select("service_units ( id, name, slug )")
    .eq("member_id", memberId);

  const serviceUnits = (assignments ?? [])
    .map((assignment) => assignment.service_units as unknown as { id: string; name: string; slug: string } | null)
    .filter((unit): unit is { id: string; name: string; slug: string } => unit !== null);

  const { data: phones } = await admin
    .from("member_phones")
    .select("*")
    .eq("member_id", memberId)
    .order("is_primary", { ascending: false });

  const { data: customRows } = await admin
    .from("member_custom_values")
    .select("field_id, value, custom_fields ( field_key )")
    .eq("member_id", memberId);

  const customValues: Record<string, unknown> = {};
  for (const customRow of customRows ?? []) {
    const field = customRow.custom_fields as unknown as { field_key: string } | null;
    if (!field) continue;
    customValues[field.field_key] = customRow.value;
  }

  const { data: consents } = await admin
    .from("registration_consents")
    .select("*")
    .eq("member_id", memberId)
    .order("consented_at", { ascending: false })
    .limit(1);

  const consentRow = (consents ?? [])[0];

  let titleName: string | null = null;
  if (row.title_id) {
    const { data: title } = await admin
      .from("titles")
      .select("name")
      .eq("id", String(row.title_id))
      .maybeSingle();
    titleName = title?.name ?? null;
  }

  return {
    id: memberId,
    reference_no: String(row.reference_no),
    full_name: String(row.full_name),
    title_id: (row.title_id as string | null) ?? null,
    title_name: titleName,
    gender: row.gender as Gender,
    age_category: row.age_category as AgeCategory,
    birth_day: (row.birth_day as number | null) ?? null,
    birth_month: (row.birth_month as number | null) ?? null,
    primary_phone: String(row.primary_phone),
    primary_phone_normalized: String(row.primary_phone_normalized),
    whatsapp_same_as_primary: Boolean(row.whatsapp_same_as_primary),
    whatsapp_phone: (row.whatsapp_phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    residential_address: (row.residential_address as string | null) ?? null,
    membership_duration: row.membership_duration as MembershipDuration,
    suggestions: (row.suggestions as string | null) ?? null,
    photo_public_id: (row.photo_public_id as string | null) ?? null,
    photo_format: (row.photo_format as string | null) ?? null,
    photo_width: (row.photo_width as number | null) ?? null,
    photo_height: (row.photo_height as number | null) ?? null,
    photo_bytes: (row.photo_bytes as number | null) ?? null,
    status: row.status as "active" | "deleted",
    registration_source: row.registration_source as "public_form" | "admin",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    deleted_at: (row.deleted_at as string | null) ?? null,
    deletion_reason: (row.deletion_reason as string | null) ?? null,
    service_units: serviceUnits,
    phones: (phones ?? []) as MemberRecord["phones"],
    custom_values: customValues,
    consent: consentRow
      ? {
          notice_version: String(consentRow.notice_version),
          consented_at: String(consentRow.consented_at),
          status: String(consentRow.status),
          is_child_registration: Boolean(consentRow.is_child_registration),
          guardian_name: (consentRow.guardian_name as string | null) ?? null,
        }
      : null,
  };
}

/** Counts members matching a normalised phone number or email. */
export async function findPotentialDuplicateKeys(
  phoneNormalized: string,
  emailNormalized: string
): Promise<{ phoneMemberIds: string[]; emailMemberIds: string[] }> {
  const admin = await createAdminSupabaseClient();
  const phoneMemberIds: string[] = [];
  const emailMemberIds: string[] = [];

  if (phoneNormalized) {
    const { data } = await admin
      .from("members")
      .select("id")
      .eq("status", "active")
      .or(`primary_phone_normalized.eq.${phoneNormalized},whatsapp_phone_normalized.eq.${phoneNormalized}`);
    phoneMemberIds.push(...(data ?? []).map((row) => row.id));
  }

  if (emailNormalized) {
    const { data } = await admin
      .from("members")
      .select("id")
      .eq("status", "active")
      .eq("email_normalized", emailNormalized);
    emailMemberIds.push(...(data ?? []).map((row) => row.id));
  }

  return { phoneMemberIds, emailMemberIds };
}

/** Returns the distinct normalised contact keys of a member. */
export async function getMemberContactKeys(
  memberId: string
): Promise<{ phone: string; email: string }> {
  const admin = await createAdminSupabaseClient();
  const { data } = await admin
    .from("members")
    .select("primary_phone_normalized, email_normalized, whatsapp_phone_normalized")
    .eq("id", memberId)
    .maybeSingle();

  return {
    phone: data?.primary_phone_normalized ?? "",
    email: data?.email_normalized ?? normalizeEmail(data?.email_normalized),
  };
}
