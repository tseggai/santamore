"use client";

import { useTranslations } from "next-intl";

import { GalleryGrid, type GalleryImage } from "@/components/gallery/GalleryGrid";

/** An event's or a cause's photos on its own page, with the shared lightbox. */
export function PublicGallery({ images, heading }: { images: GalleryImage[]; heading: string }) {
  const t = useTranslations("gallery");
  if (images.length === 0) return null;
  return (
    <div className="mt-8">
      <p className="type-eyebrow text-sea/80">{heading}</p>
      <div className="mt-3">
        <GalleryGrid
          images={images}
          labels={{
            filterAll: t("filterAll"),
            credit: t("credit"),
            close: t("close"),
            prev: t("prev"),
            next: t("next"),
            counter: t("counter"),
          }}
        />
      </div>
    </div>
  );
}
