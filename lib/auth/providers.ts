export type OAuthProvider = "google" | "apple";

const KNOWN: OAuthProvider[] = ["google", "apple"];

/**
 * Which social sign-ins the form offers, from NEXT_PUBLIC_AUTH_PROVIDERS
 * ("google,apple"). Empty until the provider is configured in Supabase
 * and in the vendor console (docs/DEPLOY.md) — a button that leads to a
 * vendor error page is worse than no button.
 */
export function enabledOAuthProviders(raw = process.env.NEXT_PUBLIC_AUTH_PROVIDERS): OAuthProvider[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is OAuthProvider => (KNOWN as string[]).includes(value));
}
