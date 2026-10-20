import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Printer,
  Undo2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MemberPhoto } from "@/components/members/member-photo";
import { MemberActions } from "@/components/members/member-actions";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getMemberById } from "@/lib/members/queries";
import { getCustomFields } from "@/lib/members/custom-fields";
import {
  AGE_CATEGORY_LABELS,
  GENDER_LABELS,
  MEMBERSHIP_DURATION_LABELS,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";


export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Member ${id.slice(0, 8)}` };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberProfilePage({ params }: PageProps) {
  const { id } = await params;
  const context = await requireAdmin();

  const canViewPhotos =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_VIEW_PHOTO);
  const canEdit =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_EDIT);
  const canDelete =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_DELETE);
  const canPrint =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.PRINT_CARD);

  const member = await getMemberById(context, id);
  if (!member) notFound();

  const customFields = (await getCustomFields({ activeOnly: false })).filter(
    (field) => field.show_on_profile && field.is_active
  );

  const visibleCustomFields = customFields.filter(
    (field) =>
      !field.is_sensitive ||
      context.isSuperadmin ||
      (field.required_permission
        ? context.permissions.has(field.required_permission)
        : true)
  );

  const otherPhones = member.phones.filter(
    (phone) => phone.label === "other"
  );

  const isDeleted = member.status === "deleted";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/dashboard/members">
            <ArrowLeft aria-hidden="true" />
            Back to the directory
          </Link>
        </Button>

        <MemberActions
          memberId={member.id}
          canEdit={canEdit}
          canDelete={canDelete}
          canPrint={canPrint}
        />
      </div>

      {isDeleted ? (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-5">
          <p className="font-bold text-destructive">
            This record has been deleted.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            It was deleted on {formatDateTime(member.deleted_at)}
            {member.deletion_reason ? ` — ${member.deletion_reason}` : ""}. An
            administrator with the delete permission can restore it.
          </p>
        </div>
      ) : null}

      {/* Header card */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:p-6">
          <MemberPhoto
            publicId={canViewPhotos ? member.photo_public_id : null}
            alt={`Passport photograph of ${member.full_name}`}
            fallbackText={member.full_name}
            size="card"
            priority
            className="w-32 shrink-0 sm:w-40"
          />

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {member.full_name}
                </h1>
                {member.title_name ? (
                  <Badge variant="accent">{member.title_name}</Badge>
                ) : null}
                {isDeleted ? <Badge variant="destructive">Deleted</Badge> : null}
              </div>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {member.reference_no}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {GENDER_LABELS[member.gender]}
              </Badge>
              <Badge variant="secondary">
                {AGE_CATEGORY_LABELS[member.age_category]}
              </Badge>
              <Badge variant="secondary">
                {MEMBERSHIP_DURATION_LABELS[member.membership_duration]}
              </Badge>
              <Badge variant="outline">
                {member.registration_source === "public_form"
                  ? "Self-registered"
                  : "Added by administrator"}
              </Badge>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Primary phone
                  </dt>
                  <dd className="font-medium">{member.primary_phone}</dd>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    WhatsApp
                  </dt>
                  <dd className="font-medium">
                    {member.whatsapp_same_as_primary
                      ? "Same as primary phone"
                      : member.whatsapp_phone ?? "Not provided"}
                  </dd>
                </div>
              </div>

              {member.email ? (
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Email
                    </dt>
                    <dd className="truncate font-medium">{member.email}</dd>
                  </div>
                </div>
              ) : null}

              {member.birth_day && member.birth_month ? (
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date of birth
                    </dt>
                    <dd className="font-medium">
                      {dayMonthLabel(member.birth_day, member.birth_month)}
                    </dd>
                  </div>
                </div>
              ) : null}

              {member.residential_address ? (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Residential address
                    </dt>
                    <dd className="font-medium">{member.residential_address}</dd>
                  </div>
                </div>
              ) : null}
            </dl>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Church membership */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" aria-hidden="true" />
              Church membership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Service units
              </h3>
              {member.service_units.length === 0 ? (
                <p className="mt-1 text-muted-foreground">
                  Not assigned to any service unit.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {member.service_units.map((unit) => (
                    <Badge key={unit.id} variant="secondary">
                      {unit.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Additional phone numbers
              </h3>
              {otherPhones.length === 0 ? (
                <p className="mt-1 text-muted-foreground">None recorded.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {otherPhones.map((phone) => (
                    <li key={phone.id} className="font-medium">
                      {phone.phone}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {member.suggestions ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggestions or observations
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {member.suggestions}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Consent and metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Registration record</CardTitle>
            <CardDescription>
              Consent and audit information for this record.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.consent ? (
              <dl className="space-y-3">
                <Row
                  label="Privacy notice version"
                  value={member.consent.notice_version}
                />
                <Row
                  label="Consent given"
                  value={formatDateTime(member.consent.consented_at)}
                />
                <Row
                  label="Consent status"
                  value={
                    member.consent.status === "granted"
                      ? "Granted"
                      : "Withdrawn"
                  }
                />
                {member.consent.is_child_registration ? (
                  <>
                    <Row label="Registered as" value="Child registration" />
                    {member.consent.guardian_name ? (
                      <Row
                        label="Parent or guardian"
                        value={member.consent.guardian_name}
                      />
                    ) : null}
                  </>
                ) : null}
              </dl>
            ) : (
              <p className="text-muted-foreground">
                No consent record was stored for this member.
              </p>
            )}

            <div className="border-t border-border pt-4">
              <dl className="space-y-3">
                <Row label="Registered" value={formatDateTime(member.created_at)} />
                <Row label="Last updated" value={formatDateTime(member.updated_at)} />
                <Row
                  label="Photograph on file"
                  value={
                    member.photo_public_id
                      ? canViewPhotos
                        ? "Yes"
                        : "Yes (not permitted to view)"
                      : "No"
                  }
                />
              </dl>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom fields */}
      {visibleCustomFields.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Additional information</CardTitle>
            <CardDescription>
              Fields configured by the church for the membership register.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCustomFields.map((field) => (
                <div key={field.id}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {formatCustomValue(member.custom_values[field.field_key])}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick actions */}
      {canEdit || canPrint ? (
        <div className="flex flex-wrap gap-3">
          {canEdit ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/members/${member.id}?edit=1`}>
                <Pencil aria-hidden="true" />
                Edit this record
              </Link>
            </Button>
          ) : null}
          {canPrint ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/members/${member.id}/card`}>
                <Printer aria-hidden="true" />
                Print member card
              </Link>
            </Button>
          ) : null}
          {isDeleted && canDelete ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/members/${member.id}?restore=1`}>
                <Undo2 aria-hidden="true" />
                Restore this record
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dayMonthLabel(day: number, month: number): string {
  return `${day} ${MONTH_NAMES[month - 1] ?? month}`;
}

function formatCustomValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
