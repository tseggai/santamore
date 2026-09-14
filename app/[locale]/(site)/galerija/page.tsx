import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { toGalleryImages, type PublicGalleryRow } from "@/lib/gallery";
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

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("gallery");

  let rows: PublicGalleryRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_gallery")
      .select("id, storage_path, caption, credit, event_slug, event_name, event_starts_at, campaign_slug, campaign_title")
      .order("sort_order", { ascending: true })
      .limit(400);
    rows = (data ?? []) as PublicGalleryRow[];
  } catch {
    rows = [];
  }

  const images = toGalleryImages(rows);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80">
        {t("eyebrow")}
      </p>
      <h1 className="type-display mt-3 text-4xl leading-[1.1] sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-black/70">{t("sub")}</p>

      <div className="mt-8">
        {images.length === 0 ? (
          <p className="max-w-xl rounded-brand bg-mist px-4 py-3 text-[13.5px] text-sea">
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
