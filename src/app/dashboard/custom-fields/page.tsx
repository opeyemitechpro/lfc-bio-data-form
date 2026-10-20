import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CustomFieldManager } from "@/components/configuration/custom-field-manager";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getCustomFields } from "@/lib/members/custom-fields";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Custom fields",
};


export default async function CustomFieldsPage() {
  const context = await requireAdmin();

  const canManage =
    context.isSuperadmin ||
    context.permissions.has(PERMISSIONS.CUSTOM_FIELDS_MANAGE);

  if (!canManage) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to manage custom fields.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/dashboard">Back to the dashboard</Link>
        </Button>
      </div>
    );
  }

  const fields = await getCustomFields({ activeOnly: false });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Custom fields
        </h1>
        <p className="mt-1 text-muted-foreground">
          Configure the extra questions the church asks members. Fields are
          stored in the database, so no redeployment is needed to change them.
        </p>
      </div>

      <CustomFieldManager fields={fields} />
    </div>
  );
}
