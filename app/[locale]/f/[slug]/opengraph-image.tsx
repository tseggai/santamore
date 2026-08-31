import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { formatCents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { routing, type Locale } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Santamore";

// Dynamic share card (brief §10): the runner's name, photo, current total
// and progress — regenerated on every share, so milestones show up without
// redeploys. Anon key + public view only.
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
    } catch {
      // Fall through to the brand-only card.
    }
  }

  const pct =
    goalCents > 0 ? Math.min(100, Math.round((raisedCents / goalCents) * 100)) : 0;
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
          fontFamily: "Georgia, serif",
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
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.05,
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
              {money(raisedCents)}
            </div>
            {goalCents > 0 ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 40,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                / {money(goalCents)}
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
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: `${Math.max(2, pct)}%`,
                  height: 18,
                  borderRadius: 9,
                  background: "#F35353",
                }}
              />
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
    size,
  );
}
