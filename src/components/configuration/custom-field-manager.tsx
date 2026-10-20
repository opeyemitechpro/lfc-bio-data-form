"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  reorderCustomFieldAction,
  saveCustomFieldAction,
  toggleCustomFieldAction,
  type CustomFieldActionResult,
} from "@/app/dashboard/custom-fields/actions";
import type { CustomFieldDefinition, CustomFieldType } from "@/lib/types";

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "select", label: "Dropdown / select" },
  { value: "multi_select", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "telephone", label: "Telephone" },
  { value: "yes_no", label: "Yes / No" },
];

interface CustomFieldManagerProps {
  fields: CustomFieldDefinition[];
}

export function CustomFieldManager({ fields }: CustomFieldManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<CustomFieldDefinition | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSave = async (values: Record<string, unknown>) => {
    setBusy(true);
    setErrors({});

    const result: CustomFieldActionResult = await saveCustomFieldAction(values);
    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The field was saved.");
      setEditing(null);
      setCreating(false);
      router.refresh();
    } else {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message ?? "The field could not be saved.");
    }
  };

  const handleToggle = async (field: CustomFieldDefinition, isActive: boolean) => {
    const result = await toggleCustomFieldAction(field.id, isActive);
    if (result.ok) {
      toast.success(result.message ?? "The field was updated.");
      router.refresh();
    } else {
      toast.error(result.message ?? "The field could not be updated.");
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const result = await reorderCustomFieldAction(id, direction);
    if (result.ok) {
      router.refresh();
    } else {
      toast.error(result.message ?? "The order could not be changed.");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Custom fields</CardTitle>
            <CardDescription>
              Additional questions stored on the member record. Changes apply
              to the registration form without a redeploy.
            </CardDescription>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Add field
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              No custom fields have been defined yet. Add one to collect extra
              information from members.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {fields.map((field, index) => (
                <li key={field.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {field.label}
                      <Badge variant="outline">
                        {FIELD_TYPES.find((t) => t.value === field.field_type)?.label ??
                          field.field_type}
                      </Badge>
                      {field.is_required ? (
                        <Badge variant="default">Required</Badge>
                      ) : null}
                      {!field.is_active ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : null}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {field.field_key}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {field.show_on_public_form ? (
                        <Badge variant="accent">Public form</Badge>
                      ) : null}
                      {field.show_on_profile ? (
                        <Badge variant="secondary">Profile</Badge>
                      ) : null}
                      {field.show_on_card ? (
                        <Badge variant="secondary">Card</Badge>
                      ) : null}
                      {field.show_in_table ? (
                        <Badge variant="secondary">Table</Badge>
                      ) : null}
                      {field.show_in_export ? (
                        <Badge variant="secondary">Export</Badge>
                      ) : null}
                      {field.is_sensitive ? (
                        <Badge variant="warning">Sensitive</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${field.label} up`}
                      disabled={index === 0}
                      onClick={() => handleReorder(field.id, "up")}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${field.label} down`}
                      disabled={index === fields.length - 1}
                      onClick={() => handleReorder(field.id, "down")}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setErrors({});
                        setEditing(field);
                      }}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                    <div className="ml-2 flex items-center gap-2">
                      <Label
                        htmlFor={`active-${field.id}`}
                        className="cursor-pointer text-sm"
                      >
                        {field.is_active ? "Active" : "Inactive"}
                      </Label>
                      <Switch
                        id={`active-${field.id}`}
                        checked={field.is_active}
                        onCheckedChange={(checked) => handleToggle(field, checked)}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            Deactivating a field hides it from new registrations but keeps every
            value already collected.
          </p>
        </CardContent>
      </Card>

      <CustomFieldDialog
        key={editing?.id ?? (creating ? "new" : "closed")}
        field={creating ? null : editing}
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
          setErrors({});
        }}
        onSave={handleSave}
        busy={busy}
        errors={errors}
      />
    </>
  );
}

function CustomFieldDialog({
  field,
  open,
  onClose,
  onSave,
  busy,
  errors,
}: {
  field: CustomFieldDefinition | null;
  open: boolean;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => void;
  busy: boolean;
  errors: Record<string, string>;
}) {
  const [label, setLabel] = React.useState(field?.label ?? "");
  const [fieldKey, setFieldKey] = React.useState(field?.field_key ?? "");
  const [fieldType, setFieldType] = React.useState<CustomFieldType>(
    field?.field_type ?? "short_text"
  );
  const [helpText, setHelpText] = React.useState(field?.help_text ?? "");
  const [isRequired, setIsRequired] = React.useState(field?.is_required ?? false);
  const [optionsText, setOptionsText] = React.useState(
    field?.options?.join("\n") ?? ""
  );
  const [showOnPublicForm, setShowOnPublicForm] = React.useState(
    field?.show_on_public_form ?? false
  );
  const [showOnProfile, setShowOnProfile] = React.useState(
    field?.show_on_profile ?? true
  );
  const [showOnCard, setShowOnCard] = React.useState(field?.show_on_card ?? false);
  const [showInTable, setShowInTable] = React.useState(
    field?.show_in_table ?? false
  );
  const [showInExport, setShowInExport] = React.useState(
    field?.show_in_export ?? false
  );
  const [isSensitive, setIsSensitive] = React.useState(field?.is_sensitive ?? false);
  const [requiredPermission, setRequiredPermission] = React.useState(
    field?.required_permission ?? ""
  );
  const [minLength, setMinLength] = React.useState(
    field?.validation?.min_length?.toString() ?? ""
  );
  const [maxLength, setMaxLength] = React.useState(
    field?.validation?.max_length?.toString() ?? ""
  );

  const needsOptions =
    fieldType === "select" || fieldType === "multi_select" || fieldType === "yes_no";

  const handleSubmit = () => {
    const options = optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ label: line, value: line }));

    onSave({
      id: field?.id,
      field_key:
        fieldKey ||
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, ""),
      label: label.trim(),
      field_type: fieldType,
      help_text: helpText.trim() || null,
      is_required: isRequired,
      default_value: null,
      options,
      validation: {
        ...(minLength ? { min_length: Number(minLength) } : {}),
        ...(maxLength ? { max_length: Number(maxLength) } : {}),
      },
      sort_order: field?.sort_order ?? 0,
      is_active: field?.is_active ?? true,
      show_on_public_form: showOnPublicForm,
      show_on_profile: showOnProfile,
      show_on_card: showOnCard,
      show_in_table: showInTable,
      show_in_export: showInExport,
      is_sensitive: isSensitive,
      required_permission: requiredPermission.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {field ? "Edit" : "Add"} custom field
          </DialogTitle>
          <DialogDescription>
            The field key is stored as a plain identifier and cannot contain
            code or expressions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cf-label">Display label</Label>
              <Input
                id="cf-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                invalid={Boolean(errors.label)}
                maxLength={120}
              />
              {errors.label ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errors.label}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cf-key">Field key</Label>
              <Input
                id="cf-key"
                value={fieldKey}
                onChange={(event) => setFieldKey(event.target.value)}
                placeholder="e.g. baptism_year"
                invalid={Boolean(errors.field_key)}
                disabled={Boolean(field)}
                className="font-mono"
              />
              {errors.field_key ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errors.field_key}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {field
                    ? "The key cannot be changed once created."
                    : "Lowercase letters, numbers and underscores."}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cf-type">Field type</Label>
              <Select
                value={fieldType}
                onValueChange={(value) => setFieldType(value as CustomFieldType)}
              >
                <SelectTrigger id="cf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cf-help">Help text</Label>
              <Input
                id="cf-help"
                value={helpText}
                onChange={(event) => setHelpText(event.target.value)}
                maxLength={400}
              />
            </div>
          </div>

          {needsOptions ? (
            <div className="space-y-2">
              <Label htmlFor="cf-options">Options</Label>
              <textarea
                id="cf-options"
                value={optionsText}
                onChange={(event) => setOptionsText(event.target.value)}
                rows={4}
                className="w-full rounded-lg border-2 border-input bg-background px-4 py-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
                placeholder={"One option per line"}
              />
              {errors.options ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errors.options}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  One option per line.
                </p>
              )}
            </div>
          ) : null}

          {fieldType === "short_text" || fieldType === "long_text" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cf-min">Minimum length</Label>
                <Input
                  id="cf-min"
                  type="number"
                  min={0}
                  value={minLength}
                  onChange={(event) => setMinLength(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-max">Maximum length</Label>
                <Input
                  id="cf-max"
                  type="number"
                  min={1}
                  value={maxLength}
                  onChange={(event) => setMaxLength(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-lg border-2 border-border p-4">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Visibility
            </p>

            <ToggleRow
              id="cf-required"
              label="Required"
              description="The member must complete this field."
              checked={isRequired}
              onChange={setIsRequired}
            />
            <ToggleRow
              id="cf-public"
              label="Show on the public registration form"
              description="Members see and complete this field when registering."
              checked={showOnPublicForm}
              onChange={setShowOnPublicForm}
            />
            <ToggleRow
              id="cf-profile"
              label="Show on the member profile"
              checked={showOnProfile}
              onChange={setShowOnProfile}
            />
            <ToggleRow
              id="cf-card"
              label="Show on the member card"
              checked={showOnCard}
              onChange={setShowOnCard}
            />
            <ToggleRow
              id="cf-table"
              label="Show in the directory table and printed table"
              checked={showInTable}
              onChange={setShowInTable}
            />
            <ToggleRow
              id="cf-export"
              label="Include in CSV, Excel and PDF exports"
              checked={showInExport}
              onChange={setShowInExport}
            />
            <ToggleRow
              id="cf-sensitive"
              label="Sensitive — requires an extra permission to view"
              description="Only users with the named permission can see the value."
              checked={isSensitive}
              onChange={setIsSensitive}
            />

            {isSensitive ? (
              <div className="space-y-2">
                <Label htmlFor="cf-permission">Required permission key</Label>
                <Input
                  id="cf-permission"
                  value={requiredPermission}
                  onChange={(event) => setRequiredPermission(event.target.value)}
                  placeholder="e.g. members.view_photo"
                  className="font-mono"
                />
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            <X aria-hidden="true" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={busy || label.trim().length === 0}
          >
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <div>
        <Label htmlFor={id} className="cursor-pointer text-base">
          {label}
        </Label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
