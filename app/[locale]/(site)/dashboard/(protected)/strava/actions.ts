"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { deauthorize } from "@/lib/strava/api";
import {
  connectionForUser,
  forgetAthlete,
  freshAccessToken,
  localToday,
  syncRecent,
} from "@/lib/strava/sync";
import { createClient } from "@/lib/supabase/server";

export interface StravaActionResult {
  ok: boolean;
  error?: "server" | "not_connected" | "throttled";
  imported?: number;
  awards?: number;
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Revoke at Strava, then delete tokens and Strava-sourced activities (API Agreement §4.4). */
export async function disconnectStrava(): Promise<StravaActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "server" };
  const connection = await connectionForUser(userId);
  if (!connection) return { ok: false, error: "not_connected" };
  try {
    await deauthorize(await freshAccessToken(connection).catch(() => connection.access_token));
  } catch {
    // Strava unreachable — we still forget the athlete locally.
  }
  await forgetAthlete(userId);
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

/** Consent to appear on public challenge standings; owner-updatable column. */
export async function setStravaSharing(input: unknown): Promise<StravaActionResult> {
  const parsed = z.object({ share: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "server" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "server" };
  const { error } = await supabase
    .from("strava_connections")
    .update({ share_public: parsed.data.share })
    .eq("user_id", user.id)
    .select("user_id")
    .single();
  if (error) return { ok: false, error: "server" };
  revalidatePath("/[locale]/dashboard/strava", "page");
  return { ok: true };
}

/** Manual pull of the last 7 days; at most once per 10 minutes per athlete (rate limits). */
export async function syncStravaNow(): Promise<StravaActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "server" };
  const supabase = await createClient();
  const { data: meta } = await supabase
    .from("strava_connections")
    .select("last_sync_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!meta) return { ok: false, error: "not_connected" };
  if (meta.last_sync_at && Date.now() - new Date(meta.last_sync_at).getTime() < 10 * 60 * 1000) {
    return { ok: false, error: "throttled" };
  }
  const connection = await connectionForUser(userId);
  if (!connection) return { ok: false, error: "not_connected" };
  try {
    const result = await syncRecent(connection, 7, localToday());
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true, ...result };
  } catch (error) {
    console.error("[strava] manual sync failed:", error);
    return { ok: false, error: "server" };
  }
}
