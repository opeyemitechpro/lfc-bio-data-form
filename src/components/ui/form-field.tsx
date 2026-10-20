import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  /** Unique id used to tie the label to the control. */
  id: string;
  label: string;
  /** Shown as "(optional)" — the label text only. */
  optional?: boolean;
  required?: boolean;
  helpText?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps a control with a visible label, help text and an inline error
 * message that is announced to assistive technology.
 */
export function FormField({
  id,
  label,
  optional = false,
  required = false,
  helpText,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        ) : null}
        {required ? (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {helpText ? (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      ) : null}
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

/** A large, clear error banner used at the top of forms. */
export function FormErrorBanner({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border-2 border-destructive/30 bg-destructive/10 p-4 text-base font-medium text-destructive",
        className
      )}
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/** A success banner shown after a successful submission. */
export function FormSuccessBanner({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-lg border-2 border-success/30 bg-success/10 p-4 text-base font-medium text-success",
        className
      )}
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true">
          <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{message}</span>
    </div>
  );
}
