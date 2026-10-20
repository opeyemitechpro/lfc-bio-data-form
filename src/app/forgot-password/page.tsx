import type { Metadata } from "next";
import Link from "next/link";

import { ChurchLogo } from "@/components/brand/church-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
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
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <p className="text-sm text-muted-foreground">
              We will email you a link to choose a new password.
            </p>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
            <ButtonLink />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function ButtonLink() {
  return (
    <p className="mt-6 text-center text-sm">
      <Link
        href="/login"
        className="font-semibold text-primary underline underline-offset-2"
      >
        Back to sign in
      </Link>
    </p>
  );
}
