import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ChurchLogo } from "@/components/brand/church-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/app/login/login-form";
import { getAuthContext } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administrative sign in",
};


export default async function LoginPage() {
  const context = await getAuthContext();
  if (context && !context.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col bg-muted/40">
      <header className="app-header border-b border-border bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Return to the home page">
            <ChurchLogo withWordmark inverted priority />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ChurchLogo className="mx-auto size-16" priority />
            <CardTitle className="mt-3 text-2xl">
              Administrative sign in
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Living Faith Church International — Laderin-Hilltop
            </p>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border bg-ink py-5 text-center text-sm text-white/70">
        <Link
          href="/register"
          className="underline underline-offset-2 hover:text-white"
        >
          Register as a member
        </Link>
      </footer>
    </div>
  );
}
