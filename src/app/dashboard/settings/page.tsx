import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SettingsForms } from "@/components/settings/settings-forms";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSetting } from "@/lib/settings";
import { getFormSettings, getPrivacyNotice } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Application settings",
};


export default async function SettingsPage() {
  const context = await requireAdmin();

  const canManageSettings =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.SETTINGS_MANAGE);
  const canManageForm =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.FORM_SETTINGS_MANAGE);

  if (!canManageSettings && !canManageForm) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to manage the application settings.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/dashboard">Back to the dashboard</Link>
        </Button>
      </div>
    );
  }

  const [privacyNotice, formSettings, retention] = await Promise.all([
    getPrivacyNotice(),
    getFormSettings(),
    getSetting("retention_policy", {
      memberYears: 7,
      deletedRecordMonths: 24,
      photoDeletionOnPermanentDelete: true,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Application settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage the privacy notice, the public registration form and the data
          retention policy. Changes take effect immediately.
        </p>
      </div>

      <SettingsForms
        privacyNotice={privacyNotice}
        formSettings={formSettings}
        retention={retention}
        canManageSettings={canManageSettings}
        canManageForm={canManageForm}
      />
    </div>
  );
}
