"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  updateFormSettingsAction,
  updatePrivacyNoticeAction,
  updateRetentionPolicyAction,
  type SettingsActionResult,
} from "@/app/dashboard/settings/actions";
import type { FormSettings, PrivacyNotice } from "@/lib/types";

interface SettingsFormsProps {
  privacyNotice: PrivacyNotice;
  formSettings: FormSettings;
  retention: {
    memberYears: number;
    deletedRecordMonths: number;
    photoDeletionOnPermanentDelete: boolean;
  };
  canManageSettings: boolean;
  canManageForm: boolean;
}

export function SettingsForms({
  privacyNotice,
  formSettings,
  retention,
  canManageSettings,
  canManageForm,
}: SettingsFormsProps) {
  return (
    <div className="space-y-6">
      <PrivacyNoticeForm
        initial={privacyNotice}
        canManage={canManageSettings}
      />
      <FormSettingsForm initial={formSettings} canManage={canManageForm} />
      <RetentionForm initial={retention} canManage={canManageSettings} />
    </div>
  );
}

function PrivacyNoticeForm({
  initial,
  canManage,
}: {
  initial: PrivacyNotice;
  canManage: boolean;
}) {
  const router = useRouter();
  const [version, setVersion] = React.useState(initial.version);
  const [organisation, setOrganisation] = React.useState(initial.organisation);
  const [contactEmail, setContactEmail] = React.useState(initial.contactEmail);
  const [contactPhone, setContactPhone] = React.useState(initial.contactPhone);
  const [retentionYears, setRetentionYears] = React.useState(
    String(initial.retentionYears)
  );
  const [thirdParties, setThirdParties] = React.useState(
    initial.thirdParties.join("\n")
  );
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSave = async () => {
    setBusy(true);
    setErrors({});

    const result: SettingsActionResult = await updatePrivacyNoticeAction({
      version,
      updatedAt: new Date().toISOString().slice(0, 10),
      organisation,
      contactEmail,
      contactPhone,
      retentionYears: Number(retentionYears) || 7,
      thirdParties: thirdParties
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });

    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The privacy notice was updated.");
      router.refresh();
    } else {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message ?? "The privacy notice could not be updated.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy notice</CardTitle>
        <CardDescription>
          Shown on the public registration form and on the full privacy policy
          page. Changing the version records a new consent version for future
          registrations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pn-version">Notice version</Label>
            <Input
              id="pn-version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              disabled={!canManage}
              invalid={Boolean(errors.version)}
            />
            {errors.version ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errors.version}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pn-retention">Retention period (years)</Label>
            <Input
              id="pn-retention"
              type="number"
              min={1}
              max={100}
              value={retentionYears}
              onChange={(event) => setRetentionYears(event.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pn-org">Organisation</Label>
          <Input
            id="pn-org"
            value={organisation}
            onChange={(event) => setOrganisation(event.target.value)}
            disabled={!canManage}
            invalid={Boolean(errors.organisation)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pn-email">Contact email</Label>
            <Input
              id="pn-email"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              disabled={!canManage}
              invalid={Boolean(errors.contactEmail)}
            />
            {errors.contactEmail ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errors.contactEmail}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pn-phone">Contact phone</Label>
            <Input
              id="pn-phone"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pn-third">
            Third-party service providers{" "}
            <span className="font-normal text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea
            id="pn-third"
            rows={4}
            value={thirdParties}
            onChange={(event) => setThirdParties(event.target.value)}
            disabled={!canManage}
          />
        </div>

        {canManage ? (
          <Button onClick={handleSave} disabled={busy}>
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save privacy notice
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FormSettingsForm({
  initial,
  canManage,
}: {
  initial: FormSettings;
  canManage: boolean;
}) {
  const router = useRouter();
  const [settings, setSettings] = React.useState(initial);
  const [maxUploadMb, setMaxUploadMb] = React.useState(
    String(Math.round(initial.maxUploadBytes / (1024 * 1024)))
  );
  const [busy, setBusy] = React.useState(false);

  const handleSave = async () => {
    setBusy(true);

    const result: SettingsActionResult = await updateFormSettingsAction({
      ...settings,
      maxUploadBytes: Math.max(
        100_000,
        Math.round((Number(maxUploadMb) || 5) * 1024 * 1024)
      ),
    });

    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The form settings were updated.");
      router.refresh();
    } else {
      toast.error(result.message ?? "The form settings could not be updated.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public registration form</CardTitle>
        <CardDescription>
          Controls the behaviour of the public registration form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ToggleRow
          id="fs-address"
          label="Residential address is required"
          description="Members must provide a residential address."
          checked={settings.requireAddress}
          onChange={(value) =>
            setSettings((current) => ({ ...current, requireAddress: value }))
          }
          disabled={!canManage}
        />
        <ToggleRow
          id="fs-children"
          label="Allow child registrations"
          description="When off, child registrations are closed and members are directed to the church office."
          checked={settings.acceptsChildren}
          onChange={(value) =>
            setSettings((current) => ({ ...current, acceptsChildren: value }))
          }
          disabled={!canManage}
        />
        <ToggleRow
          id="fs-guardian"
          label="Require parent or guardian consent for children"
          checked={settings.requireGuardianConsent}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              requireGuardianConsent: value,
            }))
          }
          disabled={!canManage}
        />
        <ToggleRow
          id="fs-phones"
          label="Allow additional phone numbers"
          checked={settings.allowAdditionalPhones}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              allowAdditionalPhones: value,
            }))
          }
          disabled={!canManage}
        />
        <ToggleRow
          id="fs-suggestions"
          label="Allow suggestions or observations"
          description="Members can add general church-related suggestions."
          checked={settings.allowSuggestions}
          onChange={(value) =>
            setSettings((current) => ({ ...current, allowSuggestions: value }))
          }
          disabled={!canManage}
        />

        <div className="space-y-2">
          <Label htmlFor="fs-upload">Maximum photograph size (MB)</Label>
          <Input
            id="fs-upload"
            type="number"
            min={1}
            max={20}
            value={maxUploadMb}
            onChange={(event) => setMaxUploadMb(event.target.value)}
            disabled={!canManage}
            className="max-w-40"
          />
          <p className="text-sm text-muted-foreground">
            Photographs larger than this are rejected on both the client and
            the server.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fs-success">Success message</Label>
          <Textarea
            id="fs-success"
            rows={2}
            value={settings.successMessage}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                successMessage: event.target.value,
              }))
            }
            disabled={!canManage}
          />
        </div>

        {canManage ? (
          <Button onClick={handleSave} disabled={busy}>
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save form settings
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RetentionForm({
  initial,
  canManage,
}: {
  initial: {
    memberYears: number;
    deletedRecordMonths: number;
    photoDeletionOnPermanentDelete: boolean;
  };
  canManage: boolean;
}) {
  const router = useRouter();
  const [memberYears, setMemberYears] = React.useState(
    String(initial.memberYears)
  );
  const [deletedRecordMonths, setDeletedRecordMonths] = React.useState(
    String(initial.deletedRecordMonths)
  );
  const [photoDeletion, setPhotoDeletion] = React.useState(
    initial.photoDeletionOnPermanentDelete
  );
  const [busy, setBusy] = React.useState(false);

  const handleSave = async () => {
    setBusy(true);

    const result: SettingsActionResult = await updateRetentionPolicyAction({
      memberYears: Number(memberYears) || 7,
      deletedRecordMonths: Number(deletedRecordMonths) || 24,
      photoDeletionOnPermanentDelete: photoDeletion,
    });

    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The retention policy was updated.");
      router.refresh();
    } else {
      toast.error(result.message ?? "The retention policy could not be updated.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data retention policy</CardTitle>
        <CardDescription>
          How long member records and photographs are retained before they are
          permanently removed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rp-years">Keep member records for (years)</Label>
            <Input
              id="rp-years"
              type="number"
              min={1}
              max={100}
              value={memberYears}
              onChange={(event) => setMemberYears(event.target.value)}
              disabled={!canManage}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rp-months">
              Keep deleted records for (months)
            </Label>
            <Input
              id="rp-months"
              type="number"
              min={1}
              max={120}
              value={deletedRecordMonths}
              onChange={(event) => setDeletedRecordMonths(event.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>

        <ToggleRow
          id="rp-photo"
          label="Delete the photograph when a record is permanently deleted"
          checked={photoDeletion}
          onChange={setPhotoDeletion}
          disabled={!canManage}
        />

        {canManage ? (
          <Button onClick={handleSave} disabled={busy}>
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save retention policy
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border-2 border-border p-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer text-base">
          {label}
        </Label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-1 shrink-0"
      />
    </div>
  );
}
