import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  return NextResponse.redirect(`${origin}/me/admin/prijava?error=auth`);
}
