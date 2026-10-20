"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportMenuProps {
  canExportCsv: boolean;
  canExportExcel: boolean;
  canExportPdf: boolean;
  canPrint: boolean;
  canPrintBulk: boolean;
}

/**
 * The export and print menu.
 *
 * The download URL carries the active filters so the exported file always
 * matches the current directory view, and the server re-checks the
 * permission before producing anything.
 */
export function ExportMenu({
  canExportCsv,
  canExportExcel,
  canExportPdf,
  canPrint,
  canPrintBulk,
}: ExportMenuProps) {
  const searchParams = useSearchParams();
  const [busy, setBusy] = React.useState(false);

  const buildUrl = React.useCallback(
    (format: "csv" | "excel" | "pdf", scope: "directory" | "selection" = "directory") => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("format", format);
      params.set("scope", scope);
      params.delete("page");
      params.delete("view");
      return `/api/export?${params.toString()}`;
    },
    [searchParams]
  );

  const download = (format: "csv" | "excel" | "pdf") => {
    setBusy(true);
    try {
      // The browser downloads directly from the API route, which performs
      // its own server-side authorization check.
      const link = document.createElement("a");
      link.href = buildUrl(format);
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Your ${format.toUpperCase()} export is downloading.`);
    } finally {
      window.setTimeout(() => setBusy(false), 1500);
    }
  };

  const openPrint = (scope: "directory" | "selection" = "directory") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", scope);
    params.delete("page");
    params.delete("view");
    window.open(`/dashboard/members/print?${params.toString()}`, "_blank");
  };

  const hasAny =
    canExportCsv || canExportExcel || canExportPdf || canPrint || canPrintBulk;

  if (!hasAny) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy}>
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          Export &amp; print
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {canExportCsv ? (
          <DropdownMenuItem onSelect={() => download("csv")}>
            <FileText aria-hidden="true" />
            Download CSV
          </DropdownMenuItem>
        ) : null}
        {canExportExcel ? (
          <DropdownMenuItem onSelect={() => download("excel")}>
            <FileSpreadsheet aria-hidden="true" />
            Download Excel (.xlsx)
          </DropdownMenuItem>
        ) : null}
        {canExportPdf ? (
          <DropdownMenuItem onSelect={() => download("pdf")}>
            <FileText aria-hidden="true" />
            Download PDF report
          </DropdownMenuItem>
        ) : null}
        {canPrint || canPrintBulk ? (
          <>
            <DropdownMenuSeparator />
            {canPrint ? (
              <DropdownMenuItem onSelect={() => openPrint("directory")}>
                <Printer aria-hidden="true" />
                Print member table
              </DropdownMenuItem>
            ) : null}
            {canPrintBulk ? (
              <DropdownMenuItem onSelect={() => openPrint("directory")}>
                <Printer aria-hidden="true" />
                Print member cards
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
