import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

/**
 * PKCE code exchange for the magic-link sign-in. The link's redirect URL
 * must be allowed under Authentication → URL Configuration in the Supabase
 * dashboard (see docs/DEPLOY.md); the exchange only works in the browser
 * that requested the link, on the same host.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const fallback = `/${routing.defaultLocale}/dashboard`;
  const next = searchParams.get("next") ?? fallback;
  // Internal paths only — never an open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : fallback;
  // Keep the person in their own language and their own console on failure.
  const nextLocale = safeNext.split("/")[1];
  const locale = hasLocale(routing.locales, nextLocale)
    ? nextLocale
    : routing.defaultLocale;
  const signIn = safeNext.includes("/admin")
    ? `/${locale}/admin/prijava`
    : `/${locale}/dashboard/prijava`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  return NextResponse.redirect(`${origin}${signIn}?error=auth`);
}
