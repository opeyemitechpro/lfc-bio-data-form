/**
 * Client-safe Cloudinary delivery URLs.
 *
 * This module deliberately does NOT import the Cloudinary SDK and is not
 * marked `server-only`, so it can be used from client components. It only
 * builds public delivery URLs; the API secret is never involved.
 */

/** Transformations applied to each delivery variant. */
const TRANSFORMATIONS = {
  thumbnail: "c-fill,g_face,w_160,h_160,q_auto:low,f_auto",
  card: "c-fill,g_face,w_320,h_400,q_auto:good,f_auto",
  full: "c-limit,w_1200,q_auto:good,f_auto",
} as const;

export type ImageVariant = keyof typeof TRANSFORMATIONS;

/**
 * Builds a Cloudinary delivery URL for a stored asset.
 *
 * The transformation resizes and compresses the image, so directory views
 * never load full-resolution originals and the Cloudinary free allocation
 * is conserved.
 */
export function buildImageUrl(
  publicId: string | null | undefined,
  variant: ImageVariant = "thumbnail"
): string | null {
  if (!publicId) return null;

  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "demo";

  return `https://res.cloudinary.com/${cloudName}/image/upload/${TRANSFORMATIONS[variant]}/${publicId}`;
}
