import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";

import { authorizeUrl, stravaConfig } from "@/lib/strava/api";
import { signState } from "@/lib/strava/rules";
import { siteOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Start the Strava OAuth flow for the signed-in runner. The `state` is an
 * HMAC over the user id, so the callback can only complete for the session
 * that started it. `share=1` records consent to appear on public standings.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("locale") ?? routing.defaultLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const sharePublic = url.searchParams.get("share") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${siteOrigin()}/${locale}/dashboard/prijava`);
  }

  const config = stravaConfig();
  if (!config.configured) {
    return NextResponse.redirect(
      `${siteOrigin()}/${locale}/dashboard/strava?strava=unconfigured`,
    );
  }

  const state = signState(
    { userId: user.id, locale, sharePublic, exp: Math.floor(Date.now() / 1000) + 600 },
    config.clientSecret,
  );
  return NextResponse.redirect(authorizeUrl(`${siteOrigin()}/api/strava/callback`, state));
}
