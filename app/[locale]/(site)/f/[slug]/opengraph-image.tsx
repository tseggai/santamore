import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { formatCents } from "@/lib/money";
import { OG_DISPLAY_FAMILY, OG_FONT_FAMILY, ogFonts } from "@/lib/og-fonts";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { routing, type Locale } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Santamore";

// Dynamic share card (brief §10): the runner's name, photo, current total
// and progress — regenerated on every share, so milestones show up without
// redeploys. Before the first confirmed gift it leads with what is pledged,
// or with the goal: a card that opens on "€0" asks nobody to give. Pledges
// are named as pledges and drawn pale. Anon key + public views only.
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = hasLocale(routing.locales, rawLocale)
    ? rawLocale
    : routing.defaultLocale;

  let title = "Santamore";
  let raisedCents = 0;
  let goalCents = 0;
  let pledgedCents = 0;
  let photo: string | null = null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    try {
      const supabase = createSupabaseClient(url, anonKey);
      const { data } = await supabase
        .from("v_fundraiser_totals")
        .select("title, raised_cents, goal_cents, photo_path")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        title = data.title;
        raisedCents = data.raised_cents;
        goalCents = data.goal_cents ?? 0;
        photo = fundraiserPhotoUrl(data.photo_path);
      }
      const { data: pledges } = await supabase
        .from("v_public_fundraiser_pledges")
        .select("pledged_cents")
        .eq("slug", slug)
        .maybeSingle();
      pledgedCents = Number(pledges?.pledged_cents ?? 0);
    } catch {
      // Fall through to the brand-only card.
    }
  }

  const pct =
    goalCents > 0 ? Math.min(100, Math.round((raisedCents / goalCents) * 100)) : 0;
  const pledgedOnly = raisedCents <= 0 && pledgedCents > 0;
  const goalOnly = raisedCents <= 0 && pledgedCents <= 0 && goalCents > 0;
  const promisedPct =
    goalCents > 0 ? Math.min(100, Math.round(((raisedCents + pledgedCents) / goalCents) * 100)) : 0;
  const t = await getTranslations({ locale, namespace: "runner" });
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#0E3A46",
          color: "#FFFFFF",
          padding: "72px 80px",
          fontFamily: OG_FONT_FAMILY,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              color: "#F35353",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            SANTAMORE
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontFamily: OG_DISPLAY_FAMILY,
              fontSize: 60,
              fontWeight: 400,
              lineHeight: 1.15,
              maxWidth: 780,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 20,
              marginTop: 44,
            }}
          >
            <div style={{ display: "flex", fontSize: 88, fontWeight: 700 }}>
              {goalOnly ? `${t("goalLabel")}: ${money(goalCents)}` : pledgedOnly ? money(pledgedCents) : money(raisedCents)}
            </div>
            {goalCents > 0 && !goalOnly ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 40,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {`${pledgedOnly ? `${t("pledgedLabel").toLowerCase()} ` : ""}/ ${money(goalCents)}`}
              </div>
            ) : null}
          </div>
          {goalCents > 0 ? (
            <div
              style={{
                display: "flex",
                marginTop: 30,
                width: 780,
                height: 18,
                borderRadius: 9,
                background: "rgba(255,255,255,0.22)",
                position: "relative",
              }}
            >
              {promisedPct > pct ? (
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: `${promisedPct}%`,
                    height: 18,
                    borderRadius: 9,
                    background: "rgba(243,83,83,0.4)",
                  }}
                />
              ) : null}
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: `${Math.max(2, pct)}%`,
                  height: 18,
                  borderRadius: 9,
                  background: "#F35353",
                }}
              />
            </div>
          ) : null}
          {pledgedCents > 0 && !pledgedOnly ? (
            <div style={{ display: "flex", marginTop: 22, fontSize: 32, color: "rgba(255,255,255,0.8)" }}>
              {`${t("pledgedLabel")}: ${money(pledgedCents)}`}
            </div>
          ) : null}
        </div>
        {photo ? (
          <img
            src={photo}
            alt=""
            width={280}
            height={280}
            style={{
              width: 280,
              height: 280,
              borderRadius: 140,
              objectFit: "cover",
              border: "6px solid #FFFFFF",
            }}
          />
        ) : null}
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
