import Image from "next/image";

import { cn } from "@/lib/utils";
import { buildImageUrl } from "@/lib/cloudinary-url";

interface MemberPhotoProps {
  publicId: string | null;
  alt: string;
  className?: string;
  size?: "thumbnail" | "card" | "full";
  /** Shows the initials fallback when no photo is available. */
  fallbackText?: string;
  priority?: boolean;
}

/**
 * Renders a member photograph from Cloudinary.
 *
 * The image is delivered through a Cloudinary transformation that resizes
 * and compresses it, so directory views never load full-resolution
 * originals. When the viewer lacks the "view photographs" permission the
 * dashboard passes `publicId = null` and the fallback is shown instead.
 */
export function MemberPhoto({
  publicId,
  alt,
  className,
  size = "thumbnail",
  fallbackText,
  priority = false,
}: MemberPhotoProps) {
  const url = buildImageUrl(publicId, size);

  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border-2 border-border bg-muted text-sm font-bold text-muted-foreground",
          className
        )}
        role="img"
        aria-label={`${alt} — no photograph on file`}
      >
        {fallbackText ? (
          fallbackText.slice(0, 2).toUpperCase()
        ) : (
          <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden="true">
            <path
              d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={size === "thumbnail" ? 160 : size === "card" ? 320 : 1200}
      height={size === "thumbnail" ? 160 : size === "card" ? 400 : 1200}
      className={cn("rounded-lg border-2 border-border object-cover", className)}
      priority={priority}
      loading={priority ? undefined : "lazy"}
    />
  );
}
