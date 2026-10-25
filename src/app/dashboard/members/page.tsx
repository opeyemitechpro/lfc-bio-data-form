import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MemberFilters } from "@/components/members/member-filters";
import {
  MemberCardList,
  MemberTable,
} from "@/components/members/member-table";
import { Pagination } from "@/components/members/pagination";
import { ViewToggle } from "@/components/members/view-toggle";
import { ExportMenu } from "@/components/members/export-menu";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listMembers, type MemberFilters as FilterOptions } from "@/lib/members/queries";
import { listServiceUnits, listTitles } from "@/lib/lookups";
import type { AgeCategory, Gender, MembershipDuration } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Member directory",
};


interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function MembersPage({ searchParams }: PageProps) {
  const context = await requireAdmin();
  const params = await searchParams;

  const canViewPhotos =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_VIEW_PHOTO);
  const canEdit =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_EDIT);
  const canDelete =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_DELETE);
  const canCreate =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_CREATE);
  const canPrint =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.PRINT_TABLE);
  const canPrintBulk =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.PRINT_BULK_CARDS);
  const canExportCsv =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.EXPORT_CSV);
  const canExportExcel =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.EXPORT_EXCEL);
  const canExportPdf =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.EXPORT_PDF);

  const filters: FilterOptions = {
    search: first(params.q) || undefined,
    ageCategory: (first(params.age) as AgeCategory) || "",
    gender: (first(params.gender) as Gender) || "",
    titleId: first(params.title) || undefined,
    serviceUnitId: first(params.unit) || undefined,
    membershipDuration: (first(params.duration) as MembershipDuration) || "",
    hasPhoto: (first(params.photo) as "yes" | "no" | "") || "",
    registeredFrom: first(params.from) || undefined,
    registeredTo: first(params.to) || undefined,
    status: (first(params.status) as "active" | "deleted" | "all") || "active",
    sort: first(params.sort) || undefined,
    direction: (first(params.direction) as "asc" | "desc") || "desc",
    page: Number.parseInt(first(params.page) || "1", 10) || 1,
    pageSize: 20,
  };

  const [result, titles, serviceUnits] = await Promise.all([
    listMembers(context, filters),
    listTitles({ activeOnly: false }),
    listServiceUnits({ activeOnly: false }),
  ]);

  const view = first(params.view) === "cards" ? "cards" : "table";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Member directory
          </h1>
          <p className="mt-1 text-muted-foreground">
            {result.total.toLocaleString("en-NG")}{" "}
            {result.total === 1 ? "member" : "members"} match the current filters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle />
          <ExportMenu
            canExportCsv={canExportCsv}
            canExportExcel={canExportExcel}
            canExportPdf={canExportPdf}
            canPrint={canPrint}
            canPrintBulk={canPrintBulk}
          />
          {canCreate ? (
            <Button asChild>
              <Link href="/dashboard/members/new">
                <UserPlus aria-hidden="true" />
                Register member
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Suspense fallback={<div className="h-40" />}>
        <MemberFilters titles={titles} serviceUnits={serviceUnits} />
      </Suspense>

      {result.items.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
              <Users className="size-7 text-muted-foreground" aria-hidden="true" />
            </div>
            <CardTitle className="mt-3">No members found</CardTitle>
            <CardDescription>
              {filters.search || filters.ageCategory || filters.gender
                ? "No members match the current search and filters. Try clearing them."
                : "No member records have been created yet. New public registrations will appear here."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/members">Clear filters</Link>
            </Button>
            {canCreate ? (
              <Button asChild>
                <Link href="/dashboard/members/new">
                  <UserPlus aria-hidden="true" />
                  Register a member
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          {view === "cards" ? (
            <MemberCardList
              members={result.items}
              canViewPhotos={canViewPhotos}
              canEdit={canEdit}
              canDelete={canDelete}
              canPrint={canPrint || canPrintBulk}
              showOnDesktop
            />
          ) : (
            <>
              <MemberTable
                members={result.items}
                canViewPhotos={canViewPhotos}
                canEdit={canEdit}
                canDelete={canDelete}
                canPrint={canPrint || canPrintBulk}
              />
              <MemberCardList
                members={result.items}
                canViewPhotos={canViewPhotos}
                canEdit={canEdit}
                canDelete={canDelete}
                canPrint={canPrint || canPrintBulk}
              />
            </>
          )}

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={result.pageSize}
          />
        </>
      )}
    </div>
  );
}
