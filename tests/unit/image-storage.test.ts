import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MemberPhoto } from "@/components/members/member-photo";
import { buildImageUrl } from "@/lib/cloudinary-url";
import { serverEnv } from "@/lib/env";
import { createSupabaseUploadTicket, destroyImage, verifySupabaseUpload } from "@/lib/image-storage";

const storage = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(), download: vi.fn(), remove: vi.fn(),
}));
const from = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/clients", () => ({
  createAdminSupabaseClient: async () => ({ storage: { from } }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("defaults to Cloudinary and accepts the Supabase switch", () => {
  vi.stubEnv("IMAGE_STORAGE_PROVIDER", "");
  expect(serverEnv.imageStorageProvider()).toBe("cloudinary");
  vi.stubEnv("IMAGE_STORAGE_PROVIDER", "supabase");
  expect(serverEnv.imageStorageProvider()).toBe("supabase");
  vi.stubEnv("IMAGE_STORAGE_PROVIDER", "invalid");
  expect(() => serverEnv.imageStorageProvider()).toThrow("IMAGE_STORAGE_PROVIDER");
});

it("routes each stored photo independently of the selected provider", () => {
  vi.stubEnv("IMAGE_STORAGE_PROVIDER", "supabase");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "test-cloud");
  expect(buildImageUrl("supabase:member-photos/members/photo.jpg", "card"))
    .toBe("https://test.supabase.co/storage/v1/object/public/member-photos/members/photo.jpg");
  expect(buildImageUrl("lfc-laderin/members/old-photo", "card"))
    .toBe("https://res.cloudinary.com/test-cloud/image/upload/c_fill,g_face,w_320,h_400,q_auto:good,f_auto/lfc-laderin/members/old-photo");
  expect(buildImageUrl(null)).toBeNull();
});

async function makeTicket(maxBytes = 5000) {
  from.mockReturnValue(storage);
  storage.createSignedUploadUrl.mockResolvedValue({ data: { signedUrl: "https://test.supabase.co/upload?token=signed" }, error: null });
  storage.remove.mockResolvedValue({ error: null });
  return createSupabaseUploadTicket("png", maxBytes);
}

it("creates a non-overwriting signed ticket and verifies server-derived image metadata", async () => {
  const ticket = await makeTicket();
  const buffer = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer);
  buffer.writeUInt32BE(320, 16);
  buffer.writeUInt32BE(400, 20);
  storage.download.mockResolvedValue({ data: new Blob([buffer]), error: null });
  const photo = await verifySupabaseUpload(ticket.verificationToken);
  expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(expect.stringMatching(/^members\/.+\.png$/), { upsert: false });
  expect(photo).toEqual({ publicId: expect.stringMatching(/^supabase:member-photos\/members\/.+\.png$/), format: "png", width: 320, height: 400, bytes: 24 });
});

it("rejects tampered tickets before accessing storage", async () => {
  const ticket = await makeTicket();
  await expect(verifySupabaseUpload(`${ticket.verificationToken}x`)).rejects.toThrow("Invalid upload ticket");
  expect(storage.download).not.toHaveBeenCalled();
});

it.each(["invalid", "oversized"])("removes an %s uploaded file", async (reason) => {
  const ticket = await makeTicket(reason === "oversized" ? 1 : 5000);
  storage.download.mockResolvedValue({ data: new Blob(["not an image"]), error: null });
  await expect(verifySupabaseUpload(ticket.verificationToken)).rejects.toThrow("valid JPEG");
  expect(storage.remove).toHaveBeenCalledWith([expect.stringMatching(/^members\/.+\.png$/)]);
});

it("deletes a Supabase image from its original bucket after switching providers", async () => {
  vi.stubEnv("IMAGE_STORAGE_PROVIDER", "cloudinary");
  from.mockReturnValue(storage);
  storage.remove.mockResolvedValue({ error: null });
  expect(await destroyImage("supabase:old-bucket/members/1234-abcd.png")).toBe(true);
  expect(from).toHaveBeenCalledWith("old-bucket");
  expect(storage.remove).toHaveBeenCalledWith(["members/1234-abcd.png"]);
});

it("renders Supabase member photos directly without the Next.js remote optimizer", () => {
  const html = renderToStaticMarkup(createElement(MemberPhoto, {
    publicId: "supabase:member-photos/members/photo.png", alt: "Member photograph",
  }));
  expect(html).toContain("/storage/v1/object/public/member-photos/members/photo.png");
  expect(html).not.toContain("/_next/image");
});