import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

/**
 * PKCE code exchange for the magic-link sign-in. The link's redirect URL
 * must be allowed under Authentication → URL Configuration in the Supabase
 * dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/me/admin";
  // Internal paths only — never an open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/me/admin";
  // Keep the admin in their own language, including on failure.
  const nextLocale = safeNext.split("/")[1];
  const locale = hasLocale(routing.locales, nextLocale)
    ? nextLocale
    : routing.defaultLocale;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  return NextResponse.redirect(`${origin}/${locale}/admin/prijava?error=auth`);
}
