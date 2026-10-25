"use client";

import * as React from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildImageUrl } from "@/lib/cloudinary-url";
import { requestUploadSignature } from "@/app/register/actions";

export interface UploadedPhoto {
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

interface PhotoCaptureProps {
  value: UploadedPhoto | null;
  onChange: (photo: UploadedPhoto | null) => void;
  /** Renders the error message; also shown inline. */
  error?: string;
  maxBytes: number;
  disabled?: boolean;
}

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Captures or selects a passport photograph.
 *
 * The file is uploaded directly to Cloudinary using a server-issued
 * signature, so the API secret never reaches the browser. The image is
 * validated client-side for type and size, and again on the server.
 */
export function PhotoCapture({
  value,
  onChange,
  error,
  maxBytes,
  disabled = false,
}: PhotoCaptureProps) {
  const [uploading, setUploading] = React.useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // The preview URL is derived from the uploaded asset, so it is computed
  // during render rather than stored in state.
  const preview = value ? buildImageUrl(value.publicId, "card") : null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Please choose a JPEG, PNG or WebP image file.");
      return;
    }

    if (file.size > maxBytes) {
      toast.error(
        `That photograph is too large. Please choose an image smaller than ${formatBytes(maxBytes)}.`
      );
      return;
    }

    setUploading(true);
    try {
      const signature = await requestUploadSignature();
      if (!signature.ok || !signature.data) {
        toast.error(signature.message ?? "Could not start the upload.");
        return;
      }

      const {
        signature: sig, timestamp, folder, publicId, apiKey,
        maxBytes: signedMaxBytes, allowedFormats, transformation,
      } = signature.data;

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", apiKey);
      body.append("timestamp", String(timestamp));
      body.append("folder", folder);
      body.append("public_id", publicId);
      body.append("allowed_formats", allowedFormats);
      body.append("max_file_size", String(signedMaxBytes));
      body.append("transformation", transformation);
      body.append("signature", sig);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = (await response.json()) as {
        public_id: string;
        format: string;
        width: number;
        height: number;
        bytes: number;
      };

      onChange({
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      });
      toast.success("Photograph uploaded.");
    } catch {
      toast.error(
        "The photograph could not be uploaded. Please check your connection and try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    onChange(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-5 sm:flex-row sm:items-start",
          error ? "border-destructive/50 bg-destructive/5" : "border-input bg-muted/40"
        )}
      >
        <div className="relative shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Preview of the photograph you selected"
              className="size-32 rounded-lg border-2 border-border object-cover shadow-sm sm:size-36"
            />
          ) : (
            <div className="flex size-32 items-center justify-center rounded-lg border-2 border-dashed border-input bg-background sm:size-36">
              <Camera className="size-10 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
              <span className="sr-only">Uploading photograph</span>
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div>
            <p className="text-base font-semibold">Passport photograph</p>
            <p className="text-sm text-muted-foreground">
              Take a clear photo with a plain background, or choose an existing
              image. JPEG, PNG or WebP, up to {formatBytes(maxBytes)}.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              <Camera aria-hidden="true" />
              Take a photo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              <ImagePlus aria-hidden="true" />
              Choose an image
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                onClick={clear}
                disabled={disabled || uploading}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>

          {value ? (
            <p className="text-sm text-muted-foreground">
              Photo selected ({value.width}×{value.height},{" "}
              {formatBytes(value.bytes)}). You can replace it before submitting.
            </p>
          ) : null}
        </div>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        aria-label="Take a passport photograph with the camera"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        className="sr-only"
        aria-label="Choose a passport photograph from this device"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
        }}
      />

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
