#!/usr/bin/env node

import nextEnv from "@next/env";
import { v2 as cloudinary } from "cloudinary";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectRoot);

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const folder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "lfc-laderin/members";

const required = [
  ["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", cloudName],
  ["CLOUDINARY_API_KEY", apiKey],
  ["CLOUDINARY_API_SECRET", apiSecret],
];
const missing = required.filter(([, value]) => !value || value.startsWith("YOUR_")).map(([name]) => name);

if (missing.length > 0) {
  console.error(`Missing or placeholder Cloudinary variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

try {
  await cloudinary.api.ping();
  console.log(`Cloudinary API authentication succeeded for cloud: ${cloudName}`);
} catch (error) {
  console.error("Cloudinary API authentication failed.");
  console.error(error instanceof Error ? error.message : "Unknown API error");
  console.error("Check the cloud name, API key, API secret, and system clock. Secret values are not printed.");
  process.exit(1);
}

const publicId = `lfc-config-check-${Date.now()}-${randomBytes(4).toString("hex")}`;
const timestamp = Math.floor(Date.now() / 1000);
const params = {
  timestamp,
  folder,
  public_id: publicId,
  allowed_formats: "jpg,png,webp",
  transformation: "c_limit,w_2000,h_2000,q_auto:good",
};
const signature = cloudinary.utils.api_sign_request(params, apiSecret);
const body = new FormData();
body.append(
  "file",
  new Blob([
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/3ioAAAAASUVORK5CYII=",
      "base64"
    ),
  ], { type: "image/png" }),
  "cloudinary-check.png"
);
body.append("api_key", apiKey);
body.append("signature", signature);
for (const [name, value] of Object.entries(params)) body.append(name, String(value));

let uploadedPublicId;
try {
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message ?? `Upload returned HTTP ${response.status}.`);
  }

  uploadedPublicId = result.public_id;
  console.log(`Signed image upload succeeded (${result.format}, ${result.bytes} bytes).`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown upload error";
  console.error("Signed image upload failed.");
  console.error(message);
  if (message.toLowerCase().includes("missing permissions")) {
    console.error("The credentials authenticated, but this API key/cloud does not have permission to create uploaded assets.");
    console.error("Check that the key belongs to this cloud and has upload/create access; review any account or API-key restrictions.");
  }
  console.error("This tests the same signed parameters used by the registration form.");
  process.exitCode = 1;
} finally {
  if (uploadedPublicId) {
    try {
      const cleanup = await cloudinary.uploader.destroy(uploadedPublicId, { resource_type: "image" });
      if (cleanup.result === "ok" || cleanup.result === "not found") {
        console.log("Temporary test image was deleted.");
      } else {
        console.warn(`Could not confirm cleanup of temporary asset ${uploadedPublicId}.`);
      }
    } catch {
      console.warn(`Could not delete temporary test asset ${uploadedPublicId}; remove it from Cloudinary Assets.`);
    }
  }
}