import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { RoleManager } from "@/components/users/role-manager";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS, listPermissionCatalogue } from "@/lib/auth/permissions";
import { listRoles } from "@/lib/users/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roles and permissions",
};


export default async function RolesPage() {
  const context = await requireAdmin();

  const canManage =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.ROLES_MANAGE);

  if (!canManage) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to manage roles and permissions.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/dashboard">Back to the dashboard</Link>
        </Button>
      </div>
    );
  }

  const [roles, permissions] = await Promise.all([
    listRoles(),
    listPermissionCatalogue(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Roles and permissions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Create roles and assign granular permissions. Every operation in the
          application is checked on the server against these permissions, so
          hiding a button is never the only protection.
        </p>
      </div>

      <RoleManager roles={roles} permissions={permissions} />
    </div>
  );
}
