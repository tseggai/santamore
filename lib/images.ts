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

async function downscale(file: File, maxEdge: number, type: "image/jpeg" | "image/png", quality?: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
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
