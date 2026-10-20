import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ChurchLogo } from "@/components/brand/church-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/app/account/reset-password/reset-password-form";
import { createServerSupabaseClient } from "@/lib/supabase/clients";

export const metadata: Metadata = {
  title: "Choose a new password",
};


export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // A recovery link establishes a temporary session. Without it the
  // visitor must request a new link.
  if (!user) {
    redirect("/forgot-password");
  }

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
            <CardTitle className="text-2xl">Choose a new password</CardTitle>
            <p className="text-sm text-muted-foreground">
              Signed in as {user.email}
            </p>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
