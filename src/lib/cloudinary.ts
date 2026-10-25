import "server-only";

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { createHash, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

/** Formats Cloudinary accepts for the `allowed_formats` upload parameter. */
const CLOUDINARY_IMAGE_FORMATS: Array<"jpg" | "png" | "webp"> = [
  "jpg",
  "png",
  "webp",
];

let configured = false;

function configure() {
  if (configured) return;
  cloudinary.config({
    cloud_name: env.public.cloudinaryCloudName(),
    api_key: env.server.cloudinaryApiKey(),
    api_secret: env.server.cloudinaryApiSecret(),
    secure: true,
  });
  configured = true;
}

export interface SignedUploadParams {
  timestamp: number;
  folder: string;
  public_id: string;
  context?: string;
  allowed_formats: string;
  max_file_size: number;
  transformation: string;
  signature: string;
  api_key: string;
}

export interface UploadedImage {
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  secure_url: string;
}

/**
 * Generates a signed upload ticket.
 *
 * The signature covers the timestamp, folder, public id, format whitelist
 * and transformation. The browser enforces the configured size limit before
 * upload; Cloudinary does not accept `max_file_size` as an upload parameter.
 */
export function createUploadSignature(options?: {
  maxBytes?: number;
  folder?: string;
}): SignedUploadParams {
  configure();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options?.folder ?? env.server.cloudinaryUploadFolder();
  const maxBytes = options?.maxBytes ?? env.server.maxUploadBytes();

  // Unpredictable asset identifier so that member photographs cannot be
  // guessed or enumerated from the public ID.
  const randomPart = randomBytes(12).toString("hex");
  const hashPart = createHash("sha256")
    .update(`${timestamp}:${randomPart}`)
    .digest("hex")
    .slice(0, 10);
  const publicId = `lfc-${Date.now().toString(36)}-${hashPart}-${randomPart.slice(0, 8)}`;

  const transformation = "c-limit,w_2000,h_2000,q_auto:good";

  const paramsToSign = {
    timestamp,
    folder,
    public_id: publicId,
    allowed_formats: CLOUDINARY_IMAGE_FORMATS.join(","),
    transformation,
  };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    env.server.cloudinaryApiSecret()
  );

  return {
    ...paramsToSign,
    max_file_size: maxBytes,
    signature,
    api_key: env.server.cloudinaryApiKey(),
  };
}

/**
 * Uploads a file to Cloudinary from the server.
 * Used for administrator-uploaded photographs and for any flow where the
 * browser cannot be trusted to sign correctly.
 */
export async function uploadImage(
  buffer: Buffer,
  options?: { folder?: string; publicId?: string }
): Promise<UploadedImage> {
  configure();

  const folder = options?.folder ?? env.server.cloudinaryUploadFolder();
  const publicId =
    options?.publicId ??
    `lfc-${Date.now().toString(36)}-${randomBytes(10).toString("hex")}`;

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        allowed_formats: CLOUDINARY_IMAGE_FORMATS,
        transformation: [{ width: 2000, height: 2000, crop: "limit" }],
        quality: "good",
        overwrite: false,
      },
      (error, response) => {
        if (error) reject(error);
        else if (!response) reject(new Error("Cloudinary returned no response."));
        else resolve(response);
      }
    );

    stream.end(buffer);
  });

  if (!result.public_id) {
    throw new Error("Cloudinary upload did not return a public id.");
  }

  return {
    public_id: result.public_id,
    format: result.format ?? "jpg",
    width: result.width ?? 0,
    height: result.height ?? 0,
    bytes: result.bytes ?? 0,
    secure_url: result.secure_url ?? "",
  };
}

/** Removes an asset from Cloudinary. Failures are swallowed by the caller. */
export async function destroyImage(publicId: string): Promise<boolean> {
  if (!publicId) return false;
  try {
    configure();
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
    return result.result === "ok" || result.result === "not found";
  } catch (error) {
    console.error("[cloudinary] failed to destroy image", {
      publicId,
      error: error instanceof Error ? error.message : "unknown error",
    });
    return false;
  }
}

/**
 * Builds a delivery URL with the appropriate transformation.
 *
 * Re-exported from the client-safe module so that server and client code
 * always produce identical URLs.
 */
export { buildImageUrl } from "@/lib/cloudinary-url";

/**
 * Validates the bytes of an uploaded image.
 *
 * The file signature is checked so that a renamed executable or document
 * cannot be accepted as a photograph.
 */
export function validateImageBytes(buffer: Buffer): { ok: true; format: string } | { ok: false; reason: string } {
  if (buffer.length === 0) {
    return { ok: false, reason: "The selected file is empty." };
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ok: true, format: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ok: true, format: "png" };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ok: true, format: "webp" };
  }

  return {
    ok: false,
    reason: "That file is not a valid image. Please choose a JPEG, PNG or WebP photograph.",
  };
}

/** Reads the pixel dimensions of an image buffer without a native dependency. */
export function readImageDimensions(
  buffer: Buffer
): { width: number; height: number } | null {
  try {
    // PNG
    if (
      buffer.length >= 24 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    // JPEG: scan the segment markers for the SOF frame header.
    if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buffer[offset + 1];
        const segmentLength = buffer.readUInt16BE(offset + 2);
        // SOF0-SOF15 (excluding DHT/JPG/DAC markers)
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        offset += 2 + segmentLength;
      }
    }
  } catch {
    return null;
  }

  return null;
}
