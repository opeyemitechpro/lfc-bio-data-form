"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePasswordAction, type PasswordResetResult } from "@/app/account/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          Updating…
        </>
      ) : (
        <>
          <KeyRound aria-hidden="true" />
          Set new password
        </>
      )}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<PasswordResetResult | null, FormData>(
    updatePasswordAction,
    null
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormErrorBanner message={state?.message} />

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
        />
        <p className="text-sm text-muted-foreground">
          At least 12 characters, including at least one letter and one number.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
        />
      </div>

      <SubmitButton />
    </form>
  );
}
