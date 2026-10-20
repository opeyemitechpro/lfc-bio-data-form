"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Printer, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMemberAction,
  purgeMemberAction,
  restoreMemberAction,
} from "@/app/dashboard/members/actions";

interface MemberActionsProps {
  memberId: string;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  isDeleted?: boolean;
}

export function MemberActions({
  memberId,
  canDelete,
  canPrint,
  isDeleted = false,
}: MemberActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [purgeOpen, setPurgeOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const handleDelete = async () => {
    setBusy(true);
    const result = await deleteMemberAction(memberId, reason);
    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The member record was deleted.");
      setDeleteOpen(false);
      setReason("");
      router.refresh();
    } else {
      toast.error(result.message ?? "The member record could not be deleted.");
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    const result = await restoreMemberAction(memberId);
    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The member record was restored.");
      router.refresh();
    } else {
      toast.error(result.message ?? "The member record could not be restored.");
    }
  };

  const handlePurge = async () => {
    setBusy(true);
    const result = await purgeMemberAction(memberId, confirmation);
    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The member record was permanently removed.");
      setPurgeOpen(false);
      router.push("/dashboard/members");
    } else {
      toast.error(result.message ?? "The member record could not be removed.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canPrint ? (
        <Button asChild variant="outline" size="sm">
          <a href={`/dashboard/members/${memberId}/card`} target="_blank" rel="noreferrer">
            <Printer aria-hidden="true" />
            Member card
          </a>
        </Button>
      ) : null}

      {isDeleted && canDelete ? (
        <Button variant="outline" size="sm" onClick={handleRestore} disabled={busy}>
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Undo2 aria-hidden="true" />
          )}
          Restore record
        </Button>
      ) : null}

      {!isDeleted && canDelete ? (
        <>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 aria-hidden="true" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this member record?</DialogTitle>
                <DialogDescription>
                  The record will be removed from the directory but kept in a
                  recoverable state, so an administrator can restore it. The
                  photograph is not deleted at this stage.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="delete-reason">
                  Reason for deletion{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="delete-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Duplicate record, member requested removal"
                  maxLength={500}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : null}
                  Delete record
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Permanently delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Permanently delete this record?</DialogTitle>
                <DialogDescription>
                  This removes the record and its photograph permanently. It
                  cannot be undone. Use this only when the church&apos;s
                  retention policy requires it.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="purge-confirmation">
                  Type <strong>DELETE PERMANENTLY</strong> to confirm
                </Label>
                <Input
                  id="purge-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPurgeOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handlePurge}
                  disabled={busy || confirmation !== "DELETE PERMANENTLY"}
                >
                  {busy ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : null}
                  Permanently delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
