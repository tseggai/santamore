import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GalleryGrid, type GalleryImage } from "@/components/gallery/GalleryGrid";
import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery" });
  return { title: `${t("title")} — Santamore` };
}

interface GalleryRow {
  id: string;
  storage_path: string;
  caption: string | null;
  credit: string | null;
  event_slug: string | null;
  event_name: string | null;
  event_starts_at: string | null;
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("gallery");

  let rows: GalleryRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_gallery")
      .select("id, storage_path, caption, credit, event_slug, event_name, event_starts_at")
      .order("sort_order", { ascending: true })
      .limit(400);
    rows = (data ?? []) as GalleryRow[];
  } catch {
    rows = [];
  }

  const images = rows.flatMap((row): GalleryImage[] => {
    const src = galleryImageUrl(row.storage_path);
    if (!src) return [];
    return [
      {
        id: row.id,
        src,
        caption: row.caption,
        credit: row.credit,
        eventSlug: row.event_slug,
        eventName: row.event_name,
        year: row.event_starts_at ? new Date(row.event_starts_at).getFullYear() : null,
      },
    ];
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {t("eyebrow")}
      </p>
      <h1 className="type-display mt-3 text-4xl leading-[1.1] sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink/70">{t("sub")}</p>

      <div className="mt-8">
        {images.length === 0 ? (
          <p className="max-w-xl rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[12.5px] text-sea">
            {t("empty")}
          </p>
        ) : (
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
        )}
      </div>
    </div>
  );
}
