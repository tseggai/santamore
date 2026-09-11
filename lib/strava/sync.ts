import "server-only";

import { getActivity, listActivities, refreshTokens } from "@/lib/strava/api";
import { mapStravaActivity, type StravaActivity } from "@/lib/strava/rules";
import { createServiceClient } from "@/lib/supabase/admin";

// Service-role sync: tokens live in strava_connections, which no client
// role can read. Every function here takes a user id, never a token from
// outside.

const DAY_S = 86_400;

export interface Connection {
  user_id: string;
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/** Podgorica calendar day for "today", as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Podgorica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function connectionForUser(userId: string): Promise<Connection | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("strava_connections")
    .select("user_id, athlete_id, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Connection | null) ?? null;
}

/**
 * Opening the Strava page refreshes the athlete's data when the last sync
 * is older than an hour — the webhook covers the live case, this covers
 * the gaps (events missed while the subscription was down, edits). Errors
 * are logged and swallowed: a stale page beats an error page.
 */
export async function syncIfStale(
  userId: string,
  lastSyncAt: string | null,
  maxAgeMinutes = 60,
): Promise<boolean> {
  const age = lastSyncAt ? Date.now() - new Date(lastSyncAt).getTime() : Infinity;
  if (age < maxAgeMinutes * 60 * 1000) return false;
  const connection = await connectionForUser(userId);
  if (!connection) return false;
  try {
    await syncRecent(connection, 7, localToday());
    return true;
  } catch (error) {
    console.error("[strava] background sync failed:", error);
    return false;
  }
}

export async function connectionForAthlete(athleteId: number): Promise<Connection | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("strava_connections")
    .select("user_id, athlete_id, access_token, refresh_token, expires_at")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  return (data as Connection | null) ?? null;
}

/** A valid access token, refreshing (and persisting) when within 5 minutes of expiry. */
export async function freshAccessToken(connection: Connection): Promise<string> {
  const expiresAt = new Date(connection.expires_at).getTime();
  if (expiresAt - Date.now() > 5 * 60 * 1000) return connection.access_token;
  const tokens = await refreshTokens(connection.refresh_token);
  const service = createServiceClient();
  await service
    .from("strava_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    })
    .eq("user_id", connection.user_id);
  return tokens.access_token;
}

/**
 * With one page per event, an activity counts for the runner's page on a
 * CHALLENGE event whose window contains it; otherwise it belongs to no
 * page (it can still earn perks).
 */
export async function pageForActivities(userId: string, startedAt: string): Promise<string | null> {
  const service = createServiceClient();
  const { data: pages } = await service
    .from("fundraisers")
    .select("id, event:events(kind, starts_at, ends_at)")
    .eq("user_id", userId);
  const at = new Date(startedAt).getTime();
  for (const page of pages ?? []) {
    const event = Array.isArray(page.event) ? page.event[0] : page.event;
    if (!event || event.kind !== "challenge") continue;
    const starts = event.starts_at ? new Date(event.starts_at).getTime() : -Infinity;
    const ends = event.ends_at ? new Date(event.ends_at).getTime() : Infinity;
    if (at >= starts - 86_400_000 && at <= ends + 86_400_000) return page.id;
  }
  return null;
}

/**
 * Upsert one Strava activity for a user and return our row id. Attaches
 * the user's fundraiser page (if any) so challenge-event standings see it.
 */
export async function importActivity(
  userId: string,
  activity: StravaActivity,
): Promise<string | null> {
  const service = createServiceClient();
  const row = mapStravaActivity(activity);
  const pageId = await pageForActivities(userId, row.started_at);
  const { data, error } = await service
    .from("activities")
    .upsert(
      { ...row, user_id: userId, fundraiser_id: pageId },
      { onConflict: "source,external_id" },
    )
    .select("id")
    .single();
  if (error) {
    console.error("[strava] activity upsert failed:", error.code);
    return null;
  }
  return data.id;
}

/** Run the perks engine for one activity; returns awards created. */
export async function evaluatePerks(activityId: string): Promise<number> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("evaluate_activity_perks", {
    p_activity_id: activityId,
  });
  if (error) {
    console.error("[strava] perk evaluation failed:", error.code);
    return 0;
  }
  return Number(data ?? 0);
}

/**
 * Pull the last `days` days for a user (two pages max — a hobby athlete's
 * month) and evaluate perks for activities from `evaluateFrom` (local
 * date) onward, so connecting today never mints rewards for old runs.
 */
export async function syncRecent(
  connection: Connection,
  days: number,
  evaluateFrom: string,
): Promise<{ imported: number; awards: number }> {
  const token = await freshAccessToken(connection);
  const after = Math.floor(Date.now() / 1000) - days * DAY_S;
  let imported = 0;
  let awards = 0;
  for (let page = 1; page <= 2; page += 1) {
    const activities = await listActivities(token, after, page, 50);
    for (const activity of activities) {
      const id = await importActivity(connection.user_id, activity);
      if (!id) continue;
      imported += 1;
      const row = mapStravaActivity(activity);
      if (row.started_on >= evaluateFrom) awards += await evaluatePerks(id);
    }
    if (activities.length < 50) break;
  }
  const service = createServiceClient();
  await service
    .from("strava_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", connection.user_id);
  return { imported, awards };
}

/** Fetch one activity by Strava id (webhook create/update) and evaluate it. */
export async function syncOne(
  connection: Connection,
  stravaActivityId: number,
): Promise<{ imported: boolean; awards: number }> {
  const token = await freshAccessToken(connection);
  const activity = await getActivity(token, stravaActivityId);
  if (!activity) return { imported: false, awards: 0 };
  const id = await importActivity(connection.user_id, activity);
  if (!id) return { imported: false, awards: 0 };
  return { imported: true, awards: await evaluatePerks(id) };
}

/** Athlete deleted an activity on Strava: drop it and revoke unredeemed awards. */
export async function removeActivity(stravaActivityId: number): Promise<void> {
  const service = createServiceClient();
  const { data: row } = await service
    .from("activities")
    .select("id")
    .eq("source", "strava")
    .eq("external_id", String(stravaActivityId))
    .maybeSingle();
  if (!row) return;
  await service
    .from("perk_awards")
    .update({ status: "revoked" })
    .eq("activity_id", row.id)
    .eq("status", "issued");
  await service.from("activities").delete().eq("id", row.id);
}

/** Strava API Agreement §4.4: on deauthorisation, delete the athlete's Strava data. */
export async function forgetAthlete(userId: string): Promise<void> {
  const service = createServiceClient();
  await service.from("activities").delete().eq("user_id", userId).eq("source", "strava");
  await service.from("strava_connections").delete().eq("user_id", userId);
}
