import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { destroyImage as destroyCloudinaryImage, readImageDimensions, validateImageBytes } from "@/lib/cloudinary";
import { env } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/clients";

export interface SupabaseUploadTicket {
  provider: "supabase";
  signedUrl: string;
  verificationToken: string;
  maxBytes: number;
}

function sign(payload: string): Buffer {
  return createHmac("sha256", env.server.supabaseServiceRoleKey()).update(payload).digest();
}

export async function createSupabaseUploadTicket(format: string, maxBytes: number): Promise<SupabaseUploadTicket> {
  if (!["jpg", "png", "webp"].includes(format)) throw new Error("Unsupported image format.");
  const bucket = env.server.supabaseStorageBucket();
  const path = `members/${randomUUID()}.${format}`;
  const admin = await createAdminSupabaseClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) throw new Error("Could not create a photograph upload ticket.");
  const payload = Buffer.from(JSON.stringify({ bucket, path, maxBytes, expires: Date.now() + 2 * 60 * 60 * 1000 })).toString("base64url");
  return {
    provider: "supabase",
    signedUrl: data.signedUrl,
    verificationToken: `${payload}.${sign(payload).toString("base64url")}`,
    maxBytes,
  };
}

export async function verifySupabaseUpload(token: string) {
  if (typeof token !== "string" || token.length > 2048) throw new Error("Invalid upload ticket.");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Invalid upload ticket.");
  const supplied = Buffer.from(signature, "base64url");
  const expected = sign(payload);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("Invalid upload ticket.");
  }
  const { bucket, path, maxBytes, expires } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    bucket: string; path: string; maxBytes: number; expires: number;
  };
  if (expires < Date.now()) throw new Error("The upload ticket has expired. Please upload again.");
  const admin = await createAdminSupabaseClient();
  const storage = admin.storage.from(bucket);
  const { data, error } = await storage.download(path);
  if (error || !data) throw new Error("Could not verify the uploaded photograph.");
  const buffer = data.size <= maxBytes ? Buffer.from(await data.arrayBuffer()) : Buffer.alloc(0);
  const validation = validateImageBytes(buffer);
  const dimensions = readImageDimensions(buffer);
  if (data.size > maxBytes || !validation.ok || !dimensions || dimensions.width <= 0 || dimensions.height <= 0 || !path.endsWith(`.${validation.format}`)) {
    await storage.remove([path]);
    throw new Error("Please choose a valid JPEG, PNG or WebP photograph within the upload size limit.");
  }
  return { publicId: `supabase:${bucket}/${path}`, format: validation.format, ...dimensions, bytes: data.size };
}

export async function destroyImage(publicId: string): Promise<boolean> {
  if (!publicId.startsWith("supabase:")) return destroyCloudinaryImage(publicId);
  const [bucket, ...segments] = publicId.slice("supabase:".length).split("/");
  const path = segments.join("/");
  if (!bucket || !/^members\/[\da-f-]+\.(jpg|png|webp)$/.test(path)) return false;
  try {
    const admin = await createAdminSupabaseClient();
    const { error } = await admin.storage.from(bucket).remove([path]);
    return !error;
  } catch {
    return false;
  }
}