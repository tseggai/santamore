import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";

import { athleteAvatar, athleteName, exchangeCode, stravaConfig, StravaError } from "@/lib/strava/api";
import { hasActivityScope, verifyState } from "@/lib/strava/rules";
import { localToday, syncRecent } from "@/lib/strava/sync";
import { siteOrigin } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Strava sends the athlete back here with a code. We verify the signed
 * state against the current session, exchange the code server-side, store
 * the tokens (service role) and import the last 30 days. Perks are only
 * evaluated for today's activities — connecting never rewards old runs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = stravaConfig();
  const state = verifyState(url.searchParams.get("state"), config.clientSecret);
  const locale =
    state && hasLocale(routing.locales, state.locale) ? state.locale : routing.defaultLocale;
  const back = (status: string) =>
    NextResponse.redirect(`${siteOrigin()}/${locale}/dashboard/strava?strava=${status}`);

  if (!state) return back("state");
  if (url.searchParams.get("error")) return back("denied");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== state.userId) return back("state");

  const code = url.searchParams.get("code");
  if (!code) return back("denied");
  if (!hasActivityScope(url.searchParams.get("scope"))) return back("scope");

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.athlete?.id) return back("error");

    const service = createServiceClient();
    // One Strava athlete ↔ one Santamore account.
    const { data: taken } = await service
      .from("strava_connections")
      .select("user_id")
      .eq("athlete_id", tokens.athlete.id)
      .neq("user_id", user.id)
      .maybeSingle();
    if (taken) return back("taken");

    const { error } = await service.from("strava_connections").upsert(
      {
        user_id: user.id,
        athlete_id: tokens.athlete.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        scope: tokens.scope ?? url.searchParams.get("scope") ?? "",
        share_public: state.sharePublic,
        athlete_name: athleteName(tokens.athlete),
        athlete_avatar_url: athleteAvatar(tokens.athlete),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error("[strava] connection upsert failed:", error.code);
      return back("error");
    }

    await syncRecent(
      {
        user_id: user.id,
        athlete_id: tokens.athlete.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      },
      30,
      localToday(),
    ).catch((syncError) => console.error("[strava] initial sync failed:", syncError));

    return back("connected");
  } catch (error) {
    console.error("[strava] callback failed:", error);
    // 401 from /oauth/token means Strava rejected OUR client id/secret —
    // a deployment problem, not something the runner can retry through.
    if (error instanceof StravaError && error.status === 401) return back("credentials");
    return back("error");
  }
}
