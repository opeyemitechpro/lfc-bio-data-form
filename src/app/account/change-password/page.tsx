import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ChurchLogo } from "@/components/brand/church-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/app/account/change-password/change-password-form";
import { getAuthContext } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Change your password",
};


export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ forced?: string }>;
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const params = await searchParams;
  const forced = params.forced === "1" || context.mustChangePassword;

  return (
    <div className="flex min-h-full flex-col bg-muted/40">
      <header className="app-header border-b border-border bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Return to the home page">
            <ChurchLogo withWordmark inverted priority />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Change your password</CardTitle>
            <p className="text-sm text-muted-foreground">
              Signed in as {context.email}
            </p>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm forced={forced} />
            {!forced ? (
              <p className="mt-6 text-center text-sm">
                <Link
                  href="/dashboard"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Back to dashboard
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
