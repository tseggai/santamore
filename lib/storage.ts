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

export function supporterLogoUrl(path: string | null): string | null {
  return publicStorageUrl("supporter-logos", path);
}

/**
 * Ledger documentation is public by design (brief §11). A path in the
 * bucket becomes its CDN URL; a site file ("/documents/…") or a full URL
 * is used as it is, so a recorded hand-over can link a file shipped with
 * the site.
 */
export function disbursementDocUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  return publicStorageUrl("disbursement-docs", path);
}

export function galleryImageUrl(path: string | null): string | null {
  return publicStorageUrl("gallery", path);
}

/** Team photos on /o-nama, published with the member's consent. */
export function teamPhotoUrl(path: string | null): string | null {
  return publicStorageUrl("team-photos", path);
}

/** Beneficiary photos, published with consent. */
export function beneficiaryPhotoUrl(path: string | null): string | null {
  return publicStorageUrl("beneficiary-photos", path);
}

export function proposalPhotoUrl(path: string | null): string | null {
  return publicStorageUrl("proposal-photos", path);
}
