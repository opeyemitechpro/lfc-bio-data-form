import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { resolveVisibleMemberIds } from "@/lib/members/scope";
import type { AuthContext } from "@/lib/types";

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  byAgeCategory: { key: string; label: string; count: number }[];
  byGender: { key: string; label: string; count: number }[];
  byServiceUnit: { key: string; label: string; count: number }[];
  byMembershipDuration: { key: string; label: string; count: number }[];
  withPhoto: number;
  withoutPhoto: number;
  pendingDuplicates: number;
  recentMembers: {
    id: string;
    full_name: string;
    reference_no: string;
    created_at: string;
    photo_public_id: string | null;
  }[];
  totalTrend: { month: string; count: number }[];
}

/**
 * Aggregates dashboard statistics.
 *
 * Every count respects the acting user's access scope, so aggregate
 * figures can never reveal the existence of records outside that scope.
 */
export async function getDashboardStats(
  context: AuthContext
): Promise<DashboardStats> {
  const admin = await createAdminSupabaseClient();
  const visibleMemberIds = await resolveVisibleMemberIds(context);

  /**
   * Applies the access scope to a member query and returns the result.
   *
   * The query builder is passed through a loosely typed helper on purpose:
   * keeping the Supabase generics intact here makes TypeScript exceed its
   * instantiation depth on the deeply nested query chains used below.
   */
  const scoped = async <T>(query: unknown): Promise<T> => {
    let builder = query as {
      in: (column: string, values: readonly string[]) => unknown;
    };

    if (visibleMemberIds !== null) {
      const ids =
        visibleMemberIds.length > 0
          ? visibleMemberIds
          : ["00000000-0000-0000-0000-000000000000"];
      builder = builder.in("id", ids) as typeof builder;
    }

    return (await builder) as T;
  };

  const { count: totalMembers } = await scoped<{ count: number | null }>(
    admin.from("members").select("id", { count: "exact", head: true })
  );

  const { count: activeMembers } = await scoped<{ count: number | null }>(
    admin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
  );

  // Age category breakdown.
  const ageRows = await scoped<{ data: { age_category: string }[] | null }>(
    admin.from("members").select("age_category").eq("status", "active")
  );
  const ageCounts = new Map<string, number>();
  for (const row of ageRows.data ?? []) {
    const key = String(row.age_category);
    ageCounts.set(key, (ageCounts.get(key) ?? 0) + 1);
  }

  // Gender breakdown.
  const genderRows = await scoped<{ data: { gender: string }[] | null }>(
    admin.from("members").select("gender").eq("status", "active")
  );
  const genderCounts = new Map<string, number>();
  for (const row of genderRows.data ?? []) {
    const key = String(row.gender);
    genderCounts.set(key, (genderCounts.get(key) ?? 0) + 1);
  }

  // Membership duration breakdown.
  const durationRows = await scoped<{ data: { membership_duration: string }[] | null }>(
    admin.from("members").select("membership_duration").eq("status", "active")
  );
  const durationCounts = new Map<string, number>();
  for (const row of durationRows.data ?? []) {
    const key = String(row.membership_duration);
    durationCounts.set(key, (durationCounts.get(key) ?? 0) + 1);
  }

  // Photograph availability.
  const withPhotoRows = await scoped<{ data: { id: string }[] | null }>(
    admin.from("members").select("id").eq("status", "active").not("photo_public_id", "is", null)
  );
  const withoutPhotoRows = await scoped<{ data: { id: string }[] | null }>(
    admin.from("members").select("id").eq("status", "active").is("photo_public_id", null)
  );
  const withPhoto = withPhotoRows.data?.length ?? 0;
  const withoutPhoto = withoutPhotoRows.data?.length ?? 0;

  // Service unit breakdown — only units that appear in visible members.
  const unitRows = await scoped<{
    data: { service_unit_id: string; service_units: unknown }[] | null;
  }>(
    admin
      .from("member_service_units")
      .select("service_unit_id, service_units ( id, name )")
  );

  const unitCounts = new Map<string, { name: string; count: number }>();
  for (const row of unitRows.data ?? []) {
    const unit = row.service_units as { id: string; name: string } | null;
    if (!unit) continue;
    const entry = unitCounts.get(row.service_unit_id) ?? { name: unit.name, count: 0 };
    entry.count += 1;
    unitCounts.set(row.service_unit_id, entry);
  }

  // Recent registrations.
  const recent = await scoped<{
    data: DashboardStats["recentMembers"] | null;
  }>(
    admin
      .from("members")
      .select("id, full_name, reference_no, created_at, photo_public_id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8)
  );

  // Pending duplicate alerts (only those involving visible members).
  const { data: pendingDuplicates } = await admin
    .from("duplicate_flags")
    .select("member_a_id, member_b_id")
    .eq("status", "pending");

  let pendingVisible = 0;
  if (pendingDuplicates && visibleMemberIds !== null) {
    const visible = new Set(visibleMemberIds);
    pendingVisible = pendingDuplicates.filter(
      (row) => visible.has(row.member_a_id) || visible.has(row.member_b_id)
    ).length;
  } else {
    pendingVisible = pendingDuplicates?.length ?? 0;
  }

  // Six-month registration trend.
  const trendMap = new Map<string, number>();
  const trendRows = await scoped<{ data: { created_at: string }[] | null }>(
    admin
      .from("members")
      .select("created_at")
      .eq("status", "active")
      .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
  );
  for (const row of trendRows.data ?? []) {
    const month = String(row.created_at).slice(0, 7);
    trendMap.set(month, (trendMap.get(month) ?? 0) + 1);
  }

  const trend: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    trend.push({
      month: new Intl.DateTimeFormat("en-NG", { month: "short", year: "2-digit" }).format(date),
      count: trendMap.get(key) ?? 0,
    });
  }

  return {
    totalMembers: totalMembers ?? 0,
    activeMembers: activeMembers ?? 0,
    byAgeCategory: [
      { key: "child", label: "Children (1–10)", count: ageCounts.get("child") ?? 0 },
      { key: "youth", label: "Youth (11–20)", count: ageCounts.get("youth") ?? 0 },
      { key: "adult", label: "Adults (21+)", count: ageCounts.get("adult") ?? 0 },
    ],
    byGender: [
      { key: "male", label: "Male", count: genderCounts.get("male") ?? 0 },
      { key: "female", label: "Female", count: genderCounts.get("female") ?? 0 },
    ],
    byServiceUnit: [...unitCounts.entries()]
      .map(([key, value]) => ({ key, label: value.name, count: value.count }))
      .sort((a, b) => b.count - a.count),
    byMembershipDuration: [
      { key: "lt_1y", label: "Less than 1 year", count: durationCounts.get("lt_1y") ?? 0 },
      { key: "y1_3", label: "1–3 years", count: durationCounts.get("y1_3") ?? 0 },
      { key: "y4_6", label: "4–6 years", count: durationCounts.get("y4_6") ?? 0 },
      { key: "y7_10", label: "7–10 years", count: durationCounts.get("y7_10") ?? 0 },
      { key: "gt_10y", label: "Over 10 years", count: durationCounts.get("gt_10y") ?? 0 },
    ],
    withPhoto,
    withoutPhoto,
    pendingDuplicates: pendingVisible,
    recentMembers: recent.data ?? [],
    totalTrend: trend,
  };
}
