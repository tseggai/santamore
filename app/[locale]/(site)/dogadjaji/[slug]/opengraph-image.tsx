import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { formatCents } from "@/lib/money";
import { OG_DISPLAY_FAMILY, OG_FONT_FAMILY, ogFonts } from "@/lib/og-fonts";
import { routing, type Locale } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Santamore";

interface ProgressRow {
  event_name: string;
  campaign_title: string | null;
  goal_cents: number | null;
  raised_cents: number;
  donor_count: number;
  today_cents: number;
  event_day_cents: number;
}

// The event's share card: the event, the cause it raises for, what has
// come in so far, today and on the event day — regenerated on every
// share, so a post made in the morning shows the morning's figures and
// one made at the finish line shows the finish line's. Anon key, public
// view only (v_public_event_progress, migration 0069).
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "events" });

  let row: ProgressRow | null = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    try {
      const supabase = createSupabaseClient(url, anonKey);
      const { data } = await supabase
        .from("v_public_event_progress")
        .select("event_name, campaign_title, goal_cents, raised_cents, donor_count, today_cents, event_day_cents")
        .eq("event_slug", slug)
        .maybeSingle();
      row = (data as ProgressRow | null) ?? null;
    } catch {
      // Fall through to the brand-only card.
    }
  }

  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const raised = row?.raised_cents ?? 0;
  const goal = row?.goal_cents ?? 0;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0E3A46",
          color: "#FFFFFF",
          padding: "64px 80px",
          fontFamily: OG_FONT_FAMILY,
        }}
      >
        <div style={{ display: "flex", color: "#F35353", fontSize: 32, fontWeight: 700, letterSpacing: "0.12em" }}>SANTAMORE</div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontFamily: OG_DISPLAY_FAMILY,
            fontSize: 58,
            fontWeight: 400,
            lineHeight: 1.1,
            maxWidth: 1040,
          }}
        >
          {row?.event_name ?? "Santamore"}
        </div>
        {row ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 36 }}>
              <div style={{ display: "flex", fontSize: 84, fontWeight: 700 }}>{money(raised)}</div>
              {goal > 0 ? <div style={{ display: "flex", fontSize: 38, color: "rgba(255,255,255,0.7)" }}>/ {money(goal)}</div> : null}
            </div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 30, color: "rgba(255,255,255,0.85)" }}>
              {t("progressRaisedFor", { cause: row.campaign_title ?? "" })}
            </div>
            {goal > 0 ? (
              <div style={{ display: "flex", marginTop: 26, width: 1040, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.22)" }}>
                <div style={{ display: "flex", width: `${Math.max(2, pct)}%`, height: 18, borderRadius: 9, background: "#F35353" }} />
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 40, marginTop: 26, fontSize: 28, color: "rgba(255,255,255,0.8)" }}>
              <div style={{ display: "flex" }}>{t("progressDonors", { count: row.donor_count })}</div>
              <div style={{ display: "flex" }}>{t("progressToday", { amount: money(row.today_cents) })}</div>
              {row.event_day_cents > 0 ? <div style={{ display: "flex" }}>{t("progressEventDay", { amount: money(row.event_day_cents) })}</div> : null}
            </div>
          </>
        ) : null}
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
