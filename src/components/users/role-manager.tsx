"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  deleteRoleAction,
  saveRoleAction,
  type RoleActionResult,
} from "@/app/dashboard/roles/actions";
import type { PermissionDefinition, RoleDefinition } from "@/lib/types";

interface RoleManagerProps {
  roles: RoleDefinition[];
  permissions: PermissionDefinition[];
}

export function RoleManager({ roles, permissions }: RoleManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<RoleDefinition | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Group the permissions by category for a readable layout.
  const grouped = React.useMemo(() => {
    const map = new Map<string, PermissionDefinition[]>();
    for (const permission of permissions) {
      const list = map.get(permission.category) ?? [];
      list.push(permission);
      map.set(permission.category, list);
    }
    return map;
  }, [permissions]);

  const handleSave = async (values: {
    id?: string;
    name: string;
    description: string;
    permissionKeys: string[];
  }) => {
    setBusy(true);
    setErrors({});

    const result: RoleActionResult = await saveRoleAction(values);
    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The role was saved.");
      setEditing(null);
      setCreating(false);
      router.refresh();
    } else {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message ?? "The role could not be saved.");
    }
  };

  const handleDelete = async (role: RoleDefinition) => {
    if (
      !window.confirm(
        `Delete the role "${role.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    const result = await deleteRoleAction(role.id);
    if (result.ok) {
      toast.success(result.message ?? "The role was deleted.");
      router.refresh();
    } else {
      toast.error(result.message ?? "The role could not be deleted.");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              A role bundles permissions together. Users can hold one or more
              roles.
            </CardDescription>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Create role
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {roles.map((role) => (
              <li key={role.id} className="flex flex-wrap items-center gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {role.name}
                    {role.is_system ? (
                      <Badge variant="outline">Built-in</Badge>
                    ) : (
                      <Badge variant="secondary">Custom</Badge>
                    )}
                  </p>
                  {role.description ? (
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {role.permission_keys?.length ?? 0} permissions ·{" "}
                    {role.user_count ?? 0}{" "}
                    {role.user_count === 1 ? "user" : "users"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setErrors({});
                      setEditing(role);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                  {!role.is_system ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(role)}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <RoleDialog
        key={editing?.id ?? (creating ? "new" : "closed")}
        role={creating ? null : editing}
        open={creating || editing !== null}
        permissions={permissions}
        grouped={grouped}
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

function RoleDialog({
  role,
  open,
  permissions,
  grouped,
  onClose,
  onSave,
  busy,
  errors,
}: {
  role: RoleDefinition | null;
  open: boolean;
  permissions: PermissionDefinition[];
  grouped: Map<string, PermissionDefinition[]>;
  onClose: () => void;
  onSave: (values: {
    id?: string;
    name: string;
    description: string;
    permissionKeys: string[];
  }) => void;
  busy: boolean;
  errors: Record<string, string>;
}) {
  const [name, setName] = React.useState(role?.name ?? "");
  const [description, setDescription] = React.useState(role?.description ?? "");
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(role?.permission_keys ?? [])
  );

  const toggle = (key: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleCategory = (category: string, checked: boolean) => {
    const categoryPermissions = grouped.get(category) ?? [];
    setSelected((current) => {
      const next = new Set(current);
      for (const permission of categoryPermissions) {
        if (checked) next.add(permission.key);
        else next.delete(permission.key);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Edit role" : "Create a role"}</DialogTitle>
          <DialogDescription>
            Select the granular permissions this role grants. Access is denied
            by default — only what you tick is granted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Role name</Label>
            <Input
              id="role-name"
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

          <div className="space-y-2">
            <Label htmlFor="role-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              rows={2}
            />
          </div>

          <fieldset className="space-y-4">
            <legend className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Permissions
            </legend>

            {Array.from(grouped.entries()).map(([category, categoryPermissions]) => {
              const allSelected = categoryPermissions.every((permission) =>
                selected.has(permission.key)
              );

              return (
                <div
                  key={category}
                  className="rounded-lg border-2 border-border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-base font-bold capitalize">
                      {category.replace(/_/g, " ")}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategory(category, !allSelected)}
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </Button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {categoryPermissions.map((permission) => (
                      <div key={permission.key} className="flex items-start gap-3">
                        <Checkbox
                          id={`perm-${permission.key}`}
                          checked={selected.has(permission.key)}
                          onCheckedChange={(checked) =>
                            toggle(permission.key, checked === true)
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <Label
                            htmlFor={`perm-${permission.key}`}
                            className="cursor-pointer"
                          >
                            {permission.label}
                          </Label>
                          {permission.description ? (
                            <p className="text-sm text-muted-foreground">
                              {permission.description}
                            </p>
                          ) : null}
                          <p className="font-mono text-xs text-muted-foreground">
                            {permission.key}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </fieldset>

          <p className="text-sm text-muted-foreground">
            {selected.size} of {permissions.length} permissions selected.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            <X aria-hidden="true" />
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                id: role?.id,
                name: name.trim(),
                description: description.trim(),
                permissionKeys: Array.from(selected),
              })
            }
            disabled={busy || name.trim().length === 0}
          >
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
