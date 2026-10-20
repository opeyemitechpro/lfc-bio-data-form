import "server-only";

import ExcelJS from "exceljs";

import { buildExportHeadings, rowToCells, type ExportRow } from "@/lib/exports/rows";
import type { CustomFieldDefinition } from "@/lib/types";

const BRAND_BLUE = "FF123A8F";
const BRAND_RED = "FFC81E1E";

/**
 * Generates an .xlsx workbook.
 *
 * The worksheet is styled with the church colours, the header row is
 * frozen and auto-filtered, column widths are sized from the content, and
 * every value is written as text so that phone numbers keep their leading
 * zeros and no cell is interpreted as a formula.
 */
export async function generateExcel(
  rows: ExportRow[],
  customFields: CustomFieldDefinition[],
  includePhotoUrl = false,
  reportTitle = "Member Report"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Living Faith Church International — Laderin-Hilltop";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Members", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headings = buildExportHeadings(customFields, includePhotoUrl);

  worksheet.columns = headings.map((heading) => ({ header: heading, key: heading, width: 18 }));

  // Style the header row.
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_BLUE } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Write the data.
  for (const row of rows) {
    const cells = rowToCells(row, customFields, includePhotoUrl);
    const added = worksheet.addRow(cells);

    added.eachCell((cell, columnNumber) => {
      cell.alignment = { vertical: "top", wrapText: columnNumber === headings.length };
      cell.font = { size: 10 };

      // Write everything as a literal string so Excel never evaluates a
      // phone number or a name as a formula.
      const value = cell.value;
      if (typeof value === "string") {
        cell.value = value;
      }
    });
  }

  // Alternate row shading for readability.
  for (let index = 2; index <= worksheet.rowCount; index += 1) {
    if (index % 2 === 0) {
      worksheet.getRow(index).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F6F8" } };
      });
    }
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headings.length },
  };

  // Auto-size the columns, within sensible bounds.
  for (let columnIndex = 1; columnIndex <= headings.length; columnIndex += 1) {
    const column = worksheet.getColumn(columnIndex);
    let maxLength = headings[columnIndex - 1].length;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const text = cell.text ?? "";
      if (text.length > maxLength) maxLength = text.length;
    });
    column.width = Math.min(Math.max(maxLength + 2, 12), 42);
  }

  // A title sheet describing the report.
  const titleSheet = workbook.addWorksheet("Report");
  titleSheet.getColumn(1).width = 34;
  titleSheet.getColumn(2).width = 40;

  titleSheet.addRow(["Report", reportTitle]);
  titleSheet.addRow(["Church", "Living Faith Church International — Laderin-Hilltop"]);
  titleSheet.addRow(["Generated", new Date().toISOString()]);
  titleSheet.addRow(["Records", String(rows.length)]);

  titleSheet.getRow(1).font = { bold: true, size: 14, color: { argb: BRAND_RED } };
  titleSheet.getColumn(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
