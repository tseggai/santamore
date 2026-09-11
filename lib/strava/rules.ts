import { createHmac, timingSafeEqual } from "node:crypto";

// Pure Strava helpers — no I/O, unit-tested. API facts here come from
// developers.strava.com (docs/STRAVA.md has the sources and dates).

/** The subset of a Strava SummaryActivity / DetailedActivity we store. */
export interface StravaActivity {
  id: number;
  name?: string;
  sport_type?: string;
  type?: string;
  distance?: number; // metres, float
  moving_time?: number; // seconds
  elapsed_time?: number;
  total_elevation_gain?: number; // metres, float
  start_date: string; // UTC ISO
  start_date_local?: string; // athlete-local ISO, "Z" suffix but local clock
  timezone?: string;
  manual?: boolean;
  trainer?: boolean;
  private?: boolean;
  athlete?: { id: number };
}

export interface ActivityRow {
  source: "strava";
  external_id: string;
  sport_type: string;
  name: string | null;
  started_at: string;
  started_on: string;
  distance_m: number;
  moving_time_s: number;
  elevation_m: number;
  /** Typed in by hand on Strava (no device recording). Never qualifies unless the challenge allows manual entries. */
  is_manual: boolean;
}

/**
 * Strava's `sport_type` is the specific one ("TrailRun"); older payloads
 * carry only `type` ("Run"). Normalise to the sport_type vocabulary so a
 * challenge's `sport_types` list matches either.
 */
export function normalizeSportType(activity: Pick<StravaActivity, "sport_type" | "type">): string {
  const raw = (activity.sport_type ?? activity.type ?? "").replace(/\s+/g, "");
  return raw || "Workout";
}

/** Map a Strava activity to our activities row. Integers only. */
export function mapStravaActivity(activity: StravaActivity): ActivityRow {
  const local = activity.start_date_local ?? activity.start_date;
  return {
    source: "strava",
    external_id: String(activity.id),
    sport_type: normalizeSportType(activity),
    name: activity.name?.trim() ? activity.name.trim().slice(0, 200) : null,
    started_at: new Date(activity.start_date).toISOString(),
    // The athlete's own calendar day decides "a 5 km run per day".
    started_on: local.slice(0, 10),
    distance_m: Math.max(0, Math.round(activity.distance ?? 0)),
    moving_time_s: Math.max(0, Math.round(activity.moving_time ?? 0)),
    elevation_m: Math.max(0, Math.round(activity.total_elevation_gain ?? 0)),
    is_manual: activity.manual === true,
  };
}

export interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, string>;
}

/**
 * Strava events carry no id; this key makes the handler idempotent across
 * Strava's retries (same event, same time) while still processing a later
 * update of the same activity.
 */
export function webhookEventKey(event: StravaWebhookEvent): string {
  return `strava:${event.object_type}:${event.object_id}:${event.aspect_type}:${event.event_time}`;
}

/** The subscription handshake: echo hub.challenge only for our token. */
export function verifyHandshake(
  params: URLSearchParams,
  verifyToken: string,
): { ok: true; challenge: string } | { ok: false } {
  if (!verifyToken) return { ok: false };
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token") ?? "";
  const challenge = params.get("hub.challenge") ?? "";
  if (mode !== "subscribe" || !challenge) return { ok: false };
  const a = Buffer.from(token);
  const b = Buffer.from(verifyToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  return { ok: true, challenge };
}

export interface OAuthState {
  userId: string;
  locale: string;
  sharePublic: boolean;
  /** Unix seconds. */
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** HMAC-signed OAuth `state`: ties the callback to the session that started it. */
export function signState(state: OAuthState, secret: string): string {
  const body = b64url(JSON.stringify(state));
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyState(
  value: string | null,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): OAuthState | null {
  if (!value || !secret) return null;
  const [body, mac] = value.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as OAuthState;
    if (typeof parsed.userId !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** "activity:read" or "activity:read_all" must have been granted. */
export function hasActivityScope(scope: string | null | undefined): boolean {
  return (scope ?? "")
    .split(/[ ,]+/)
    .some((part) => part === "activity:read" || part === "activity:read_all");
}
