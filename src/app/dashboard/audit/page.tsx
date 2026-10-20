import type { Metadata } from "next";
import Link from "next/link";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createAdminSupabaseClient } from "@/lib/supabase/clients";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit logs",
};


interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const ACTION_LABELS: Record<string, string> = {
  "member.created": "Member created",
  "member.updated": "Member updated",
  "member.deleted": "Member deleted",
  "member.restored": "Member restored",
  "member.permanently_deleted": "Member permanently deleted",
  "member.photo_replaced": "Photograph replaced",
  "member.photo_removed": "Photograph removed",
  "user.created": "User created",
  "user.updated": "User updated",
  "user.suspended": "User suspended",
  "user.reactivated": "User reactivated",
  "role.created": "Role created",
  "role.updated": "Role updated",
  "role.deleted": "Role deleted",
  "role.permissions_changed": "Permissions changed",
  "custom_field.created": "Custom field created",
  "custom_field.updated": "Custom field updated",
  "service_unit.changed": "Service unit changed",
  "title.changed": "Title changed",
  "settings.changed": "Settings changed",
  "duplicate.resolved": "Duplicate resolved",
  "export.performed": "Export performed",
  "print.performed": "Print performed",
  "registration.received": "Public registration received",
  "auth.login_succeeded": "Sign in succeeded",
  "auth.login_failed": "Sign in failed",
  "auth.password_changed": "Password changed",
  "auth.password_reset_completed": "Password reset completed",
};

export default async function AuditPage({ searchParams }: PageProps) {
  const context = await requireAdmin();
  const params = await searchParams;

  const canView =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.AUDIT_VIEW);

  if (!canView) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to view the audit logs.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/dashboard">Back to the dashboard</Link>
        </Button>
      </div>
    );
  }

  const page = Math.max(1, Number.parseInt(first(params.page) || "1", 10) || 1);
  const action = first(params.action);
  const pageSize = 50;

  const admin = await createAdminSupabaseClient();

  let query = admin
    .from("audit_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (action) query = query.eq("action", action);

  const { data, error, count } = await query;
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit logs</CardTitle>
          <CardDescription>
            The audit trail could not be loaded.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Audit logs
        </h1>
        <p className="mt-1 text-muted-foreground">
          A record of significant administrative activity. Audit entries cannot
          be edited or deleted through the application.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            {total.toLocaleString("en-NG")} event{total === 1 ? "" : "s"} recorded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data && data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(event.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.action.includes("deleted")
                              ? "destructive"
                              : event.action.includes("login_failed")
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {ACTION_LABELS[event.action] ?? event.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.actor_email ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.entity_ref ?? event.entity_id ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-72">
                        <details>
                          <summary className="cursor-pointer text-sm font-semibold text-primary">
                            View
                          </summary>
                          <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                            {JSON.stringify(event.summary, null, 2)}
                          </pre>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              No audit events have been recorded yet.
            </p>
          )}

          {pageCount > 1 ? (
            <div className="mt-5 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                asChild
              >
                <Link
                  href={`/dashboard/audit?page=${page - 1}${action ? `&action=${action}` : ""}`}
                >
                  Previous
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                asChild
              >
                <Link
                  href={`/dashboard/audit?page=${page + 1}${action ? `&action=${action}` : ""}`}
                >
                  Next
                </Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
