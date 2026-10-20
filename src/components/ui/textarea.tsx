import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-28 w-full rounded-lg border-2 bg-background px-4 py-3 text-base text-foreground shadow-sm transition-colors",
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
Textarea.displayName = "Textarea";

export { Textarea };
