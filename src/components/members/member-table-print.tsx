"use client";

import * as React from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChurchLogo } from "@/components/brand/church-logo";
import {
  AGE_CATEGORY_LABELS,
  GENDER_LABELS,
  MEMBERSHIP_DURATION_LABELS,
} from "@/lib/types";
import type {
  CustomFieldDefinition,
  MemberListItem,
  ServiceUnitOption,
  TitleOption,
} from "@/lib/types";

interface MemberTablePrintProps {
  members: MemberListItem[];
  customFields: CustomFieldDefinition[];
  canViewPhotos: boolean;
  titles: TitleOption[];
  serviceUnits: ServiceUnitOption[];
}

/**
 * A print-friendly member table.
 *
 * Only the fields that are configured for the table (or explicitly marked
 * for export) are printed. Dashboard navigation and backgrounds are
 * excluded by the print stylesheet.
 */
export function MemberTablePrint({
  members,
  customFields,
}: MemberTablePrintProps) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-full bg-muted/50">
      <div className="no-print sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Printable member table</h1>
            <p className="text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
          <Button onClick={() => window.print()} disabled={!ready} className="print:hidden">
            <Printer aria-hidden="true" />
            Print
          </Button>
        </div>
      </div>

      <div className="print-area mx-auto max-w-6xl p-4">
        <header className="mb-4 flex items-center gap-3 border-b-2 border-ink pb-3">
          <ChurchLogo className="size-12" />
          <div>
            <h1 className="text-lg font-bold leading-tight">
              Living Faith Church International — Laderin-Hilltop
            </h1>
            <p className="text-sm text-muted-foreground">
              Membership register · Winners Chapel International · Generated{" "}
              {new Date().toLocaleString("en-NG")}
            </p>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="print-table w-full border-collapse text-xs">
            <thead>
              <tr className="border-y-2 border-ink bg-muted/60">
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  #
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Reference No
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Full Name
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Title
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Gender
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Age Group
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Primary Phone
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  WhatsApp
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Email
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Service Units
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Duration
                </th>
                <th scope="col" className="border border-border px-2 py-2 text-left font-bold">
                  Registered
                </th>
                {customFields.map((field) => (
                  <th
                    key={field.id}
                    scope="col"
                    className="border border-border px-2 py-2 text-left font-bold"
                  >
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr key={member.id} className="break-inside-avoid">
                  <td className="border border-border px-2 py-1.5">{index + 1}</td>
                  <td className="border border-border px-2 py-1.5 font-mono text-[10px]">
                    {member.reference_no}
                  </td>
                  <td className="border border-border px-2 py-1.5 font-semibold">
                    {member.full_name}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {member.title_name ?? "—"}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {GENDER_LABELS[member.gender]}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {AGE_CATEGORY_LABELS[member.age_category].split(" (")[0]}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {member.primary_phone}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {member.whatsapp_same_as_primary
                      ? "Same"
                      : member.whatsapp_phone ?? "—"}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {member.email ?? "—"}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {member.service_units.length > 0
                      ? member.service_units.map((unit) => unit.name).join(", ")
                      : "—"}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {MEMBERSHIP_DURATION_LABELS[member.membership_duration]}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {new Date(member.created_at).toLocaleDateString("en-NG", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  {customFields.map((field) => (
                    <td
                      key={field.id}
                      className="border border-border px-2 py-1.5"
                    >
                      {member.custom_values?.[field.field_key] !== undefined
                        ? String(member.custom_values[field.field_key])
                        : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {members.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No members matched the selected filters.
          </p>
        ) : null}

        <footer className="mt-6 border-t border-border pt-3 text-center text-xs text-muted-foreground">
          Total records printed: {members.length} · Generated{" "}
          {new Date().toLocaleString("en-NG")} · Living Faith Church
          International, Laderin-Hilltop
        </footer>
      </div>
    </div>
  );
}
