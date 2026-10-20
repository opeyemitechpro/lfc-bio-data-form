/**
 * Development helper: extracts the dominant colours from the official
 * church logo so the brand palette matches the real asset.
 *
 * Usage: node scripts/logo-colours.mjs
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const file = process.argv[2] ?? "public/brand/lfc-logo.png";
const buffer = readFileSync(file);

// --- Minimal PNG decoder (8-bit RGBA, non-interlaced) -------------------
let offset = 8;
let width = 0;
let height = 0;
let bitDepth = 0;
let colorType = 0;
const idat = [];

while (offset < buffer.length) {
  const length = buffer.readUInt32BE(offset);
  const type = buffer.toString("ascii", offset + 4, offset + 8);
  const data = buffer.subarray(offset + 8, offset + 8 + length);

  if (type === "IHDR") {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
  } else if (type === "IDAT") {
    idat.push(data);
  } else if (type === "IEND") {
    break;
  }
  offset += 12 + length;
}

if (bitDepth !== 8) throw new Error(`Unsupported bit depth ${bitDepth}`);
const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
if (!channels) throw new Error(`Unsupported colour type ${colorType}`);

const raw = inflateSync(Buffer.concat(idat));
const stride = width * channels;
const pixels = Buffer.alloc(height * stride);

let pos = 0;
for (let y = 0; y < height; y += 1) {
  const filter = raw[pos];
  pos += 1;
  const line = raw.subarray(pos, pos + stride);
  pos += stride;
  const out = pixels.subarray(y * stride, (y + 1) * stride);
  const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

  for (let x = 0; x < stride; x += 1) {
    const a = x >= channels ? out[x - channels] : 0;
    const b = prev ? prev[x] : 0;
    const c = prev && x >= channels ? prev[x - channels] : 0;
    let value = line[x];

    switch (filter) {
      case 0:
        break;
      case 1:
        value += a;
        break;
      case 2:
        value += b;
        break;
      case 3:
        value += (a + b) >> 1;
        break;
      case 4: {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        break;
      }
      default:
        throw new Error(`Unknown filter ${filter}`);
    }
    out[x] = value & 0xff;
  }
}

// --- Quantise and count -----------------------------------------------
const buckets = new Map();
for (let i = 0; i < pixels.length; i += channels) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  const a = channels === 4 ? pixels[i + 3] : 255;
  if (a < 128) continue; // ignore transparent pixels
  const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
  const entry = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
  entry.count += 1;
  entry.r += r;
  entry.g += g;
  entry.b += b;
  buckets.set(key, entry);
}

const top = [...buckets.values()]
  .sort((x, y) => y.count - x.count)
  .slice(0, 12)
  .map((entry) => {
    const r = Math.round(entry.r / entry.count);
    const g = Math.round(entry.g / entry.count);
    const b = Math.round(entry.b / entry.count);
    const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    return { hex, rgb: `${r}, ${g}, ${b}`, count: entry.count };
  });

console.log(`Image: ${width}x${height}`);
console.table(top);
