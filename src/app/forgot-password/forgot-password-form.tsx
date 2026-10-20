"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormErrorBanner, FormSuccessBanner } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordResetAction,
  type PasswordResetResult,
} from "@/app/account/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          Sending…
        </>
      ) : (
        <>
          <Send aria-hidden="true" />
          Send reset link
        </>
      )}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<PasswordResetResult | null, FormData>(
    requestPasswordResetAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <FormSuccessBanner message={state.message} />
        <Button asChild variant="outline" className="w-full">
          <a href="/login">Back to sign in</a>
        </Button>
      </div>
    );
  }

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
        <p className="text-sm text-muted-foreground">
          Enter the email address on your administrator account and we will send
          you a link to set a new password.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}
