import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Clock,
  UserPlus,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, ProportionRing, TrendChart } from "@/components/dashboard/charts";
import { MemberPhoto } from "@/components/members/member-photo";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview",
};


export default async function DashboardOverviewPage() {
  const context = await requireAdmin();
  const stats = await getDashboardStats(context);

  const canViewPhotos =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_VIEW_PHOTO);
  const canViewDuplicates =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.DUPLICATES_VIEW);
  const canCreateMembers =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_CREATE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Dashboard overview
          </h1>
          <p className="mt-1 text-muted-foreground">
            A summary of the membership register for Living Faith Church
            International — Laderin-Hilltop.
          </p>
        </div>
        {canCreateMembers ? (
          <Button asChild>
            <Link href="/dashboard/members/new">
              <UserPlus aria-hidden="true" />
              Register a member
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Key figures */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total members"
          value={stats.totalMembers}
          icon={Users}
          description={`${stats.activeMembers} active records`}
        />
        <StatCard
          label="With photograph"
          value={stats.withPhoto}
          icon={Camera}
          description={`${stats.withoutPhoto} without a photograph`}
        />
        {canViewDuplicates ? (
          <StatCard
            label="Duplicates to review"
            value={stats.pendingDuplicates}
            icon={AlertTriangle}
            description="Possible duplicate records awaiting review"
            emphasis={stats.pendingDuplicates > 0}
          />
        ) : (
          <StatCard
            label="Without photograph"
            value={stats.withoutPhoto}
            icon={CameraOff}
            description="Members still to capture a photo"
          />
        )}
        <StatCard
          label="Registered this month"
          value={stats.totalTrend.at(-1)?.count ?? 0}
          icon={Clock}
          description="New registrations in the current month"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Registration trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Registration trend</CardTitle>
            <CardDescription>
              New members registered over the last six months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={stats.totalTrend} />
          </CardContent>
        </Card>

        {/* Photographs */}
        <Card>
          <CardHeader>
            <CardTitle>Photographs</CardTitle>
            <CardDescription>
              How many members have a passport photograph on file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProportionRing
              value={stats.withPhoto}
              total={stats.withPhoto + stats.withoutPhoto}
              label="Members photographed"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>By age category</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.byAgeCategory}
              description="Member count by age category"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By gender</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.byGender}
              description="Member count by gender"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By membership duration</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.byMembershipDuration}
              description="Member count by membership duration"
            />
          </CardContent>
        </Card>
      </div>

      {/* Service units */}
      {stats.byServiceUnit.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Members by service unit</CardTitle>
            <CardDescription>
              A member may belong to more than one unit, so these figures can
              exceed the total number of members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.byServiceUnit}
              description="Member count by service unit"
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Recent registrations */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recently registered</CardTitle>
            <CardDescription>The ten most recent registrations.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/members">View all members</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentMembers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-semibold">No registrations yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Member records will appear here as people register.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentMembers.map((member) => (
                <li key={member.id}>
                  <Link
                    href={`/dashboard/members/${member.id}`}
                    className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
                  >
                    <MemberPhoto
                      publicId={canViewPhotos ? member.photo_public_id : null}
                      alt={`Photograph of ${member.full_name}`}
                      fallbackText={member.full_name}
                      className="size-12 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{member.full_name}</p>
                      <p className="truncate font-mono text-sm text-muted-foreground">
                        {member.reference_no}
                      </p>
                    </div>
                    <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                      {formatDate(member.created_at)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  description,
  emphasis = false,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  emphasis?: boolean;
}) {
  return (
    <Card className={emphasis ? "border-2 border-warning/50" : undefined}>
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className={
            emphasis
              ? "flex size-12 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning"
              : "flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          }
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {value.toLocaleString("en-NG")}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
