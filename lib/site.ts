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
