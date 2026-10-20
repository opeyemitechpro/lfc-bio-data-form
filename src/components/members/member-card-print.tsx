"use client";

import * as React from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MemberPhoto } from "@/components/members/member-photo";
import { ChurchLogo } from "@/components/brand/church-logo";
import {
  AGE_CATEGORY_LABELS,
  GENDER_LABELS,
  MEMBERSHIP_DURATION_LABELS,
  type CustomFieldDefinition,
  type MemberRecord,
} from "@/lib/types";

interface MemberCardPrintProps {
  members: MemberRecord[];
  customFields: CustomFieldDefinition[];
  canViewPhotos: boolean;
  /** Cards per page when printing multiple records. */
  perPage?: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * A print-friendly member card.
 *
 * The layout is designed for a standard A4 sheet: a single card is centred,
 * and bulk printing places multiple cards per page. No dashboard navigation,
 * buttons or backgrounds are printed.
 */
export function MemberCardPrint({
  members,
  customFields,
  canViewPhotos,
  perPage = 4,
}: MemberCardPrintProps) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // The photographs are lazy-loaded; wait briefly so that they appear on
    // the printed page rather than as empty boxes.
    const timer = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-full bg-muted/50">
      {/* On-screen toolbar — hidden when printing. */}
      <div className="no-print sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">
              {members.length === 1 ? "Member card" : "Member cards"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {members.length}{" "}
              {members.length === 1 ? "card" : "cards"} · {perPage} per page
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            disabled={!ready}
            className="print:hidden"
          >
            <Printer aria-hidden="true" />
            Print
          </Button>
        </div>
      </div>

      <div className="print-area mx-auto max-w-5xl p-4">
        <div className="grid gap-4 sm:grid-cols-2 print:gap-3 print:sm:grid-cols-2">
          {members.map((member) => (
            <article
              key={member.id}
              className="print-card overflow-hidden rounded-xl border-2 border-ink bg-white shadow-sm print:rounded-md print:shadow-none"
            >
              {/* Card header */}
              <header className="flex items-center gap-3 bg-ink px-4 py-3 text-white print:bg-white print:text-black print:border-b print:border-ink">
                <ChurchLogo className="size-10 print:size-8" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-tight print:text-xs">
                    Living Faith Church International
                  </p>
                  <p className="truncate text-xs text-white/75 print:text-[9px] print:text-black">
                    Laderin-Hilltop · Winners Chapel
                  </p>
                </div>
              </header>

              <div className="flex gap-4 p-4 print:gap-3 print:p-3">
                <MemberPhoto
                  publicId={canViewPhotos ? member.photo_public_id : null}
                  alt={`Passport photograph of ${member.full_name}`}
                  fallbackText={member.full_name}
                  size="card"
                  className="w-24 shrink-0 print:w-20"
                />

                <div className="min-w-0 flex-1 space-y-2.5 print:space-y-1.5">
                  <div>
                    <h2 className="text-base font-bold leading-tight print:text-sm">
                      {member.title_name ? `${member.title_name} ` : ""}
                      {member.full_name}
                    </h2>
                    <p className="font-mono text-xs text-muted-foreground print:text-[9px]">
                      {member.reference_no}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs print:text-[9px] print:gap-y-0.5">
                    <div>
                      <dt className="font-semibold text-muted-foreground">
                        Phone
                      </dt>
                      <dd className="font-medium">{member.primary_phone}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground">
                        WhatsApp
                      </dt>
                      <dd className="font-medium">
                        {member.whatsapp_same_as_primary
                          ? "Same as phone"
                          : member.whatsapp_phone ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground">
                        Age group
                      </dt>
                      <dd className="font-medium">
                        {AGE_CATEGORY_LABELS[member.age_category].split(" (")[0]}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground">
                        Gender
                      </dt>
                      <dd className="font-medium">
                        {GENDER_LABELS[member.gender]}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground">
                        Membership
                      </dt>
                      <dd className="font-medium">
                        {MEMBERSHIP_DURATION_LABELS[member.membership_duration]}
                      </dd>
                    </div>
                    {member.birth_day && member.birth_month ? (
                      <div>
                        <dt className="font-semibold text-muted-foreground">
                          Date of birth
                        </dt>
                        <dd className="font-medium">
                          {member.birth_day} {MONTH_NAMES[member.birth_month - 1]}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  {member.email ? (
                    <div className="text-xs print:text-[9px]">
                      <span className="font-semibold text-muted-foreground">
                        Email:{" "}
                      </span>
                      <span className="font-medium break-all">{member.email}</span>
                    </div>
                  ) : null}

                  {member.service_units.length > 0 ? (
                    <div className="text-xs print:text-[9px]">
                      <span className="font-semibold text-muted-foreground">
                        Service units:{" "}
                      </span>
                      <span className="font-medium">
                        {member.service_units.map((unit) => unit.name).join(", ")}
                      </span>
                    </div>
                  ) : null}

                  {customFields.length > 0 ? (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-2 text-xs print:text-[9px] print:gap-y-0.5">
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <dt className="font-semibold text-muted-foreground">
                            {field.label}
                          </dt>
                          <dd className="font-medium">
                            {formatValue(member.custom_values[field.field_key])}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </div>

              <footer className="border-t border-border bg-muted/40 px-4 py-2 text-center text-[10px] text-muted-foreground print:bg-white print:text-[8px]">
                Membership card · Living Faith Church International, Laderin-Hilltop
              </footer>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
