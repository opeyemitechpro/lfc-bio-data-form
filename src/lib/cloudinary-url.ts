/**
 * Client-safe photo delivery URLs for Cloudinary and Supabase Storage.
 *
 * This module deliberately does NOT import the Cloudinary SDK and is not
 * marked `server-only`, so it can be used from client components. It only
 * builds public delivery URLs; the API secret is never involved.
 */

/** Transformations applied to each delivery variant. */
const TRANSFORMATIONS = {
  thumbnail: "c_fill,g_face,w_160,h_160,q_auto:low,f_auto",
  card: "c_fill,g_face,w_320,h_400,q_auto:good,f_auto",
  full: "c_limit,w_1200,q_auto:good,f_auto",
} as const;

export type ImageVariant = keyof typeof TRANSFORMATIONS;

/**
 * Builds a delivery URL from the asset's original provider reference.
 *
 * Cloudinary transformations resize and compress the image, so directory views
 * never load full-resolution originals and the Cloudinary free allocation
 * is conserved. Supabase Free delivers the original without transformations.
 */
export function buildImageUrl(
  publicId: string | null | undefined,
  variant: ImageVariant = "thumbnail"
): string | null {
  if (!publicId) return null;

  if (publicId.startsWith("supabase:")) {
    const path = publicId.slice("supabase:".length);
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "demo";

  return `https://res.cloudinary.com/${cloudName}/image/upload/${TRANSFORMATIONS[variant]}/${publicId}`;
}
