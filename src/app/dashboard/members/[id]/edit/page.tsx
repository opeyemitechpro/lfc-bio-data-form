import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MemberForm, type MemberFormInitialValues } from "@/components/members/member-form";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listServiceUnits, listTitles } from "@/lib/lookups";
import { getCustomFields } from "@/lib/members/custom-fields";
import { getMemberById } from "@/lib/members/queries";
import { getFormSettings } from "@/lib/settings";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit member",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMemberPage({ params }: PageProps) {
  const { id } = await params;
  const context = await requireAdmin();

  const canEdit =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_EDIT);

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to edit member records.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href={`/dashboard/members/${id}`}>Back to the profile</Link>
        </Button>
      </div>
    );
  }

  const member = await getMemberById(context, id);
  if (!member) notFound();

  const [titles, serviceUnits, customFields, settings] = await Promise.all([
    listTitles(),
    listServiceUnits(),
    getCustomFields({ activeOnly: true }),
    getFormSettings(),
  ]);

  const initial: MemberFormInitialValues = {
    id: member.id,
    full_name: member.full_name,
    title_id: member.title_id,
    gender: member.gender,
    age_category: member.age_category,
    birth_day: member.birth_day,
    birth_month: member.birth_month,
    primary_phone: member.primary_phone,
    whatsapp_same_as_primary: member.whatsapp_same_as_primary,
    whatsapp_phone: member.whatsapp_phone,
    email: member.email,
    residential_address: member.residential_address,
    membership_duration: member.membership_duration,
    suggestions: member.suggestions,
    service_unit_ids: member.service_units.map((unit) => unit.id),
    additional_phones: member.phones
      .filter((phone) => phone.label === "other")
      .map((phone) => phone.phone),
    custom_values: member.custom_values,
    photo_public_id: member.photo_public_id,
    photo_format: member.photo_format,
    photo_width: member.photo_width,
    photo_height: member.photo_height,
    photo_bytes: member.photo_bytes,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" className="-ml-3">
          <Link href={`/dashboard/members/${member.id}`}>
            <ArrowLeft aria-hidden="true" />
            Back to the profile
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Edit {member.full_name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {member.reference_no} · Changes are recorded in the audit log.
        </p>
      </div>

      <MemberForm
        titles={titles}
        serviceUnits={serviceUnits}
        customFields={customFields}
        initial={initial}
        maxUploadBytes={settings.maxUploadBytes}
        allowAdditionalPhones={settings.allowAdditionalPhones}
        allowSuggestions={settings.allowSuggestions}
      />
    </div>
  );
}
