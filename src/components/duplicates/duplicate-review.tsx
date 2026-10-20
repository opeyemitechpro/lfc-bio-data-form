"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Undo2, UserX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  resolveDuplicateAction,
  reopenDuplicateAction,
} from "@/app/dashboard/duplicates/actions";
import type { DuplicateFlag, MemberRecord } from "@/lib/types";

interface DuplicateReviewProps {
  flag: DuplicateFlag;
  canResolve: boolean;
}

/** Side-by-side comparison of two member records flagged as possible duplicates. */
export function DuplicateReview({ flag, canResolve }: DuplicateReviewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [decision, setDecision] = React.useState<"confirmed" | "distinct">("distinct");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const memberA = flag.member_a;
  const memberB = flag.member_b;

  const handleResolve = async () => {
    setBusy(true);
    const result = await resolveDuplicateAction({
      flagId: flag.id,
      decision,
      notes,
    });
    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The duplicate alert was resolved.");
      setDialogOpen(false);
      router.refresh();
    } else {
      toast.error(result.message ?? "The duplicate alert could not be resolved.");
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    const result = await reopenDuplicateAction(flag.id);
    setBusy(false);

    if (result.ok) {
      toast.success(result.message ?? "The duplicate alert was reopened.");
      router.refresh();
    } else {
      toast.error(result.message ?? "The duplicate alert could not be reopened.");
    }
  };

  if (!memberA || !memberB) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        One of the records in this alert is no longer available to you.
      </div>
    );
  }

  return (
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/50 px-5 py-3">
        <div>
          <p className="font-semibold">{flag.match_reason}</p>
          <p className="text-sm text-muted-foreground">
            Match confidence: {Number(flag.match_score)}% · Flagged{" "}
            {new Date(flag.created_at).toLocaleDateString("en-NG")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {flag.status === "pending" ? (
            <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
              Awaiting review
            </span>
          ) : (
            <span
              className={
                flag.status === "confirmed"
                  ? "rounded-full bg-primary/12 px-3 py-1 text-xs font-bold text-primary"
                  : "rounded-full bg-success/12 px-3 py-1 text-xs font-bold text-success"
              }
            >
              {flag.status === "confirmed" ? "Same person" : "Different people"}
            </span>
          )}
        </div>
      </header>

      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <MemberColumn member={memberA} label="Record A" />
        <MemberColumn member={memberB} label="Record B" />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-sm text-muted-foreground">
          {flag.notes ? (
            <span>
              <span className="font-semibold">Reviewer note:</span> {flag.notes}
            </span>
          ) : (
            "No records are merged or deleted automatically. A merge is a separate, audited action."
          )}
        </p>

        {canResolve ? (
          flag.status === "pending" ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              Review this match
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReopen}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Undo2 aria-hidden="true" />
              )}
              Reopen for review
            </Button>
          )
        ) : null}
      </footer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve this duplicate alert</DialogTitle>
            <DialogDescription>
              Compare the two records and decide whether they belong to the
              same person.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-3">
            <legend className="sr-only">Resolution decision</legend>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 ${
                decision === "distinct"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <input
                type="radio"
                name="decision"
                value="distinct"
                checked={decision === "distinct"}
                onChange={() => setDecision("distinct")}
                className="mt-1 size-5"
              />
              <span>
                <span className="flex items-center gap-2 font-bold">
                  <UserX className="size-4" aria-hidden="true" />
                  These are two different people
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Both records stay active. The alert is closed.
                </span>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 ${
                decision === "confirmed"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <input
                type="radio"
                name="decision"
                value="confirmed"
                checked={decision === "confirmed"}
                onChange={() => setDecision("confirmed")}
                className="mt-1 size-5"
              />
              <span>
                <span className="flex items-center gap-2 font-bold">
                  <Check className="size-4" aria-hidden="true" />
                  These are the same person
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  The alert is closed and flagged for merging. Nothing is
                  deleted until an administrator performs the merge.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="duplicate-notes">
              Reviewer note{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="duplicate-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Same person; the second record was created by a family member."
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={busy}>
              {busy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Save decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function MemberColumn({
  member,
  label,
}: {
  member: MemberRecord;
  label: string;
}) {
  return (
    <div className="p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <dl className="space-y-2.5 text-sm">
        <CompareRow label="Full name" value={member.full_name} />
        <CompareRow label="Reference" value={member.reference_no} mono />
        <CompareRow label="Title" value={member.title_name ?? "—"} />
        <CompareRow label="Gender" value={member.gender} />
        <CompareRow label="Age group" value={member.age_category} />
        <CompareRow
          label="Primary phone"
          value={member.primary_phone}
          highlight
        />
        <CompareRow
          label="WhatsApp"
          value={
            member.whatsapp_same_as_primary
              ? "Same as primary phone"
              : member.whatsapp_phone ?? "—"
          }
        />
        <CompareRow label="Email" value={member.email ?? "—"} />
        <CompareRow
          label="Address"
          value={member.residential_address ?? "—"}
        />
        <CompareRow
          label="Service units"
          value={
            member.service_units.length > 0
              ? member.service_units.map((unit) => unit.name).join(", ")
              : "—"
          }
        />
        <CompareRow label="Duration" value={member.membership_duration} />
        <CompareRow
          label="Registered"
          value={new Date(member.created_at).toLocaleDateString("en-NG")}
        />
      </dl>
    </div>
  );
}

function CompareRow({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-1.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "text-right font-mono text-xs"
            : highlight
              ? "text-right font-semibold"
              : "text-right font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}
