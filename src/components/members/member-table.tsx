"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Printer, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberPhoto } from "@/components/members/member-photo";
import {
  AGE_CATEGORY_LABELS,
  GENDER_LABELS,
  MEMBERSHIP_DURATION_LABELS,
  type MemberListItem,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface MemberTableProps {
  members: MemberListItem[];
  canViewPhotos: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  onDelete?: (member: MemberListItem) => void;
}

/**
 * The desktop member table.
 *
 * On small screens the page switches to the card layout instead of
 * forcing a horizontally scrolling table.
 */
export function MemberTable({
  members,
  canViewPhotos,
  canEdit,
  canDelete,
  canPrint,
  onDelete,
}: MemberTableProps) {
  return (
    <div className="hidden rounded-xl border bg-card shadow-sm md:block">
      <Table className="print-table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Photo</TableHead>
            <TableHead>Full name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Age group</TableHead>
            <TableHead>Primary phone</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Service units</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead className="w-16 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <MemberPhoto
                  publicId={canViewPhotos ? member.photo_public_id : null}
                  alt={`Photograph of ${member.full_name}`}
                  fallbackText={member.full_name}
                  className="size-12"
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/members/${member.id}`}
                  className="font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  {member.full_name}
                </Link>
                <p className="font-mono text-xs text-muted-foreground">
                  {member.reference_no}
                </p>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {member.title_name ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {GENDER_LABELS[member.gender]}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {AGE_CATEGORY_LABELS[member.age_category].split(" (")[0]}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {member.primary_phone}
              </TableCell>
              <TableCell>
                {member.whatsapp_same_as_primary ? (
                  <Badge variant="success">Same as phone</Badge>
                ) : member.whatsapp_phone ? (
                  <span className="whitespace-nowrap text-sm">
                    {member.whatsapp_phone}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-48 truncate">
                {member.email ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex max-w-40 flex-wrap gap-1">
                  {member.service_units.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    member.service_units.map((unit) => (
                      <Badge key={unit.id} variant="secondary">
                        {unit.name}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {MEMBERSHIP_DURATION_LABELS[member.membership_duration]}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(member.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <RowActions
                  member={member}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canPrint={canPrint}
                  onDelete={onDelete}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** The mobile card layout used below the `md` breakpoint. */
export function MemberCardList({
  members,
  canViewPhotos,
  canEdit,
  canDelete,
  canPrint,
  onDelete,
}: MemberTableProps) {
  return (
    <ul className="space-y-3 md:hidden">
      {members.map((member) => (
        <li
          key={member.id}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex gap-3">
            <MemberPhoto
              publicId={canViewPhotos ? member.photo_public_id : null}
              alt={`Photograph of ${member.full_name}`}
              fallbackText={member.full_name}
              className="size-16 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/dashboard/members/${member.id}`}
                className="text-base font-bold leading-tight text-foreground underline-offset-2 hover:underline"
              >
                {member.full_name}
              </Link>
              <p className="font-mono text-xs text-muted-foreground">
                {member.reference_no}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {member.title_name ? (
                  <Badge variant="secondary">{member.title_name}</Badge>
                ) : null}
                <Badge variant="outline">
                  {AGE_CATEGORY_LABELS[member.age_category].split(" (")[0]}
                </Badge>
                <Badge variant="outline">{GENDER_LABELS[member.gender]}</Badge>
                {member.whatsapp_same_as_primary ? (
                  <Badge variant="success">WhatsApp</Badge>
                ) : null}
              </div>
            </div>
            <RowActions
              member={member}
              canEdit={canEdit}
              canDelete={canDelete}
              canPrint={canPrint}
              onDelete={onDelete}
            />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
            <div className="col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Primary phone
              </dt>
              <dd>{member.primary_phone}</dd>
            </div>
            {member.email ? (
              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Email
                </dt>
                <dd className="truncate">{member.email}</dd>
              </div>
            ) : null}
            {member.service_units.length > 0 ? (
              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Service units
                </dt>
                <dd className="flex flex-wrap gap-1 pt-1">
                  {member.service_units.map((unit) => (
                    <Badge key={unit.id} variant="secondary">
                      {unit.name}
                    </Badge>
                  ))}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Duration
              </dt>
              <dd>{MEMBERSHIP_DURATION_LABELS[member.membership_duration]}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Registered
              </dt>
              <dd>{formatDate(member.created_at)}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function RowActions({
  member,
  canEdit,
  canDelete,
  canPrint,
  onDelete,
}: {
  member: MemberListItem;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  onDelete?: (member: MemberListItem) => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${member.full_name}`}
          className="shrink-0"
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/members/${member.id}`}>
            <Eye aria-hidden="true" />
            View profile
          </Link>
        </DropdownMenuItem>
        {canEdit ? (
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/members/${member.id}?edit=1`}>
              <Pencil aria-hidden="true" />
              Edit member
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canPrint ? (
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/members/${member.id}/card`}>
              <Printer aria-hidden="true" />
              Print member card
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={() => {
                setMenuOpen(false);
                onDelete?.(member);
              }}
            >
              <Trash2 aria-hidden="true" />
              Delete member
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
