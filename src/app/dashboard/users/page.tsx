import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { UserManager } from "@/components/users/user-manager";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listAppUsers, listRoles } from "@/lib/users/queries";
import { listServiceUnits } from "@/lib/lookups";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "User management",
};


export default async function UsersPage() {
  const context = await requireAdmin();

  const canManage =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.USERS_MANAGE);
  const canActivate =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.USERS_ACTIVATE);

  if (!canManage && !canActivate) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to manage user accounts.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/dashboard">Back to the dashboard</Link>
        </Button>
      </div>
    );
  }

  const [users, roles, serviceUnits] = await Promise.all([
    listAppUsers(),
    listRoles(),
    listServiceUnits(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          User management
        </h1>
        <p className="mt-1 text-muted-foreground">
          Create administrator accounts, assign roles and control which member
          records each person can see.
        </p>
      </div>

      <UserManager
        users={users}
        roles={roles}
        serviceUnits={serviceUnits}
        canManage={canManage}
        canActivate={canActivate}
      />
    </div>
  );
}
