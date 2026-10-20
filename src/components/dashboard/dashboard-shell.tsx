"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Tags,
  Type,
  UserCog,
  Users,
  X,
} from "lucide-react";

import { ChurchLogo } from "@/components/brand/church-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import { signOutAction } from "@/app/login/actions";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** null means "always visible to any signed-in user". */
  permission: string | null;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: "/dashboard/members", label: "Member directory", icon: Users, permission: PERMISSIONS.MEMBERS_VIEW },
  { href: "/dashboard/members/new", label: "Register member", icon: ClipboardCheck, permission: PERMISSIONS.MEMBERS_CREATE },
  { href: "/dashboard/duplicates", label: "Duplicate review", icon: ShieldCheck, permission: PERMISSIONS.DUPLICATES_VIEW },
  { href: "/dashboard/service-units", label: "Service units", icon: Tags, permission: PERMISSIONS.SERVICE_UNITS_MANAGE },
  { href: "/dashboard/titles", label: "Titles", icon: Type, permission: PERMISSIONS.TITLES_MANAGE },
  { href: "/dashboard/custom-fields", label: "Custom fields", icon: Settings, permission: PERMISSIONS.CUSTOM_FIELDS_MANAGE },
  { href: "/dashboard/users", label: "User management", icon: UserCog, permission: PERMISSIONS.USERS_MANAGE },
  { href: "/dashboard/roles", label: "Roles & permissions", icon: ShieldCheck, permission: PERMISSIONS.ROLES_MANAGE },
  { href: "/dashboard/audit", label: "Audit logs", icon: ClipboardCheck, permission: PERMISSIONS.AUDIT_VIEW },
  { href: "/dashboard/settings", label: "Application settings", icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
];

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    email: string;
    name: string | null;
    isSuperadmin: boolean;
    roleNames: string[];
  };
  /** Permission keys the current user holds. */
  permissions: string[];
}

export function DashboardShell({
  children,
  user,
  permissions,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // The mobile drawer is closed on navigation. Using the pathname as a
  // key on the drawer avoids a state-reset effect.
  const closeOnNavigate = () => setMobileOpen(false);

  const isSuperadmin = user.isSuperadmin;
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === null || isSuperadmin || permissions.includes(item.permission)
  );

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (onNavigate?: () => void) => (
    <nav aria-label="Dashboard sections" className="space-y-1">
      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
            isActive(item.href)
              ? "bg-primary text-primary-foreground"
              : "text-white/80 hover:bg-white/10 hover:text-white"
          )}
        >
          <item.icon className="size-5 shrink-0" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  /** The desktop sidebar, without a navigation callback. */
  const desktopNav = nav();

  return (
    <div className="flex min-h-full flex-col bg-background">
      {/* Top bar */}
      <header className="app-header sticky top-0 z-40 border-b border-border bg-ink text-ink-foreground">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white lg:hidden"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
            <Link href="/dashboard" aria-label="Dashboard home">
              <ChurchLogo withWordmark inverted />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-white">
                {user.name ?? user.email}
              </p>
              <p className="text-xs text-white/70">
                {isSuperadmin
                  ? "Superadmin"
                  : user.roleNames.length > 0
                    ? user.roleNames.join(", ")
                    : "No role assigned"}
              </p>
            </div>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:text-white"
              >
                <LogOut aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="no-print hidden w-64 shrink-0 border-r border-border bg-ink p-4 lg:block">
          <div className="sticky top-20">
            {desktopNav}
            <div className="mt-6 border-t border-white/15 pt-4">
              <Link
                href="/account/change-password"
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <UserCog className="size-5 shrink-0" />
                Change password
              </Link>
            </div>
          </div>
        </aside>

        {/* Mobile drawer. The pathname key remounts it on navigation, so
            it is always closed after a route change without an effect. */}
        {mobileOpen ? (
          <div
            key={pathname}
            className="no-print fixed inset-0 z-50 lg:hidden"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close navigation menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-ink p-4">
              <div className="mb-4 flex items-center justify-between">
                <ChurchLogo withWordmark inverted />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 hover:text-white"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
              {nav(closeOnNavigate)}
              <div className="mt-6 border-t border-white/15 pt-4">
                <Link
                  href="/account/change-password"
                  onClick={closeOnNavigate}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <UserCog className="size-5 shrink-0" />
                  Change password
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Main content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
