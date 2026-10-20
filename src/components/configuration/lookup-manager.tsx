"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Save, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  reorderLookupAction,
  saveServiceUnitAction,
  saveTitleAction,
  type LookupActionResult,
} from "@/app/dashboard/configuration/actions";

export interface LookupItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
}

interface LookupManagerProps {
  kind: "service_units" | "titles";
  title: string;
  description: string;
  items: LookupItem[];
  /** The currently active filter, applied to the list. */
  showInactive?: boolean;
}

/**
 * Manages a configurable lookup list (service units or titles).
 *
 * Items are never hard-coded: the superadmin can add, rename, deactivate
 * and reorder them, and the changes take effect without a redeploy.
 */
export function LookupManager({
  kind,
  title,
  description,
  items,
  showInactive = true,
}: LookupManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<LookupItem | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const isServiceUnit = kind === "service_units";
  const saveAction = isServiceUnit ? saveServiceUnitAction : saveTitleAction;

  const handleSave = async (values: {
    id?: string;
    name: string;
    description?: string;
    is_active: boolean;
    sort_order: number;
  }) => {
    setBusy(true);
    setErrors({});

    const result: LookupActionResult = await saveAction(values);
    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      setEditing(null);
      setCreating(false);
      router.refresh();
    } else {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message ?? "The item could not be saved.");
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const result = await reorderLookupAction(kind, id, direction);
    if (result.ok) {
      router.refresh();
    } else {
      toast.error(result.message ?? "The order could not be changed.");
    }
  };

  const visible = showInactive ? items : items.filter((item) => item.is_active);

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Add new
          </Button>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              Nothing has been configured yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((item, index) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {item.name}
                      {!item.is_active ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : null}
                    </p>
                    {item.description ? (
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    <p className="font-mono text-xs text-muted-foreground">
                      {item.slug}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${item.name} up`}
                      disabled={index === 0}
                      onClick={() => handleReorder(item.id, "up")}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${item.name} down`}
                      disabled={index === visible.length - 1}
                      onClick={() => handleReorder(item.id, "down")}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setErrors({});
                        setEditing(item);
                      }}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            Inactive items are hidden from the public registration form but stay
            visible on historical member records.
          </p>
        </CardContent>
      </Card>

      <LookupDialog
        key={editing?.id ?? (creating ? "new" : "closed")}
        kind={kind}
        item={creating ? null : editing}
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

function LookupDialog({
  kind,
  item,
  open,
  onClose,
  onSave,
  busy,
  errors,
}: {
  kind: "service_units" | "titles";
  item: LookupItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (values: {
    id?: string;
    name: string;
    description?: string;
    is_active: boolean;
    sort_order: number;
  }) => void;
  busy: boolean;
  errors: Record<string, string>;
}) {
  const isServiceUnit = kind === "service_units";
  const [name, setName] = React.useState(item?.name ?? "");
  const [description, setDescription] = React.useState(
    item?.description ?? ""
  );
  const [isActive, setIsActive] = React.useState(item?.is_active ?? true);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit" : "Add"} {isServiceUnit ? "service unit" : "title"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Renaming keeps existing member assignments intact."
              : `The new ${
                  isServiceUnit ? "service unit" : "title"
                } becomes available on the public registration form immediately.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="lookup-name">Name</Label>
          <Input
            id="lookup-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            invalid={Boolean(errors.name)}
            maxLength={80}
          />
          {errors.name ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        {isServiceUnit ? (
          <div className="space-y-2">
            <Label htmlFor="lookup-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="lookup-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border-2 border-border p-4">
          <div>
            <Label htmlFor="lookup-active" className="cursor-pointer">
              Active
            </Label>
            <p className="text-sm text-muted-foreground">
              Inactive items are hidden from new registrations.
            </p>
          </div>
          <Switch
            id="lookup-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            <X aria-hidden="true" />
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                id: item?.id,
                name: name.trim(),
                description: description.trim(),
                is_active: isActive,
                sort_order: item?.sort_order ?? 0,
              })
            }
            disabled={busy || name.trim().length === 0}
          >
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
