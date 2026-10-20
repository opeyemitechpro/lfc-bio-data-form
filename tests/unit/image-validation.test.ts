import { describe, expect, it } from "vitest";

import {
  readImageDimensions,
  validateImageBytes,
} from "@/lib/cloudinary";

/** Builds a minimal valid PNG header for the dimension tests. */
function makePng(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt8(0x89, 0);
  buffer.write("PNG", 1, "ascii");
  buffer.writeUInt8(0x0d, 4);
  buffer.writeUInt8(0x0a, 5);
  buffer.writeUInt8(0x1a, 6);
  buffer.writeUInt8(0x0a, 7);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function makeJpeg(width: number, height: number): Buffer {
  // SOI marker, then a SOF0 frame header.
  const buffer = Buffer.alloc(30);
  buffer.writeUInt8(0xff, 0);
  buffer.writeUInt8(0xd8, 1);
  buffer.writeUInt8(0xff, 2);
  buffer.writeUInt8(0xc0, 3);
  buffer.writeUInt16BE(17, 4); // segment length
  buffer.writeUInt8(8, 6); // precision
  buffer.writeUInt16BE(height, 7);
  buffer.writeUInt16BE(width, 9);
  return buffer;
}

describe("validateImageBytes", () => {
  it("accepts a JPEG file", () => {
    const result = validateImageBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.format).toBe("jpg");
  });

  it("accepts a PNG file", () => {
    const result = validateImageBytes(makePng(100, 100));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.format).toBe("png");
  });

  it("accepts a WebP file", () => {
    const buffer = Buffer.alloc(16);
    buffer.write("RIFF", 0, "ascii");
    buffer.write("WEBP", 8, "ascii");
    const result = validateImageBytes(buffer);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.format).toBe("webp");
  });

  it("rejects an empty file", () => {
    const result = validateImageBytes(Buffer.alloc(0));
    expect(result.ok).toBe(false);
  });

  it("rejects a file that only claims to be an image by name", () => {
    // A PDF header — a renamed document must never pass as a photograph.
    const buffer = Buffer.from("%PDF-1.7\n%binary");
    const result = validateImageBytes(buffer);
    expect(result.ok).toBe(false);
  });

  it("rejects an executable file", () => {
    const buffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const result = validateImageBytes(buffer);
    expect(result.ok).toBe(false);
  });

  it("rejects a script", () => {
    const buffer = Buffer.from("<script>alert(1)</script>");
    const result = validateImageBytes(buffer);
    expect(result.ok).toBe(false);
  });
});

describe("readImageDimensions", () => {
  it("reads PNG dimensions", () => {
    expect(readImageDimensions(makePng(320, 400))).toEqual({
      width: 320,
      height: 400,
    });
  });

  it("reads JPEG dimensions", () => {
    expect(readImageDimensions(makeJpeg(640, 480))).toEqual({
      width: 640,
      height: 480,
    });
  });

  it("returns null for an unrecognised format", () => {
    expect(readImageDimensions(Buffer.from("not an image"))).toBeNull();
  });
});
