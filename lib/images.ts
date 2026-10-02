// Client-side image downscaling, shared by the dashboard page editor and the
// admin gallery uploader. Never ship 4MB phone photos (brief §12).

/** Downscale an image file to a JPEG blob, longest edge capped at maxEdge px. */
export async function downscaleToJpeg(file: File, maxEdge = 1600): Promise<Blob> {
  return downscale(file, maxEdge, "image/jpeg", 0.85);
}

/**
 * Logos and other artwork with transparency: PNG keeps the alpha channel
 * that JPEG would flatten to black.
 */
export async function downscaleToPng(file: File, maxEdge = 800): Promise<Blob> {
  return downscale(file, maxEdge, "image/png");
}

/** The browser could not decode the picture (HEIC on Chrome, a corrupt file, a non-image). */
export class ImageUnreadableError extends Error {
  constructor(cause?: unknown) {
    super("image unreadable");
    this.name = "ImageUnreadableError";
    this.cause = cause;
  }
}

/** Decode with createImageBitmap, or through an <img> where the bitmap API refuses a format the browser can still show. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch (first) {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new ImageUnreadableError(first));
        image.src = url;
      });
    } finally {
      // Revoked after the draw below reads it; a tick is enough.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

/**
 * Why an upload failed, as a message key for the console plus the raw
 * detail: a picture the browser cannot read, a file over the bucket's
 * limit, a storage policy refusing the account, or anything else.
 */
export function describeUploadError(error: unknown): { key: "uploadUnreadable" | "uploadTooLarge" | "uploadForbidden" | "uploadFailed"; detail: string } {
  if (error instanceof ImageUnreadableError) return { key: "uploadUnreadable", detail: "" };
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error ?? "");
  const status = typeof error === "object" && error && "statusCode" in error ? String((error as { statusCode: unknown }).statusCode) : "";
  if (/maximum allowed size|too large|exceeded/i.test(message) || status === "413") return { key: "uploadTooLarge", detail: message };
  if (/row-level security|not authorized|unauthorized|forbidden|jwt|invalid signature|policy/i.test(message) || status === "403" || status === "401") return { key: "uploadForbidden", detail: message };
  return { key: "uploadFailed", detail: message || "unknown" };
}

async function downscale(file: File, maxEdge: number, type: "image/jpeg" | "image/png", quality?: number): Promise<Blob> {
  const bitmap = await decode(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
      type,
      quality,
    );
  });
}
