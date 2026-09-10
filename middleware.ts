import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { canonicalRedirect, siteOrigin, strayAuthCodeRedirect } from "./lib/site";

const intlMiddleware = createMiddleware(routing);

const locales = routing.locales.join("|");
const ADMIN_PATH = new RegExp(`^/(${locales})/admin(/|$)`);
const DASHBOARD_PATH = new RegExp(`^/(${locales})/dashboard(/|$)`);
const LOGIN_PATH = new RegExp(`^/(${locales})/(admin|dashboard)/prijava(/|$)`);

/**
 * One production host, i18n routing, Supabase session refresh, and a first
 * gate on /admin and /dashboard — a convenience only: real access control
 * is the is_staff() RLS policies and the layouts' own checks (hiding UI is
 * not access control).
 */
export default async function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // Every alias (apex, *.vercel.app) is a 308 to the canonical host, so a
  // session cookie set by the magic link is the one the Strava callback
  // and every later request will see.
  const canonical = canonicalRedirect({
    canonicalOrigin: siteOrigin(),
    host: request.headers.get("host"),
    pathname,
    search,
    production: process.env.VERCEL_ENV === "production",
  });
  if (canonical) {
    return NextResponse.redirect(canonical, 308);
  }

  // A magic link that fell back to the Supabase Site URL arrives as
  // "/?code=…" — hand the code to the exchange route instead of dropping it.
  const stray = strayAuthCodeRedirect({
    pathname,
    code: searchParams.get("code"),
    locale: (() => {
      const first = pathname.split("/")[1];
      return routing.locales.includes(first as (typeof routing.locales)[number])
        ? first
        : routing.defaultLocale;
    })(),
  });
  if (stray) {
    return NextResponse.redirect(new URL(stray, request.url));
  }

  const response = intlMiddleware(request);
  const isAdminPath = ADMIN_PATH.test(pathname) || DASHBOARD_PATH.test(pathname);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  // Anonymous visitors on public pages never need the auth round-trip.
  const hasAuthCookies = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-"));
  if (!isAdminPath && !hasAuthCookies) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        // Rotated tokens must reach BOTH sides: the request, so server
        // components in this same render read the fresh session instead of
        // re-consuming the spent refresh token, and the response, so the
        // browser stores it.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes expiring auth cookies for signed-in users on every route.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminPath && !LOGIN_PATH.test(pathname) && !user) {
    const locale = pathname.split("/")[1];
    const login = DASHBOARD_PATH.test(pathname)
      ? `/${locale}/dashboard/prijava`
      : `/${locale}/admin/prijava`;
    return NextResponse.redirect(new URL(login, request.url));
  }

  return response;
}

export const config = {
  // Skip API routes, Next internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
