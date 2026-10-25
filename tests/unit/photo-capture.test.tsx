// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { v2 as cloudinary } from "cloudinary";

import { PhotoCapture } from "@/components/register/photo-capture";
import { createUploadSignature } from "@/lib/cloudinary";
import { requestUploadSignature } from "@/app/register/actions";

vi.mock("@/app/register/actions", () => ({ requestUploadSignature: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each([
  "Choose a passport photograph from this device",
  "Take a passport photograph with the camera",
])("sends all signed Cloudinary parameters for %s", async (label) => {
  const ticket = createUploadSignature({ maxBytes: 123456 });
  vi.mocked(requestUploadSignature).mockResolvedValue({
    ok: true,
    data: {
      signature: ticket.signature,
      timestamp: ticket.timestamp,
      folder: ticket.folder,
      publicId: ticket.public_id,
      apiKey: ticket.api_key,
      maxBytes: ticket.max_file_size,
      allowedFormats: ticket.allowed_formats,
      transformation: ticket.transformation,
    },
  });
  const uploaded = {
    public_id: `${ticket.folder}/${ticket.public_id}`,
    format: "jpg", width: 100, height: 120, bytes: 3,
  };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => uploaded });
  vi.stubGlobal("fetch", fetchMock);
  const onChange = vi.fn();
  render(<PhotoCapture value={null} onChange={onChange} maxBytes={500000} />);

  fireEvent.change(screen.getByLabelText(label), {
    target: { files: [new File([new Uint8Array([0xff, 0xd8, 0xff])], "photo.jpg", { type: "image/jpeg" })] },
  });

  await waitFor(() => expect(onChange).toHaveBeenCalledWith({
    publicId: uploaded.public_id,
    format: uploaded.format,
    width: uploaded.width,
    height: uploaded.height,
    bytes: uploaded.bytes,
  }));
  const body = fetchMock.mock.calls[0][1].body as FormData;
  const signedFields = Object.fromEntries(
    Array.from(body.entries()).filter(([key]) => !["file", "api_key", "signature"].includes(key))
  );
  expect(signedFields).toEqual({
    timestamp: String(ticket.timestamp),
    folder: ticket.folder,
    public_id: ticket.public_id,
    allowed_formats: ticket.allowed_formats,
    max_file_size: String(ticket.max_file_size),
    transformation: ticket.transformation,
  });
  expect(cloudinary.utils.api_sign_request(signedFields, process.env.CLOUDINARY_API_SECRET!))
    .toBe(body.get("signature"));
});