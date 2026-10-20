import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : LabelPrimitive.Root;
  return (
    <Comp
      ref={ref}
      className={cn(
        "text-sm font-semibold leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
