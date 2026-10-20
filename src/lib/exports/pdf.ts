import "server-only";

import PDFDocument from "pdfkit";

import { buildExportHeadings, rowToCells, type ExportRow } from "@/lib/exports/rows";
import type { CustomFieldDefinition } from "@/lib/types";

const BRAND_RED = "#C81E1E";
const BRAND_INK = "#16161A";
const BRAND_MUTED = "#55555E";
const PAGE_MARGIN = 40;

export interface PdfOptions {
  title: string;
  customFields: CustomFieldDefinition[];
  includePhotoUrl?: boolean;
  /** Draws the church letterhead on every page. */
  churchName?: string;
  subtitle?: string;
}

/**
 * Generates a paginated PDF report with consistent church branding.
 *
 * The header is repeated on every page, the table header row repeats when
 * a page break occurs, and rows are never split across pages.
 */
export function generatePdf(
  rows: ExportRow[],
  options: PdfOptions
): Promise<Buffer> {
  const {
    title,
    customFields,
    includePhotoUrl = false,
    churchName = "Living Faith Church International — Laderin-Hilltop",
    subtitle = "Winners Chapel International · Ogun State, Nigeria",
  } = options;

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: PAGE_MARGIN,
      bufferPages: true,
      info: {
        Title: title,
        Author: churchName,
        Subject: "Membership bio-data report",
      },
    });

    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", (error) => reject(error));

    const headings = buildExportHeadings(customFields, includePhotoUrl);
    const pageWidth =
      document.page.width - PAGE_MARGIN * 2;

    // --- Column widths, weighted by the heading length ----------------
    const totalWeight = headings.reduce((sum, heading) => sum + heading.length, 0);
    const columnWidths = headings.map((heading) =>
      Math.max(38, (heading.length / totalWeight) * pageWidth)
    );
    // Normalise so the columns exactly fill the printable width.
    const widthSum = columnWidths.reduce((sum, width) => sum + width, 0);
    const scale = pageWidth / widthSum;
    const widths = columnWidths.map((width) => width * scale);

    const drawLetterhead = () => {
      const top = PAGE_MARGIN;
      document
        .save()
        .fillColor(BRAND_RED)
        .rect(PAGE_MARGIN, top, 4, 34)
        .fill()
        .restore();

      document
        .fillColor(BRAND_INK)
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(churchName, PAGE_MARGIN + 12, top + 2, { width: pageWidth - 12 });

      document
        .fillColor(BRAND_MUTED)
        .font("Helvetica")
        .fontSize(8)
        .text(subtitle, PAGE_MARGIN + 12, top + 18, { width: pageWidth - 12 });
    };

    const drawPageFooter = (pageNumber: number, pageTotal: number) => {
      const footerY = document.page.height - PAGE_MARGIN + 6;
      document
        .strokeColor("#DCDCE1")
        .lineWidth(0.5)
        .moveTo(PAGE_MARGIN, footerY - 6)
        .lineTo(document.page.width - PAGE_MARGIN, footerY - 6)
        .stroke();

      document
        .fillColor(BRAND_MUTED)
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          `Generated ${new Date().toLocaleString("en-NG")} · Page ${pageNumber} of ${pageTotal}`,
          PAGE_MARGIN,
          footerY,
          { width: pageWidth, align: "center" }
        );
    };

    const drawTableHeader = (y: number): number => {
      const headerHeight = 20;

      document
        .save()
        .fillColor(BRAND_RED)
        .rect(PAGE_MARGIN, y, pageWidth, headerHeight)
        .fill()
        .restore();

      document.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7);

      let x = PAGE_MARGIN + 4;
      headings.forEach((heading, index) => {
        document.text(heading, x, y + 6, {
          width: widths[index] - 6,
          height: headerHeight - 4,
          ellipsis: true,
          lineBreak: false,
        });
        x += widths[index];
      });

      return y + headerHeight;
    };

    const drawRow = (cells: string[], y: number, isAlternate: boolean): number => {
      const rowHeight = 16;

      if (isAlternate) {
        document
          .save()
          .fillColor("#F6F6F8")
          .rect(PAGE_MARGIN, y, pageWidth, rowHeight)
          .fill()
          .restore();
      }

      document.fillColor(BRAND_INK).font("Helvetica").fontSize(7);

      let x = PAGE_MARGIN + 4;
      cells.forEach((cell, index) => {
        document.text(cell ?? "", x, y + 4.5, {
          width: widths[index] - 6,
          height: rowHeight - 3,
          ellipsis: true,
          lineBreak: false,
        });
        x += widths[index];
      });

      document
        .save()
        .strokeColor("#E6E6EA")
        .lineWidth(0.4)
        .moveTo(PAGE_MARGIN, y + rowHeight)
        .lineTo(document.page.width - PAGE_MARGIN, y + rowHeight)
        .stroke()
        .restore();

      return y + rowHeight;
    };

    // --- Document body -------------------------------------------------
    drawLetterhead();

    document
      .fillColor(BRAND_INK)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(title, PAGE_MARGIN, PAGE_MARGIN + 46, { width: pageWidth });

    document
      .fillColor(BRAND_MUTED)
      .font("Helvetica")
      .fontSize(8.5)
      .text(
        `${rows.length} member ${rows.length === 1 ? "record" : "records"} · Generated ${new Date().toLocaleString("en-NG")}`,
        PAGE_MARGIN,
        PAGE_MARGIN + 66,
        { width: pageWidth }
      );

    let cursorY = PAGE_MARGIN + 84;
    const bottomLimit = document.page.height - PAGE_MARGIN - 24;

    cursorY = drawTableHeader(cursorY);

    rows.forEach((row, index) => {
      const cells = rowToCells(row, customFields, includePhotoUrl);

      if (cursorY + 16 > bottomLimit) {
        document.addPage();
        drawLetterhead();
        cursorY = PAGE_MARGIN + 46;
        cursorY = drawTableHeader(cursorY);
      }

      cursorY = drawRow(cells, cursorY, index % 2 === 1);
    });

    if (rows.length === 0) {
      document
        .fillColor(BRAND_MUTED)
        .font("Helvetica-Oblique")
        .fontSize(10)
        .text("No records matched the selected filters.", PAGE_MARGIN, cursorY + 12);
    }

    // --- Footers on every page ----------------------------------------
    const range = document.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      document.switchToPage(range.start + index);
      drawPageFooter(index + 1, range.count);
    }

    document.end();
  });
}
