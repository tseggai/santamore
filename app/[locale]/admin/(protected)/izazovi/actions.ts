"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createSubscription,
  deleteSubscription,
  stravaConfig,
  viewSubscriptions,
} from "@/lib/strava/api";
import { siteOrigin } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; perk_challenges_staff_* policies enforce. The
// Strava subscription calls need the server-only client secret and are
// gated on a server-side staff check here since they never touch RLS.

export interface PerkActionResult {
  ok: boolean;
  error?: "invalid" | "slug" | "server" | "forbidden" | "unconfigured";
  message?: string;
}

const isoDate = z.string().datetime({ offset: true });
const SPORTS = ["Run", "TrailRun", "VirtualRun", "Walk", "Hike", "Ride", "Swim"] as const;

const challengeSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(100),
  partnerName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullable(),
  rewardLabel: z.string().trim().min(1).max(120),
  sportTypes: z.array(z.enum(SPORTS)).min(1),
  minDistanceM: z.number().int().min(0).max(1_000_000),
  maxMovingTimeS: z.number().int().min(60).max(86_400).nullable(),
  minElevationM: z.number().int().min(0).max(20_000),
  maxPaceSPerKm: z.number().int().min(120).max(3600).nullable(),
  requiredDays: z.number().int().min(1).max(365),
  windowDays: z.number().int().min(1).max(365).nullable(),
  partnerUrl: z.string().trim().url().max(300).nullable(),
  allowManual: z.boolean(),
  perUserDailyCap: z.number().int().min(1).max(20),
  dailyCap: z.number().int().min(1).max(10_000).nullable(),
  validDays: z.number().int().min(1).max(365),
  startsAt: isoDate.nullable(),
  endsAt: isoDate.nullable(),
  isActive: z.boolean(),
  /** Set or reset the partner's PIN; empty = leave as is. */
  pin: z.string().regex(/^([0-9]{4,8})?$/),
});

export async function savePerkChallenge(input: unknown): Promise<PerkActionResult> {
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const slug = slugify(data.slug, "");
  if (!slug) return { ok: false, error: "invalid" };

  const row = {
    slug,
    partner_name: data.partnerName,
    title: data.title,
    description: data.description,
    reward_label: data.rewardLabel,
    sport_types: data.sportTypes,
    min_distance_m: data.minDistanceM,
    max_moving_time_s: data.maxMovingTimeS,
    min_elevation_m: data.minElevationM,
    max_pace_s_per_km: data.maxPaceSPerKm,
    required_days: data.requiredDays,
    window_days: data.requiredDays > 1 ? data.windowDays : null,
    partner_url: data.partnerUrl,
    allow_manual: data.allowManual,
    per_user_daily_cap: data.perUserDailyCap,
    daily_cap: data.dailyCap,
    valid_days: data.validDays,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    is_active: data.isActive,
  };

  const supabase = await createClient();
  const { data: saved, error } = data.id
    ? await supabase.from("perk_challenges").update(row).eq("id", data.id).select("id").single()
    : await supabase.from("perk_challenges").insert(row).select("id").single();
  if (error || !saved) {
    if (error?.code === "23505") return { ok: false, error: "slug" };
    console.error("[admin] perk challenge save failed:", error?.code);
    return { ok: false, error: "server" };
  }

  if (data.pin) {
    const { error: pinError } = await supabase.rpc("set_perk_challenge_pin", {
      p_id: saved.id,
      p_pin: data.pin,
    });
    if (pinError) {
      console.error("[admin] perk pin failed:", pinError.code);
      return { ok: false, error: "server" };
    }
  }

  revalidatePath("/[locale]/admin/izazovi", "page");
  revalidatePath("/[locale]/izazovi", "layout");
  return { ok: true };
}

async function requireStaff(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" || data?.role === "chapter_lead";
}

export interface WebhookStatus {
  configured: boolean;
  subscriptions: { id: number; callback_url: string }[];
  expectedCallback: string;
  error?: string;
}

/** What Strava currently has for our app (one subscription per app). */
export async function stravaWebhookStatus(): Promise<WebhookStatus> {
  const expectedCallback = `${siteOrigin()}/api/webhooks/strava`;
  if (!(await requireStaff())) return { configured: false, subscriptions: [], expectedCallback };
  const config = stravaConfig();
  if (!config.configured || !config.verifyToken) {
    return { configured: false, subscriptions: [], expectedCallback };
  }
  try {
    const subscriptions = await viewSubscriptions();
    return { configured: true, subscriptions, expectedCallback };
  } catch (error) {
    return {
      configured: true,
      subscriptions: [],
      expectedCallback,
      error: error instanceof Error ? error.message : "error",
    };
  }
}

/** Register (or re-register) the webhook for this site's callback URL. */
export async function registerStravaWebhook(): Promise<PerkActionResult> {
  if (!(await requireStaff())) return { ok: false, error: "forbidden" };
  const config = stravaConfig();
  if (!config.configured || !config.verifyToken) return { ok: false, error: "unconfigured" };
  const callback = `${siteOrigin()}/api/webhooks/strava`;
  try {
    const existing = await viewSubscriptions();
    for (const subscription of existing) {
      if (subscription.callback_url !== callback) await deleteSubscription(subscription.id);
    }
    if (!existing.some((subscription) => subscription.callback_url === callback)) {
      await createSubscription(callback);
    }
    revalidatePath("/[locale]/admin/izazovi", "page");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: "server", message: error instanceof Error ? error.message : "" };
  }
}
