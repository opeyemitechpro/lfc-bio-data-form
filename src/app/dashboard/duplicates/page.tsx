import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DuplicateReview } from "@/components/duplicates/duplicate-review";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listDuplicateFlags } from "@/lib/duplicates/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Duplicate review",
};


interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function DuplicatesPage({ searchParams }: PageProps) {
  const context = await requireAdmin();
  const params = await searchParams;

  const canView =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.DUPLICATES_VIEW);
  const canResolve =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.DUPLICATES_RESOLVE);

  if (!canView) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to review duplicate alerts.
        </p>
      </div>
    );
  }

  const statusParam = first(params.status) || "pending";
  const status = (
    ["pending", "confirmed", "distinct", "resolved", "all"] as const
  ).includes(statusParam as never)
    ? (statusParam as "pending" | "confirmed" | "distinct" | "resolved" | "all")
    : "pending";

  const { flags, total } = await listDuplicateFlags(context, status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Duplicate review
        </h1>
        <p className="mt-1 text-muted-foreground">
          Records that share a phone number, email address or name are flagged
          here for review. Nothing is ever merged or deleted automatically.
        </p>
      </div>

      <Tabs value={status}>
        <TabsList>
          <TabsTrigger value="pending" asChild>
            <Link href="/dashboard/duplicates?status=pending">Pending</Link>
          </TabsTrigger>
          <TabsTrigger value="confirmed" asChild>
            <Link href="/dashboard/duplicates?status=confirmed">Same person</Link>
          </TabsTrigger>
          <TabsTrigger value="distinct" asChild>
            <Link href="/dashboard/duplicates?status=distinct">Different people</Link>
          </TabsTrigger>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/duplicates?status=all">All</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {flags.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/12 text-success">
              <ShieldCheck className="size-7" aria-hidden="true" />
            </div>
            <CardTitle className="mt-3">Nothing to review</CardTitle>
            <CardDescription>
              {status === "pending"
                ? "There are no duplicate alerts waiting for review. New alerts appear here as registrations are received."
                : "No duplicate alerts match this filter."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/dashboard/members">Back to the directory</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "alert" : "alerts"}
          </p>
          <div className="space-y-5">
            {flags.map((flag) => (
              <DuplicateReview key={flag.id} flag={flag} canResolve={canResolve} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
