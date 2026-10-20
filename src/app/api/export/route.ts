import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction, AUDIT_ACTIONS } from "@/lib/audit";
import {
  requirePermission,
  PERMISSIONS,
  AuthorizationError,
} from "@/lib/auth/permissions";
import { getCustomFields } from "@/lib/members/custom-fields";
import { listMembers, type MemberFilters } from "@/lib/members/queries";
import { collectExportRows, buildExportFilename } from "@/lib/exports/rows";
import { generateCsv } from "@/lib/exports/csv";
import { generateExcel } from "@/lib/exports/excel";
import { generatePdf } from "@/lib/exports/pdf";


/**
 * Streams a member export.
 *
 * Authorization is enforced here on the server, independently of the
 * client. The response is marked `no-store` and is never written to a
 * permanent, publicly accessible file.
 */
export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  const reportTitle = request.nextUrl.searchParams.get("title") ?? "Member Report";
  const scope = request.nextUrl.searchParams.get("scope") ?? "directory";

  let context;
  try {
    const requiredPermission =
      format === "csv"
        ? PERMISSIONS.EXPORT_CSV
        : format === "excel"
          ? PERMISSIONS.EXPORT_EXCEL
          : PERMISSIONS.EXPORT_PDF;

    context = await requirePermission(requiredPermission);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allFields = await getCustomFields({ activeOnly: false });
    const exportFields = allFields.filter(
      (field) => field.show_in_export && field.is_active
    );

    // Read the filters from the query string so the export always matches
    // what the administrator is currently looking at.
    const params = request.nextUrl.searchParams;
    const filters: MemberFilters = {
      search: params.get("q") ?? undefined,
      ageCategory: (params.get("age") as MemberFilters["ageCategory"]) || "",
      gender: (params.get("gender") as MemberFilters["gender"]) || "",
      titleId: params.get("title") ?? undefined,
      serviceUnitId: params.get("unit") ?? undefined,
      membershipDuration:
        (params.get("duration") as MemberFilters["membershipDuration"]) || "",
      hasPhoto: (params.get("photo") as "yes" | "no" | "") || "",
      registeredFrom: params.get("from") ?? undefined,
      registeredTo: params.get("to") ?? undefined,
      status: (params.get("status") as MemberFilters["status"]) || "active",
      sort: params.get("sort") ?? undefined,
      direction: (params.get("direction") as "asc" | "desc" | undefined) ?? undefined,
    };

    let memberIds: string[] = [];

    if (scope === "selection") {
      const ids = params.get("ids");
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

    const rows = await collectExportRows(context, {
      memberIds,
      customFields: exportFields,
    });

    await logAdminAction(context, AUDIT_ACTIONS.EXPORT_PERFORMED, {
      entityType: "member",
      summary: {
        format,
        recordCount: rows.length,
        scope: scope === "selection" ? "selection" : "filtered-directory",
        via: "download",
      },
    });

    if (format === "csv") {
      const csv = generateCsv(rows, exportFields);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${buildExportFilename(reportTitle, "csv")}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    if (format === "excel") {
      const buffer = await generateExcel(rows, exportFields, false, reportTitle);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${buildExportFilename(reportTitle, "xlsx")}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    const buffer = await generatePdf(rows, {
      title: reportTitle,
      customFields: exportFields,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildExportFilename(reportTitle, "pdf")}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[export-route] failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: "The export could not be produced." },
      { status: 500 }
    );
  }
}
