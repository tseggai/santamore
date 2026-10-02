import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { OG_DISPLAY_FAMILY, OG_FONT_FAMILY, ogFonts } from "@/lib/og-fonts";
import { galleryImageUrl } from "@/lib/storage";
import { routing, type Locale } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Santamore";

const TAGLINE: Record<Locale, string> = {
  me: "Djeda Mraz sa mora",
  en: "Santa of the water",
  ru: "Дед Мороз с моря",
};

/**
 * The share card for every page that has no card of its own (fundraiser
 * pages and the ledger draw theirs beside their routes): the share picture
 * chosen in Settings → Photos, then the home page photo, then the brand
 * alone. Read through public_setting with the anon key, so it never
 * touches a session.
 */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  let photo: string | null = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    try {
      const supabase = createSupabaseClient(url, anonKey);
      const [share, home] = await Promise.all([
        supabase.rpc("public_setting", { p_key: "share_photo" }),
        supabase.rpc("public_setting", { p_key: "home_photo" }),
      ]);
      const path = [share.data, home.data].find((value) => typeof value === "string" && value.length > 0) as string | undefined;
      photo = galleryImageUrl(path ?? null);
    } catch {
      // brand-only card
    }
  }

  const wordmark = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", color: "#F35353", fontSize: 40, fontWeight: 700, letterSpacing: "0.12em" }}>SANTAMORE</div>
      <div style={{ display: "flex", marginTop: 10, fontFamily: OG_DISPLAY_FAMILY, fontSize: 30, color: "rgba(255,255,255,0.9)" }}>
        {TAGLINE[locale]}
      </div>
    </div>
  );

  return new ImageResponse(
    photo ? (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0E3A46", fontFamily: OG_FONT_FAMILY }}>
        <img src={photo} alt="" width={1200} height={630} style={{ width: 1200, height: 630, objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "flex-end",
            height: 260,
            padding: "0 64px 44px",
            backgroundImage: "linear-gradient(to top, rgba(14,58,70,0.92), rgba(14,58,70,0))",
          }}
        >
          {wordmark}
        </div>
      </div>
    ) : (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", background: "#0E3A46", padding: "0 64px 44px", fontFamily: OG_FONT_FAMILY }}>
        {wordmark}
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
