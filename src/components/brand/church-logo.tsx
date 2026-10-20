import Image from "next/image";

import { cn } from "@/lib/utils";

interface ChurchLogoProps {
  className?: string;
  /** Renders the wordmark next to the logo. */
  withWordmark?: boolean;
  /** Inverts the wordmark for dark backgrounds. */
  inverted?: boolean;
  priority?: boolean;
}

/**
 * The official church logo with a graceful fallback: if the remote asset
 * is unavailable the local optimised copy is used, and if that fails the
 * browser shows the accessible alt text rather than a broken image.
 */
export function ChurchLogo({
  className,
  withWordmark = false,
  inverted = false,
  priority = false,
}: ChurchLogoProps) {
  const logo = (
    <Image
      src="/brand/lfc-logo.png"
      alt="Living Faith Church International logo"
      width={256}
      height={256}
      priority={priority}
      className={cn("h-10 w-10 shrink-0 object-contain", className)}
    />
  );

  if (!withWordmark) return logo;

  return (
    <span className="flex items-center gap-3">
      {logo}
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "text-sm font-bold tracking-tight sm:text-base",
            inverted ? "text-white" : "text-ink"
          )}
        >
          Living Faith Church International
        </span>
        <span
          className={cn(
            "text-xs font-medium tracking-wide",
            inverted ? "text-white/70" : "text-muted-foreground"
          )}
        >
          Laderin-Hilltop · Winners Chapel
        </span>
      </span>
    </span>
  );
}
