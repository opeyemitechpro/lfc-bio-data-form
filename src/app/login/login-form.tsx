"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, LogIn, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type LoginResult } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          Signing in…
        </>
      ) : (
        <>
          <LogIn aria-hidden="true" />
          Sign in
        </>
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginResult | null, FormData>(
    signInAction,
    null
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormErrorBanner message={state?.message} />

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@church.org"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <a
            href="/forgot-password"
            className="text-sm font-semibold text-primary underline underline-offset-2"
          >
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <SubmitButton />

      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Only authorised church administrators can sign in here. Members should
          use the public registration form.
        </span>
      </p>
    </form>
  );
}
