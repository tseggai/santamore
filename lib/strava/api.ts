import "server-only";

import type { StravaActivity } from "@/lib/strava/rules";

// Strava v3 endpoints (developers.strava.com, fetched 2026-09-10; see
// docs/STRAVA.md). Client id/secret are server-only and never reach the
// browser. Rate limits: 100 read requests / 15 min and 1,000 / day by
// default — every call here is one request, so sync sparingly.

const AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/api/v3/oauth/token";
const DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize";
const API = "https://www.strava.com/api/v3";

export const STRAVA_SCOPE = "read,activity:read";

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  scope?: string;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

export function stravaConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID ?? "";
  const clientSecret = process.env.STRAVA_CLIENT_SECRET ?? "";
  const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? "";
  return { clientId, clientSecret, verifyToken, configured: Boolean(clientId && clientSecret) };
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const { clientId } = stravaConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPE,
    state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

export class StravaError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function tokenRequest(body: Record<string, string>): Promise<StravaTokens> {
  const { clientId, clientSecret } = stravaConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...body }),
    cache: "no-store",
  });
  if (!response.ok) throw new StravaError(`token ${response.status}`, response.status);
  return (await response.json()) as StravaTokens;
}

export function exchangeCode(code: string): Promise<StravaTokens> {
  return tokenRequest({ code, grant_type: "authorization_code" });
}

export function refreshTokens(refreshToken: string): Promise<StravaTokens> {
  return tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
}

export async function deauthorize(accessToken: string): Promise<void> {
  await fetch(DEAUTHORIZE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ access_token: accessToken }),
    cache: "no-store",
  }).catch(() => null);
}

async function apiGet<T>(accessToken: string, path: string): Promise<T | null> {
  const response = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  // 404 = deleted or not visible under the granted scope; treat as absent.
  if (response.status === 404) return null;
  if (!response.ok) throw new StravaError(`api ${response.status}`, response.status);
  return (await response.json()) as T;
}

export function getActivity(accessToken: string, id: number | string) {
  return apiGet<StravaActivity>(accessToken, `/activities/${id}`);
}

/** Up to `perPage` activities after a unix timestamp (newest first from Strava). */
export async function listActivities(
  accessToken: string,
  afterUnix: number,
  page = 1,
  perPage = 50,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    after: String(afterUnix),
    page: String(page),
    per_page: String(perPage),
  });
  return (await apiGet<StravaActivity[]>(accessToken, `/athlete/activities?${params}`)) ?? [];
}

// ── Webhook subscription (one per application) ───────────────────────────

export interface StravaSubscription {
  id: number;
  callback_url: string;
  created_at?: string;
}

export async function viewSubscriptions(): Promise<StravaSubscription[]> {
  const { clientId, clientSecret } = stravaConfig();
  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  const response = await fetch(`${API}/push_subscriptions?${params}`, { cache: "no-store" });
  if (!response.ok) throw new StravaError(`subscriptions ${response.status}`, response.status);
  return (await response.json()) as StravaSubscription[];
}

export async function createSubscription(callbackUrl: string): Promise<StravaSubscription> {
  const { clientId, clientSecret, verifyToken } = stravaConfig();
  const response = await fetch(`${API}/push_subscriptions`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: callbackUrl,
      verify_token: verifyToken,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new StravaError(`subscribe ${response.status} ${text.slice(0, 200)}`, response.status);
  }
  return (await response.json()) as StravaSubscription;
}

export async function deleteSubscription(id: number): Promise<void> {
  const { clientId, clientSecret } = stravaConfig();
  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  const response = await fetch(`${API}/push_subscriptions/${id}?${params}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!response.ok && response.status !== 204) {
    throw new StravaError(`unsubscribe ${response.status}`, response.status);
  }
}
