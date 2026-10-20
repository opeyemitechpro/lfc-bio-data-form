import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listMembers, type MemberFilters } from "@/lib/members/queries";
import { listServiceUnits, listTitles } from "@/lib/lookups";
import { MemberTablePrint } from "@/components/members/member-table-print";
import { MemberCardPrint } from "@/components/members/member-card-print";
import { getMembersByIds } from "@/lib/members/queries";
import { getCustomFields } from "@/lib/members/custom-fields";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print members",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function PrintMembersPage({ searchParams }: PageProps) {
  const context = await requireAdmin();
  const params = await searchParams;

  const scope = first(params.scope) || "directory";
  const canPrintTable =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.PRINT_TABLE);
  const canPrintCards =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.PRINT_BULK_CARDS);
  const canViewPhotos =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_VIEW_PHOTO);

  const filters: MemberFilters = {
    search: first(params.q) || undefined,
    ageCategory: (first(params.age) as MemberFilters["ageCategory"]) || "",
    gender: (first(params.gender) as MemberFilters["gender"]) || "",
    titleId: first(params.title) || undefined,
    serviceUnitId: first(params.unit) || undefined,
    membershipDuration:
      (first(params.duration) as MemberFilters["membershipDuration"]) || "",
    hasPhoto: (first(params.photo) as "yes" | "no" | "") || "",
    registeredFrom: first(params.from) || undefined,
    registeredTo: first(params.to) || undefined,
    status: (first(params.status) as MemberFilters["status"]) || "active",
    sort: first(params.sort) || undefined,
    direction: (first(params.direction) as "asc" | "desc") || "asc",
    page: 1,
    pageSize: 100,
  };

  // Collect the members to print.
  let memberIds: string[] = [];

  if (scope === "selection") {
    const ids = first(params.ids);
    if (ids) {
      memberIds = ids
        .split(",")
        .map((id) => id.trim())
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    }
  }

  if (memberIds.length === 0) {
    let page = 1;
    let total = 0;
    do {
      const result = await listMembers(context, {
        ...filters,
        page,
        pageSize: 100,
      });
      memberIds.push(...result.items.map((row) => row.id));
      total = result.total;
      page += 1;
    } while (memberIds.length < total && page <= 200);
  }

  const [members, titles, serviceUnits, customFields] = await Promise.all([
    getMembersByIds(context, memberIds),
    listTitles({ activeOnly: false }),
    listServiceUnits({ activeOnly: false }),
    getCustomFields({ activeOnly: false }),
  ]);

  const cardFields = customFields.filter(
    (field) => field.show_on_card && field.is_active
  );
  const tableFields = customFields.filter(
    (field) => field.show_in_table && field.is_active
  );

  if (scope === "cards") {
    if (!canPrintCards) {
      return (
        <PermissionNotice message="You do not have permission to print member cards." />
      );
    }

    return (
      <MemberCardPrint
        members={members}
        customFields={cardFields}
        canViewPhotos={canViewPhotos}
        perPage={4}
      />
    );
  }

  if (!canPrintTable) {
    return (
      <PermissionNotice message="You do not have permission to print member tables." />
    );
  }

  return (
    <MemberTablePrint
      members={members}
      customFields={tableFields}
      canViewPhotos={canViewPhotos}
      titles={titles}
      serviceUnits={serviceUnits}
    />
  );
}

function PermissionNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-bold">Permission required</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
    </div>
  );
}
