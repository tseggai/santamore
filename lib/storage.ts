// Public CDN URL for a file in the fundraiser-photos bucket (created in
// migration 0005; public read, per-user-folder writes).

export function publicStorageUrl(bucket: string, path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function fundraiserPhotoUrl(path: string | null): string | null {
  return publicStorageUrl("fundraiser-photos", path);
}

/** Ledger documentation is public by design (brief §11). */
export function disbursementDocUrl(path: string | null): string | null {
  return publicStorageUrl("disbursement-docs", path);
}

export function galleryImageUrl(path: string | null): string | null {
  return publicStorageUrl("gallery", path);
}
