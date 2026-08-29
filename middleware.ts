import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const locales = routing.locales.join("|");
const ADMIN_PATH = new RegExp(`^/(${locales})/admin(/|$)`);
const LOGIN_PATH = new RegExp(`^/(${locales})/admin/prijava(/|$)`);

/**
 * i18n routing plus Supabase session refresh, and a first gate on /admin —
 * a convenience only: real access control is the is_staff() RLS policies
 * and the admin layout's role check (hiding UI is not access control).
 */
export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes expiring auth cookies onto the response for every route.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (ADMIN_PATH.test(pathname) && !LOGIN_PATH.test(pathname) && !user) {
    const locale = pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${locale}/admin/prijava`, request.url));
  }

  return response;
}

export const config = {
  // Skip API routes, Next internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
