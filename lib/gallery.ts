import type { GalleryImage } from "@/components/gallery/GalleryGrid";
import { galleryImageUrl } from "@/lib/storage";

export interface PublicGalleryRow {
  id: string;
  storage_path: string;
  caption: string | null;
  credit: string | null;
  event_slug?: string | null;
  event_name?: string | null;
  event_starts_at?: string | null;
  campaign_slug?: string | null;
  campaign_title?: string | null;
}

/** v_public_gallery rows → lightbox images; a cause labels its photos like an event does. */
export function toGalleryImages(rows: PublicGalleryRow[]): GalleryImage[] {
  return rows.flatMap((row) => {
    const src = galleryImageUrl(row.storage_path);
    if (!src) return [];
    return [
      {
        id: row.id,
        src,
        caption: row.caption,
        credit: row.credit,
        eventSlug: row.event_slug ?? row.campaign_slug ?? null,
        eventName: row.event_name ?? row.campaign_title ?? null,
        year: row.event_starts_at ? new Date(row.event_starts_at).getFullYear() : null,
      },
    ];
  });
}
