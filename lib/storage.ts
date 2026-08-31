// Public CDN URL for a file in the fundraiser-photos bucket (created in
// migration 0005; public read, per-user-folder writes).

export function fundraiserPhotoUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return `${base}/storage/v1/object/public/fundraiser-photos/${path}`;
}
