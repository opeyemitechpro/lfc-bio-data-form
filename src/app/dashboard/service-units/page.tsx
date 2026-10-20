import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LookupManager } from "@/components/configuration/lookup-manager";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listServiceUnits } from "@/lib/lookups";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service units",
};


export default async function ServiceUnitsPage() {
  const context = await requireAdmin();

  const canManage =
    context.isSuperadmin ||
    context.permissions.has(PERMISSIONS.SERVICE_UNITS_MANAGE);

  if (!canManage) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to manage service units.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/dashboard">Back to the dashboard</Link>
        </Button>
      </div>
    );
  }

  const units = await listServiceUnits({ activeOnly: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Service units
        </h1>
        <p className="mt-1 text-muted-foreground">
          The departments and units members can be assigned to. Changes apply
          to the public registration form immediately.
        </p>
      </div>

      <LookupManager
        kind="service_units"
        title="Church service units"
        description="Add, rename, deactivate and reorder the units used on the registration form."
        items={units}
      />
    </div>
  );
}
