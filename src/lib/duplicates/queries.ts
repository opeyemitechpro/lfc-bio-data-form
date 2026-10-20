import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { resolveVisibleMemberIds } from "@/lib/members/scope";
import type { AuthContext, DuplicateFlag, MemberRecord } from "@/lib/types";
import { getMembersByIds } from "@/lib/members/queries";

/**
 * Lists the duplicate flags that the acting user is allowed to review.
 *
 * A flag is visible when at least one of the two member records is inside
 * the user's access scope.
 */
export async function listDuplicateFlags(
  context: AuthContext,
  status: "pending" | "confirmed" | "distinct" | "resolved" | "all" = "pending",
  page = 1,
  pageSize = 20
): Promise<{ flags: DuplicateFlag[]; total: number }> {
  const admin = await createAdminSupabaseClient();
  const visibleMemberIds = await resolveVisibleMemberIds(context);

  let query = admin
    .from("duplicate_flags")
    .select("*", { count: "exact" })
    .order("match_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to load duplicate flags: ${error.message}`);

  let flags = (data ?? []) as DuplicateFlag[];

  // Restrict to the flags involving members the user can see.
  if (visibleMemberIds !== null) {
    const visible = new Set(visibleMemberIds);
    flags = flags.filter(
      (flag) => visible.has(flag.member_a_id) || visible.has(flag.member_b_id)
    );
  }

  const total = visibleMemberIds === null ? (count ?? flags.length) : flags.length;

  // Paginate in memory after the scope filter.
  const offset = (page - 1) * pageSize;
  const paged = flags.slice(offset, offset + pageSize);

  // Attach both member records.
  const memberIds = Array.from(
    new Set(paged.flatMap((flag) => [flag.member_a_id, flag.member_b_id]))
  );
  const members = await getMembersByIds(context, memberIds);
  const memberMap = new Map<string, MemberRecord>(
    members.map((member) => [member.id, member])
  );

  return {
    flags: paged.map((flag) => ({
      ...flag,
      member_a: memberMap.get(flag.member_a_id),
      member_b: memberMap.get(flag.member_b_id),
    })),
    total,
  };
}
