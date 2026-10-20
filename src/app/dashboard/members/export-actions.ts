"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { logAdminAction, AUDIT_ACTIONS } from "@/lib/audit";
import { requirePermission, PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { getCustomFields } from "@/lib/members/custom-fields";
import { listMembers, type MemberFilters } from "@/lib/members/queries";
import { collectExportRows } from "@/lib/exports/rows";

const filterSchema = z.object({
  search: z.string().optional(),
  ageCategory: z.string().optional(),
  gender: z.string().optional(),
  titleId: z.string().optional(),
  serviceUnitId: z.string().optional(),
  membershipDuration: z.string().optional(),
  hasPhoto: z.string().optional(),
  registeredFrom: z.string().optional(),
  registeredTo: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  direction: z.string().optional(),
});

const exportRequestSchema = z.object({
  format: z.enum(["csv", "excel", "pdf"]),
  filters: filterSchema.optional(),
  memberIds: z.array(z.string().uuid()).optional(),
  reportTitle: z.string().max(120).optional(),
});

export interface ExportActionResult {
  ok: boolean;
  message?: string;
  /** Set when the export succeeded; the client downloads from this URL. */
  downloadUrl?: string;
}

/**
 * Produces an export and returns a one-time download URL.
 *
 * The export permission is checked on the server, the data is fetched with
 * the access scope applied, and the operation is written to the audit log.
 * The file itself is streamed by the `/api/export` route, which repeats
 * the same authorization check — the browser never filters the result set.
 */
export async function exportMembersAction(
  input: unknown
): Promise<ExportActionResult> {
  const parsed = exportRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "The export request was not valid." };
  }

  const { format, filters, memberIds } = parsed.data;

  const requiredPermission =
    format === "csv"
      ? PERMISSIONS.EXPORT_CSV
      : format === "excel"
        ? PERMISSIONS.EXPORT_EXCEL
        : PERMISSIONS.EXPORT_PDF;

  let context;
  try {
    context = await requirePermission(requiredPermission);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  try {
    // Only the custom fields explicitly marked for export are included.
    const allFields = await getCustomFields({ activeOnly: false });
    const exportFields = allFields.filter(
      (field) => field.show_in_export && field.is_active
    );

    let memberIdList: string[] = memberIds ?? [];

    if (memberIdList.length === 0) {
      const memberFilters: MemberFilters = {
        search: filters?.search,
        ageCategory: (filters?.ageCategory as MemberFilters["ageCategory"]) || "",
        gender: (filters?.gender as MemberFilters["gender"]) || "",
        titleId: filters?.titleId,
        serviceUnitId: filters?.serviceUnitId,
        membershipDuration:
          (filters?.membershipDuration as MemberFilters["membershipDuration"]) || "",
        hasPhoto: (filters?.hasPhoto as "yes" | "no" | "") || "",
        registeredFrom: filters?.registeredFrom,
        registeredTo: filters?.registeredTo,
        status: (filters?.status as MemberFilters["status"]) || "active",
        sort: filters?.sort,
        direction: filters?.direction as "asc" | "desc" | undefined,
        page: 1,
        pageSize: 100,
      };

      // Paginate through every matching record.
      memberIdList = [];
      let page = 1;
      let total = 0;
      do {
        const result = await listMembers(context, {
          ...memberFilters,
          page,
          pageSize: 100,
        });
        memberIdList.push(...result.items.map((row) => row.id));
        total = result.total;
        page += 1;
      } while (memberIdList.length < total && page <= 200);
    }

    const rows = await collectExportRows(context, {
      memberIds: memberIdList,
      customFields: exportFields,
    });

    let headerList: Headers | undefined;
    try {
      headerList = await headers();
    } catch {
      headerList = undefined;
    }
    const ip = headerList?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await logAdminAction(context, AUDIT_ACTIONS.EXPORT_PERFORMED, {
      entityType: "member",
      summary: {
        format,
        recordCount: rows.length,
        scope: memberIds && memberIds.length > 0 ? "selection" : "filtered-directory",
      },
      ipAddress: ip,
    });

    return {
      ok: true,
      message: `${rows.length} ${rows.length === 1 ? "record" : "records"} ready to download.`,
      downloadUrl: `/api/export?format=${format}`,
    };
  } catch (error) {
    console.error("[export] failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return {
      ok: false,
      message: "The export could not be produced. Please try again.",
    };
  }
}
