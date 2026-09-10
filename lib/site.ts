/**
 * Canonical site origin, no trailing slash. NEXT_PUBLIC_SITE_URL wins; on
 * Vercel the production host is the fallback so OAuth callbacks and
 * absolute links never point at localhost by accident. Local dev stays on
 * localhost:3000.
 */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

/**
 * Where a request should be sent so that it runs on the canonical host, or
 * null when it already does (or when there is no canonical host to enforce).
 *
 * Auth cookies are per host: a session on santamore.vercel.app is invisible
 * on www.santamore.me, and the apex and www hosts are two jars as well. A
 * magic link that lands on one alias and a Strava callback that returns to
 * another produces a sign-in loop, so production serves exactly one host
 * and every alias is a 308 to it. Preview deployments keep their own hosts.
 */
export function canonicalRedirect({
  canonicalOrigin,
  host,
  pathname,
  search,
  production,
}: {
  canonicalOrigin: string;
  host: string | null;
  pathname: string;
  search: string;
  production: boolean;
}): string | null {
  if (!production || !host) return null;
  let canonical: URL;
  try {
    canonical = new URL(canonicalOrigin);
  } catch {
    return null;
  }
  if (canonical.hostname === "localhost") return null;
  if (host.toLowerCase() === canonical.host.toLowerCase()) return null;
  return `${canonical.origin}${pathname}${search}`;
}

/** Supabase PKCE auth codes are UUIDs; anything else is some other "code". */
const AUTH_CODE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A magic link whose redirect URL is not on the Supabase allow-list falls
 * back to the project's Site URL, which drops our /api/auth/callback path
 * and leaves "?code=…" on whatever page that is. Recover it: send the code
 * to the exchange route with the runner console as the destination.
 */
export function strayAuthCodeRedirect({
  pathname,
  code,
  locale,
}: {
  pathname: string;
  code: string | null;
  locale: string;
}): string | null {
  if (!code || !AUTH_CODE.test(code)) return null;
  if (pathname.startsWith("/api/")) return null;
  const next = `/${locale}/dashboard`;
  return `/api/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`;
}
