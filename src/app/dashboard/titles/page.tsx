import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LookupManager } from "@/components/configuration/lookup-manager";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listTitles } from "@/lib/lookups";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Titles",
};


export default async function TitlesPage() {
  const context = await requireAdmin();

  const canManage =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.TITLES_MANAGE);

  if (!canManage) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to manage titles.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/dashboard">Back to the dashboard</Link>
        </Button>
      </div>
    );
  }

  const titles = await listTitles({ activeOnly: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Titles</h1>
        <p className="mt-1 text-muted-foreground">
          The church and family titles a member can select. Titles are not
          verified — members choose their own.
        </p>
      </div>

      <LookupManager
        kind="titles"
        title="Member titles"
        description="Add, rename, deactivate and reorder the titles offered on the registration form."
        items={titles}
      />
    </div>
  );
}
