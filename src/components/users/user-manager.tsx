"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldOff,
  ShieldCheck,
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
  createUserAction,
  reactivateUserAction,
  resetUserPasswordAction,
  suspendUserAction,
  updateUserAction,
  type UserActionResult,
} from "@/app/dashboard/users/actions";
import type { AppUser, RoleDefinition, ServiceUnitOption } from "@/lib/types";

interface UserManagerProps {
  users: AppUser[];
  roles: RoleDefinition[];
  serviceUnits: ServiceUnitOption[];
  canManage: boolean;
  canActivate: boolean;
}

export function UserManager({
  users,
  roles,
  serviceUnits,
  canManage,
  canActivate,
}: UserManagerProps) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<AppUser | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleSuspend = async (user: AppUser) => {
    setBusyId(user.id);
    const result: UserActionResult = await suspendUserAction(user.id);
    setBusyId(null);

    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message ?? "The account could not be suspended.");
    }
  };

  const handleReactivate = async (user: AppUser) => {
    setBusyId(user.id);
    const result: UserActionResult = await reactivateUserAction(user.id);
    setBusyId(null);

    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message ?? "The account could not be reactivated.");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Administrator accounts</CardTitle>
            <CardDescription>
              Accounts that can sign in to this dashboard. The hidden
              superadmin principal is managed separately and never appears
              here.
            </CardDescription>
          </div>
          {canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              Add user
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              No administrator accounts have been created yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((user) => (
                <li key={user.id} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {user.full_name ?? user.email}
                      {user.status === "suspended" ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : null}
                      {user.must_change_password ? (
                        <Badge variant="warning">Must change password</Badge>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {user.role_names && user.role_names.length > 0 ? (
                        user.role_names.map((roleName) => (
                          <Badge key={roleName} variant="secondary">
                            {roleName}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">No role assigned</Badge>
                      )}
                      {user.service_unit_scope_ids &&
                      user.service_unit_scope_ids.length > 0 ? (
                        <Badge variant="outline">
                          Scoped to {user.service_unit_scope_ids.length} unit
                          {user.service_unit_scope_ids.length === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last signed in:{" "}
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleString("en-NG")
                        : "Never"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canManage ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(user)}
                      >
                        <Pencil aria-hidden="true" />
                        Edit
                      </Button>
                    ) : null}

                    {canActivate ? (
                      user.status === "suspended" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivate(user)}
                          disabled={busyId === user.id}
                        >
                          {busyId === user.id ? (
                            <Loader2 className="animate-spin" aria-hidden="true" />
                          ) : (
                            <ShieldCheck aria-hidden="true" />
                          )}
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleSuspend(user)}
                          disabled={busyId === user.id}
                        >
                          {busyId === user.id ? (
                            <Loader2 className="animate-spin" aria-hidden="true" />
                          ) : (
                            <ShieldOff aria-hidden="true" />
                          )}
                          Suspend
                        </Button>
                      )
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <UserDialog
        key={editing?.id ?? (creating ? "new" : "closed")}
        user={creating ? null : editing}
        open={creating || editing !== null}
        roles={roles}
        serviceUnits={serviceUnits}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </>
  );
}

function UserDialog({
  user,
  open,
  roles,
  serviceUnits,
  onClose,
}: {
  user: AppUser | null;
  open: boolean;
  roles: RoleDefinition[];
  serviceUnits: ServiceUnitOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(user);

  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [temporaryPassword, setTemporaryPassword] = React.useState("");
  const [roleIds, setRoleIds] = React.useState<string[]>(user?.role_ids ?? []);
  const [scopeIds, setScopeIds] = React.useState<string[]>(
    user?.service_unit_scope_ids ?? []
  );
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setBusy(true);
    setErrors({});

    const result: UserActionResult = isEditing
      ? await updateUserAction({
          userId: user?.id,
          fullName,
          roleIds,
          serviceUnitScopeIds: scopeIds,
        })
      : await createUserAction({
          email,
          fullName,
          temporaryPassword,
          roleIds,
          serviceUnitScopeIds: scopeIds,
        });

    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      onClose();
      router.refresh();
    } else {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message ?? "The account could not be saved.");
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;

    const password = window.prompt(
      "Enter a new temporary password (at least 12 characters, with a letter and a number):"
    );
    if (!password) return;

    setBusy(true);
    const result = await resetUserPasswordAction(user.id, password);
    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The password was reset.");
    } else {
      toast.error(result.message ?? "The password could not be reset.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit administrator" : "Add administrator"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the display name, roles and record access scope."
              : "A temporary password is issued and must be changed at first sign-in."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email address</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  invalid={Boolean(errors.email)}
                />
                {errors.email ? (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-password">Temporary password</Label>
                <Input
                  id="user-password"
                  type="text"
                  value={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                  invalid={Boolean(errors.temporaryPassword)}
                  autoComplete="off"
                />
                {errors.temporaryPassword ? (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {errors.temporaryPassword}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    At least 12 characters, with a letter and a number. Share it
                    securely — the user must change it at first sign-in.
                  </p>
                )}
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="user-name">Full name</Label>
            <Input
              id="user-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={200}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Roles</legend>
            <p className="text-sm text-muted-foreground">
              Permissions are inherited from the assigned roles.
            </p>
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={roleIds.includes(role.id)}
                    onCheckedChange={(checked) =>
                      setRoleIds((current) =>
                        checked
                          ? [...current, role.id]
                          : current.filter((id) => id !== role.id)
                      )
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor={`role-${role.id}`} className="cursor-pointer">
                      {role.name}
                    </Label>
                    {role.description ? (
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Record access scope</legend>
            <p className="text-sm text-muted-foreground">
              Leave empty to give access to every member record. When a scope
              is set, the user only sees members assigned to those units.
            </p>
            <div className="space-y-2">
              {serviceUnits.map((unit) => (
                <div key={unit.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`scope-${unit.id}`}
                    checked={scopeIds.includes(unit.id)}
                    onCheckedChange={(checked) =>
                      setScopeIds((current) =>
                        checked
                          ? [...current, unit.id]
                          : current.filter((id) => id !== unit.id)
                      )
                    }
                  />
                  <Label htmlFor={`scope-${unit.id}`} className="cursor-pointer">
                    {unit.name}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>

          {isEditing ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleResetPassword}
              disabled={busy}
            >
              <KeyRound aria-hidden="true" />
              Issue a new temporary password
            </Button>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            <X aria-hidden="true" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {isEditing ? "Save changes" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
