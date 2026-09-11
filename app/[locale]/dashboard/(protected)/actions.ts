"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";
import { generatePaymentReference } from "@/lib/references";
import { slugify } from "@/lib/slug";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Reads/updates run with the RUNNER'S OWN session — the owner policies and
// column-level grants from migration 0005 are the barrier. The service role
// appears only where migration 0005 demands it: creating rows, because the
// payment reference and slug are minted server-side and clients hold no
// insert grant.
//
// A runner can hold one page per event (migration 0010) and captain any
// number of teams, so every page-level action names the page it targets
// and the ownership filter is always `user_id = session user` too.

export interface DashboardActionResult {
  ok: boolean;
  slug?: string;
  error?: "incomplete" | "server" | "invalid";
}

const createPageSchema = z.object({
  title: z.string().trim().min(2).max(80),
  /** Which event to raise for; null = the next upcoming published one. */
  eventSlug: z.string().trim().min(1).max(100).nullable().optional(),
});

// "<uploader-folder>/<file>" as written by the editor's upload; ownership
// is re-checked against the session — never trust client input.
const ownedPhotoPath = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,100}$/i)
  .nullable();

const updatePageSchema = z.object({
  fundraiserId: z.string().uuid(),
  title: z.string().trim().min(2).max(80),
  story: z.string().trim().max(2000),
  goalCents: z.number().int().min(0).max(MAX_CENTS).nullable(),
  teamId: z.string().uuid().nullable(),
  photoPath: ownedPhotoPath,
});

const teamFieldsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(600).default(""),
  photoPath: ownedPhotoPath.default(null),
});

const createTeamSchema = teamFieldsSchema.extend({
  eventId: z.string().uuid(),
  /** Join this page (must be the runner's, on the same event) right away. */
  joinFundraiserId: z.string().uuid().nullable().default(null),
});

const updateTeamSchema = teamFieldsSchema.extend({
  teamId: z.string().uuid(),
});

