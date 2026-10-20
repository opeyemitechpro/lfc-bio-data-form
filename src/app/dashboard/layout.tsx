import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getEffectivePermissions } from "@/lib/auth/permissions";
import { createAdminSupabaseClient } from "@/lib/supabase/clients";

export const metadata: Metadata = {
  title: "Dashboard",
};


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAdmin();
  const permissions = await getEffectivePermissions();

  const admin = await createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("app_users")
    .select("full_name")
    .eq("id", context.userId)
    .maybeSingle();

  return (
    <DashboardShell
      user={{
        email: context.email,
        name: profile?.full_name ?? null,
        isSuperadmin: context.isSuperadmin,
        roleNames: context.roleNames,
      }}
      permissions={permissions}
    >
      {children}
    </DashboardShell>
  );
}
