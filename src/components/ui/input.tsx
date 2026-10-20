import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Shows an error message and sets the invalid styling. */
  invalid?: boolean;
}

/**
 * Large, high-contrast text input sized for comfortable use on mobile
 * devices by elderly users.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-12 w-full rounded-lg border-2 bg-background px-4 py-3 text-base text-foreground shadow-sm transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        invalid
          ? "border-destructive focus-visible:ring-destructive/25"
          : "border-input",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
