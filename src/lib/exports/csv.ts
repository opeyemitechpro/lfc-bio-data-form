import "server-only";

import { buildExportHeadings, rowToCells, type ExportRow } from "@/lib/exports/rows";
import type { CustomFieldDefinition } from "@/lib/types";

/**
 * Generates a CSV document.
 *
 * Values are already sanitised against spreadsheet formula injection by
 * `rowToCells`. UTF-8 BOM is prepended so that Excel on Windows opens
 * Unicode names correctly.
 */
export function generateCsv(
  rows: ExportRow[],
  customFields: CustomFieldDefinition[],
  includePhotoUrl = false
): string {
  const headings = buildExportHeadings(customFields, includePhotoUrl);
  const lines: string[] = [];

  lines.push(escapeCsvRow(headings));

  for (const row of rows) {
    lines.push(escapeCsvRow(rowToCells(row, customFields, includePhotoUrl)));
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function escapeCsvRow(values: string[]): string {
  return values
    .map((value) => {
      const text = String(value ?? "");
      if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    })
    .join(",");
}
