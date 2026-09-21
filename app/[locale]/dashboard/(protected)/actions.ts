"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { causeState } from "@/lib/cause-status";
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
  error?: "incomplete" | "server" | "invalid" | "causeLocked" | "causeTaken";
}

const createPageSchema = z.object({
  title: z.string().trim().min(2).max(80),
  /** The cause to raise for; or an event, whose cause is used. Null = the next one. */
  causeSlug: z.string().trim().min(1).max(100).nullable().optional(),
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
  /** The cause the page raises for; left out, it stays as it is. */
  causeId: z.string().uuid().optional(),
});

const teamFieldsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(600).default(""),
  photoPath: ownedPhotoPath.default(null),
});

const createTeamSchema = teamFieldsSchema.extend({
  causeId: z.string().uuid(),
  /** Join this page (must be the runner's, on the same event) right away. */
  joinFundraiserId: z.string().uuid().nullable().default(null),
});

const updateTeamSchema = teamFieldsSchema.extend({
  teamId: z.string().uuid(),
});

const cashSchema = z.object({
  fundraiserId: z.string().uuid(),
  amountCents: z.number().int().min(100).max(MAX_CENTS),
  /** Who handed it over — shown on the donor wall once staff confirm; empty = anonymous. */
  donorName: z.string().trim().max(100).default(""),
  /** Where or how it was collected — for staff and the runner, never public. */
  note: z.string().trim().max(200).default(""),
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
    // A page raises for a cause; an event only points at its cause.
    let campaignId: string | null = null;
    let eventId: string | null = null;
    if (parsed.data.causeSlug) {
      const { data } = await service.from("campaigns").select("id").eq("slug", parsed.data.causeSlug).eq("is_public", true).maybeSingle();
      campaignId = data?.id ?? null;
    } else if (parsed.data.eventSlug) {
      const { data } = await service.from("events").select("id, campaign_id").eq("slug", parsed.data.eventSlug).eq("is_published", true).maybeSingle();
      campaignId = data?.campaign_id ?? null;
      eventId = data?.id ?? null;
    } else {
      // The next upcoming event with a cause, else the newest public cause.
      const { data: upcoming } = await service
        .from("events")
        .select("id, campaign_id")
        .eq("is_published", true)
        .not("campaign_id", "is", null)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (upcoming) {
        campaignId = upcoming.campaign_id;
        eventId = upcoming.id;
      } else {
        const { data: latest } = await service.from("campaigns").select("id").eq("is_public", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
        campaignId = latest?.id ?? null;
      }
    }
    if (!campaignId) return { ok: false, error: "invalid" };

    const { data: existing } = await supabase
      .from("fundraisers")
      .select("slug")
      .eq("user_id", user.id)
      .eq("campaign_id", campaignId)
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
        campaign_id: campaignId,
        event_id: eventId,
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

  // Moving the page to another cause moves nothing that already came in:
  // a page with approved gifts stays with its cause. The target must be a
  // published cause, and the team must belong to it or is dropped.
  let teamId = parsed.data.teamId;
  let causeChange: { campaign_id: string } | null = null;
  if (parsed.data.causeId) {
    const { data: current } = await supabase.from("fundraisers").select("campaign_id").eq("id", parsed.data.fundraiserId).eq("user_id", user.id).maybeSingle();
    if (!current) return { ok: false, error: "invalid" };
    if (current.campaign_id !== parsed.data.causeId) {
      const service = createServiceClient();
      const [{ count: gifts }, { data: target }] = await Promise.all([
        service.from("donations").select("id", { count: "exact", head: true }).eq("fundraiser_id", parsed.data.fundraiserId).in("status", ["approved", "refunded"]).eq("is_test", false),
        service.from("campaigns").select("id").eq("id", parsed.data.causeId).eq("is_public", true).maybeSingle(),
      ]);
      if ((gifts ?? 0) > 0) return { ok: false, error: "causeLocked" };
      if (!target) return { ok: false, error: "invalid" };
      causeChange = { campaign_id: target.id };
    }
  }
  if (teamId) {
    const { data: team } = await supabase.from("teams").select("id, campaign_id").eq("id", teamId).maybeSingle();
    const causeId = causeChange?.campaign_id ?? parsed.data.causeId ?? team?.campaign_id;
    if (!team || (team.campaign_id && team.campaign_id !== causeId)) teamId = null;
  }

  const { error } = await supabase
    .from("fundraisers")
    .update({
      title: parsed.data.title,
      story: parsed.data.story === "" ? null : parsed.data.story,
      goal_cents: parsed.data.goalCents,
      team_id: teamId,
      photo_path: parsed.data.photoPath,
      ...(causeChange ?? {}),
    })
    .eq("id", parsed.data.fundraiserId)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error) {
    // P0001: the integrity trigger — an ACTIVE page cannot lose its photo,
    // goal or story; unpublish first.
    if (error.code === "P0001") return { ok: false, error: "incomplete" };
    // One page per cause per person (migration 0024).
    if (error.code === "23505") return { ok: false, error: "causeTaken" };
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

    const donorName = parsed.data.donorName;
    const { error } = await service.from("donations").insert({
      amount_cents: parsed.data.amountCents,
      fee_covered_cents: 0,
      fundraiser_id: mine.id,
      chapter_id: event?.chapter_id ?? null,
      donor_name: donorName || null,
      display_name: donorName || null,
      is_anonymous: donorName === "",
      message: parsed.data.note || null,
      rail: "cash",
      status: "pending",
    });
    if (error) {
      console.error("[dashboard] cash log failed:", error.code);
      return { ok: false, error: "server" };
    }
    revalidatePath("/[locale]/dashboard/stranice/[slug]", "page");
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
    const { data: cause } = await service
      .from("campaigns")
      .select("id")
      .eq("id", parsed.data.causeId)
      .eq("is_public", true)
      .maybeSingle();
    if (!cause) return { ok: false, error: "invalid" };

    const base = slugify(parsed.data.name, "tim");
    let teamId: string | null = null;
    for (let attempt = 0; attempt < 5 && !teamId; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`;
      const { data, error } = await service
        .from("teams")
        .insert({
          campaign_id: cause.id,
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

/**
 * A captain deletes their own team. The database (delete_team, migration
 * 0050) unlinks the pages, keeps every euro, and refuses a team whose
 * pages took donations; "blocked" carries that count.
 */
export async function deleteMyTeam(
  input: unknown,
): Promise<DashboardActionResult & { blocked?: number }> {
  const parsed = z.object({ teamId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };
  const { data: team } = await supabase.from("teams").select("photo_path").eq("id", parsed.data.teamId).eq("captain_id", user.id).maybeSingle();
  if (!team) return { ok: false, error: "invalid" };

  const { data, error } = await supabase.rpc("delete_team", { p_id: parsed.data.teamId });
  if (error) {
    console.error("[dashboard] team delete failed:", error.code, error.message);
    return { ok: false, error: "server" };
  }
  const result = data as { ok: boolean; reason?: string; count?: number };
  if (!result.ok) return { ok: false, error: "invalid", blocked: Number(result.count ?? 0) };

  const photo = team.photo_path as string | null;
  if (photo && ownsPhoto(user.id, photo)) await supabase.storage.from("fundraiser-photos").remove([photo]);
  revalidatePath("/[locale]/dashboard", "layout");
  revalidatePath("/[locale]/t/[slug]", "page");
  revalidatePath("/[locale]/prikupljaci", "page");
  return { ok: true };
}

export interface PageEditorData {
  fundraiser: {
    id: string;
    slug: string;
    title: string;
    story: string;
    goalCents: number | null;
    photoPath: string | null;
    status: "draft" | "active" | "hidden";
    teamId: string | null;
    causeId: string;
    causeTitle: string;
    /** Staff have published the cause; until then the page cannot go live for donors. */
    causePublic: boolean;
  };
  /** The published causes still open, plus the page's own: where the page may move until a gift comes in. */
  causes: { id: string; title: string }[];
  teams: { id: string; name: string; description: string | null; photoPath: string | null }[];
  captainOf: string[];
  raisedCents: number;
  donorCount: number;
  event: { kind: string; challenge_metric: string | null } | null;
  activities: { id: string; started_at: string; distance_m: number; moving_time_s: number; source: string }[];
  cash: { id: string; amount_cents: number; status: string; created_at: string; donor_name: string | null; message: string | null }[];
}

/** Everything the page editor needs, for the hub's slide-over. Own pages only. */
export async function fetchPageEditor(slug: string): Promise<PageEditorData | null> {
  const parsed = z.string().trim().min(1).max(100).safeParse(slug);
  if (!parsed.success) return null;
  const { supabase, user } = await currentUser();
  if (!user) return null;
  const { data: mine } = await supabase
    .from("fundraisers")
    .select("id, slug, title, story, goal_cents, photo_path, status, team_id, campaign_id")
    .eq("user_id", user.id)
    .eq("slug", parsed.data)
    .maybeSingle();
  if (!mine || !mine.campaign_id) return null;

  const service = createServiceClient();
  // The cause by id, public or not: a runner may build a page on a cause
  // staff have not published yet, and the editor should still name it.
  const { data: cause } = await service.from("campaigns").select("slug, title, is_public").eq("id", mine.campaign_id).maybeSingle();
  const { data: openCauses } = await supabase.from("v_public_campaigns").select("id, title, goal_cents, raised_cents, disbursed_cents, ends_at").order("starts_at", { ascending: false, nullsFirst: false });
  const causes = ((openCauses ?? []) as { id: string; title: string; goal_cents: number | null; raised_cents: number; disbursed_cents: number | null; ends_at: string | null }[])
    .filter((row) => row.id === mine.campaign_id || !causeState(row).completed)
    .map((row) => ({ id: row.id, title: row.title }));
  if (!causes.some((row) => row.id === mine.campaign_id)) causes.unshift({ id: mine.campaign_id, title: cause?.title ?? "" });
  const [{ data: teams }, { data: captained }, { data: totals }, { data: challenge }, { data: activityRows }, { data: cashRows }] =
    await Promise.all([
      supabase.from("v_team_totals").select("id, name, description, photo_path, campaign_id").in("campaign_id", causes.map((row) => row.id)).order("name"),
      supabase.from("teams").select("id").eq("captain_id", user.id),
      supabase.from("v_fundraiser_totals").select("raised_cents, donor_count").eq("slug", mine.slug).maybeSingle(),
      // A challenge under this cause makes the activity log relevant.
      cause
        ? supabase.from("v_public_events").select("name, kind, challenge_metric").eq("campaign_slug", cause.slug).eq("kind", "challenge").order("starts_at", { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("activities")
        .select("id, started_at, distance_m, moving_time_s, source")
        .eq("fundraiser_id", mine.id)
        .order("started_at", { ascending: false })
        .limit(100),
      // The runner's own cash log: donor PII stays staff-only under RLS, so
      // this is read with the service role, restricted to their page and the
      // fields they typed themselves.
      service
        .from("donations")
        .select("id, amount_cents, status, created_at, donor_name, message")
        .eq("fundraiser_id", mine.id)
        .eq("rail", "cash")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  return {
    fundraiser: {
      id: mine.id,
      slug: mine.slug,
      title: mine.title,
      story: mine.story ?? "",
      goalCents: mine.goal_cents,
      photoPath: mine.photo_path,
      status: mine.status,
      teamId: mine.team_id,
      causeId: mine.campaign_id,
      causeTitle: cause?.title ?? "",
      causePublic: Boolean(cause?.is_public),
    },
    causes,
    teams: ((teams ?? []) as { id: string; name: string; description: string | null; photo_path: string | null; campaign_id: string | null }[]).map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      photoPath: team.photo_path,
      causeId: team.campaign_id ?? undefined,
    })),
    captainOf: (captained ?? []).map((row) => row.id),
    raisedCents: totals?.raised_cents ?? 0,
    donorCount: totals?.donor_count ?? 0,
    event: challenge ? { kind: challenge.kind, challenge_metric: challenge.challenge_metric } : null,
    activities: (activityRows ?? []) as PageEditorData["activities"],
    cash: (cashRows ?? []) as PageEditorData["cash"],
  };
}
