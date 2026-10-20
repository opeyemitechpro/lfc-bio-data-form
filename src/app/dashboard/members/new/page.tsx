import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MemberForm } from "@/components/members/member-form";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listServiceUnits, listTitles } from "@/lib/lookups";
import { getCustomFields } from "@/lib/members/custom-fields";
import { getFormSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Register a member",
};


export default async function NewMemberPage() {
  const context = await requireAdmin();

  const canCreate =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_CREATE);

  if (!canCreate) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to create member records.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/dashboard/members">Back to the directory</Link>
        </Button>
      </div>
    );
  }

  const [titles, serviceUnits, customFields, settings] = await Promise.all([
    listTitles(),
    listServiceUnits(),
    getCustomFields({ activeOnly: true }),
    getFormSettings(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" className="-ml-3">
          <Link href="/dashboard/members">
            <ArrowLeft aria-hidden="true" />
            Back to the directory
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Register a member
        </h1>
        <p className="mt-1 text-muted-foreground">
          Add a member to the register on behalf of the church. A membership
          reference number is generated automatically.
        </p>
      </div>

      <MemberForm
        titles={titles}
        serviceUnits={serviceUnits}
        customFields={customFields}
        maxUploadBytes={settings.maxUploadBytes}
        allowAdditionalPhones={settings.allowAdditionalPhones}
        allowSuggestions={settings.allowSuggestions}
      />
    </div>
  );
}