const cashSchema = z.object({
  fundraiserId: z.string().uuid(),
  amountCents: z.number().int().min(100).max(MAX_CENTS),
});

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function randomSuffix(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function ownsPhoto(userId: string, photoPath: string | null): boolean {
  // The photo must live in THIS runner's storage folder — the same rule
  // the bucket policies enforced at upload time.
  return photoPath === null || photoPath.startsWith(`${userId}/`);
}

/** One page per runner per event: idempotently returns that event's page slug. */
export async function createFundraiserPage(
  input: unknown,
): Promise<DashboardActionResult> {
  const parsed = createPageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };

  try {
    const service = createServiceClient();
    let event: { id: string } | null = null;
    if (parsed.data.eventSlug) {
      // A chosen event must be published — the slug is client input.
      const { data } = await service
        .from("events")
        .select("id")
        .eq("slug", parsed.data.eventSlug)
        .eq("is_published", true)
        .maybeSingle();
      event = data;
    } else {
      // The next upcoming published event; if none is scheduled yet, the
      // most recent one (never a long-finished event ahead of a current one).
      const { data: upcoming } = await service
        .from("events")
        .select("id")
        .eq("is_published", true)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      event = upcoming
        ? upcoming
        : (
            await service
              .from("events")
              .select("id")
              .eq("is_published", true)
              .order("starts_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          ).data;
    }
    if (!event) return { ok: false, error: "invalid" };

    const { data: existing } = await supabase
      .from("fundraisers")
      .select("slug")
      .eq("user_id", user.id)
      .eq("event_id", event.id)
      .maybeSingle();
    if (existing) return { ok: true, slug: existing.slug };

    // The page title is the runner's name; remember it on the profile too
    // (own-row update grant on full_name) if they haven't set one.
    await supabase
      .from("profiles")
      .update({ full_name: parsed.data.title })
      .eq("id", user.id)
      .is("full_name", null);

    const base = slugify(parsed.data.title, "trkac");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`;
      const { error } = await service.from("fundraisers").insert({
        user_id: user.id,
        event_id: event.id,
        slug,
        title: parsed.data.title,
        payment_reference: generatePaymentReference(),
        status: "draft",
      });
      if (!error) {
        revalidatePath("/[locale]/dashboard", "layout");
        return { ok: true, slug };
      }
      // 23505: slug/reference collision; P0001: cross-table reference
      // trigger. Both warrant a fresh mint.
      if (error.code !== "23505" && error.code !== "P0001") {
        console.error("[dashboard] page create failed:", error.code);
        return { ok: false, error: "server" };
      }
    }
    return { ok: false, error: "server" };
  } catch (error) {
    console.error("[dashboard] page create failed:", error);
    return { ok: false, error: "server" };
  }
}

export async function updateFundraiserPage(
  input: unknown,
): Promise<DashboardActionResult> {
  const parsed = updatePageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };
  if (!ownsPhoto(user.id, parsed.data.photoPath)) return { ok: false, error: "invalid" };

  const { error } = await supabase
    .from("fundraisers")
    .update({
      title: parsed.data.title,
      story: parsed.data.story === "" ? null : parsed.data.story,
      goal_cents: parsed.data.goalCents,
      team_id: parsed.data.teamId,
      photo_path: parsed.data.photoPath,
    })
    .eq("id", parsed.data.fundraiserId)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error) {
    // P0001: the integrity trigger — an ACTIVE page cannot lose its photo,
    // goal or story; unpublish first.
    if (error.code === "P0001") return { ok: false, error: "incomplete" };
    console.error("[dashboard] page update failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

/** Publish / unpublish one page. The DB gate (photo + goal + story) is the truth. */
export async function setFundraiserStatus(input: unknown): Promise<DashboardActionResult> {
  const parsed = z
    .object({ fundraiserId: z.string().uuid(), publish: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };

  const { error } = await supabase
    .from("fundraisers")
    .update({ status: parsed.data.publish ? "active" : "draft" })
    .eq("id", parsed.data.fundraiserId)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error) {
    // P0001 = the publish-gate trigger refused an incomplete page.
    return { ok: false, error: error.code === "P0001" ? "incomplete" : "server" };
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

const activitySchema = z
  .object({
    km: z.string().trim().max(10),
    minutes: z.string().trim().max(10),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** The page (challenge event) this entry counts for; null = none. */
    fundraiserId: z.string().uuid().nullable().default(null),
  })
  .refine((data) => data.km !== "" || data.minutes !== "", {
    message: "distance or time required",
  });

/**
 * Manual challenge activity (owner decision: challenges rank by distance,
 * time or frequency). Runs under the RUNNER'S session — the
 * activities_owner_insert policy is the barrier, and only 'manual' rows
 * can be created or deleted by owners (Strava rows arrive synced).
 */
export async function logActivity(input: unknown): Promise<DashboardActionResult> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };

  const km = parsed.data.km === "" ? 0 : Number(parsed.data.km.replace(",", "."));
  const minutes = parsed.data.minutes === "" ? 0 : Number(parsed.data.minutes);
  if (
    !Number.isFinite(km) ||
    km < 0 ||
    km > 1000 ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 24 * 60
  ) {
    return { ok: false, error: "invalid" };
  }

  const { error } = await supabase.from("activities").insert({
    user_id: user.id,
    fundraiser_id: parsed.data.fundraiserId,
    source: "manual",
    is_manual: true,
    sport_type: "Run",
    started_at: `${parsed.data.date}T12:00:00Z`,
    started_on: parsed.data.date,
    distance_m: Math.round(km * 1000),
    moving_time_s: minutes * 60,
  });
  if (error) {
    console.error("[dashboard] activity log failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

export async function deleteActivity(input: unknown): Promise<DashboardActionResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };
  // RLS: owners can delete only their own manual entries.
  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "server" };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

/**
 * Log cash collected by hand (brief §10): a pending 'cash' donation that
 * hits the leaderboard only once an admin confirms the hand-in. Insert is
 * service-role (donations take no client writes) after verifying the
 * session owns the page; anonymous — hand collections have no single donor.
 */
export async function logCash(input: unknown): Promise<DashboardActionResult> {
  const parsed = cashSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { user } = await currentUser();
  if (!user) return { ok: false, error: "server" };

  try {
    const service = createServiceClient();
    const { data: mine } = await service
      .from("fundraisers")
      .select("id, event:events(chapter_id)")
      .eq("id", parsed.data.fundraiserId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!mine) return { ok: false, error: "invalid" };
    const event = Array.isArray(mine.event) ? mine.event[0] : mine.event;

    const { error } = await service.from("donations").insert({
      amount_cents: parsed.data.amountCents,
      fee_covered_cents: 0,
      fundraiser_id: mine.id,
      chapter_id: event?.chapter_id ?? null,
      is_anonymous: true,
      rail: "cash",
      status: "pending",
    });
    if (error) {
      console.error("[dashboard] cash log failed:", error.code);
      return { ok: false, error: "server" };
    }
    revalidatePath("/[locale]/dashboard/gotovina", "page");
    return { ok: true };
  } catch (error) {
    console.error("[dashboard] cash log failed:", error);
    return { ok: false, error: "server" };
  }
}

/**
 * Create a team (name, photo, description) on an event and captain it;
 * optionally join it with one of the runner's pages on that event.
 */
export async function createTeam(
  input: unknown,
): Promise<DashboardActionResult & { teamId?: string }> {
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };
  if (!ownsPhoto(user.id, parsed.data.photoPath)) return { ok: false, error: "invalid" };

  try {
    const service = createServiceClient();
    const { data: event } = await service
      .from("events")
      .select("id")
      .eq("id", parsed.data.eventId)
      .eq("is_published", true)
      .maybeSingle();
    if (!event) return { ok: false, error: "invalid" };

    const base = slugify(parsed.data.name, "tim");
    let teamId: string | null = null;
    for (let attempt = 0; attempt < 5 && !teamId; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`;
      const { data, error } = await service
        .from("teams")
        .insert({
          event_id: event.id,
          name: parsed.data.name,
          slug,
          captain_id: user.id,
          description: parsed.data.description === "" ? null : parsed.data.description,
          photo_path: parsed.data.photoPath,
        })
        .select("id")
        .single();
      if (data) teamId = data.id;
      else if (error && error.code !== "23505") {
        console.error("[dashboard] team create failed:", error.code);
        return { ok: false, error: "server" };
      }
    }
    if (!teamId) return { ok: false, error: "server" };

    if (parsed.data.joinFundraiserId) {
      // Owner session: the integrity trigger refuses a page on another event.
      const { error: joinError } = await supabase
        .from("fundraisers")
        .update({ team_id: teamId })
        .eq("id", parsed.data.joinFundraiserId)
        .eq("user_id", user.id)
        .select("id")
        .single();
      if (joinError) return { ok: false, error: "server" };
    }

    revalidatePath("/[locale]/dashboard", "layout");
    // The editor keeps team membership in local state; return the id so a
    // following Save doesn't write the stale (pre-create) value back.
    return { ok: true, teamId };
  } catch (error) {
    console.error("[dashboard] team create failed:", error);
    return { ok: false, error: "server" };
  }
}

/**
 * Captain edits to a team's name, photo and description. Runs under the
 * captain's session — teams_update_captain and the column-level update
 * grant are the barrier.
 */
export async function updateTeam(
  input: unknown,
): Promise<DashboardActionResult & { teamId?: string }> {
  const parsed = updateTeamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };
  if (!ownsPhoto(user.id, parsed.data.photoPath)) return { ok: false, error: "invalid" };

  const { error } = await supabase
    .from("teams")
    .update({
      name: parsed.data.name,
      description: parsed.data.description === "" ? null : parsed.data.description,
      photo_path: parsed.data.photoPath,
    })
    .eq("id", parsed.data.teamId)
    .eq("captain_id", user.id)
    .select("id")
    .single();
  if (error) return { ok: false, error: "server" };

  revalidatePath("/[locale]/dashboard", "layout");
  revalidatePath("/[locale]/t/[slug]", "page");
  return { ok: true, teamId: parsed.data.teamId };
}
