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

export interface DashboardActionResult {
  ok: boolean;
  slug?: string;
  error?: "incomplete" | "server" | "invalid";
}

const createPageSchema = z.object({
  title: z.string().trim().min(2).max(80),
});

const updatePageSchema = z.object({
  title: z.string().trim().min(2).max(80),
  story: z.string().trim().max(2000),
  goalCents: z.number().int().min(0).max(MAX_CENTS).nullable(),
  teamId: z.string().uuid().nullable(),
  photoPath: z.string().trim().max(300).nullable(),
});

const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

const cashSchema = z.object({
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

/** One page per runner: idempotently returns the existing page's slug. */
export async function createFundraiserPage(
  input: unknown,
): Promise<DashboardActionResult> {
  const parsed = createPageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };

  const { data: existing } = await supabase
    .from("fundraisers")
    .select("slug")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: true, slug: existing.slug };

  try {
    const service = createServiceClient();
    const { data: event } = await service
      .from("events")
      .select("id")
      .eq("is_published", true)
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!event) return { ok: false, error: "server" };

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
        revalidatePath("/[locale]/dashboard", "page");
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

  const { error } = await supabase
    .from("fundraisers")
    .update({
      title: parsed.data.title,
      story: parsed.data.story === "" ? null : parsed.data.story,
      goal_cents: parsed.data.goalCents,
      team_id: parsed.data.teamId,
      photo_path: parsed.data.photoPath,
    })
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error) {
    console.error("[dashboard] page update failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

/** Publish / unpublish. The DB gate (photo + goal + story) is the truth. */
export async function setFundraiserStatus(
  publish: boolean,
): Promise<DashboardActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };

  const { error } = await supabase
    .from("fundraisers")
    .update({ status: publish ? "active" : "draft" })
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

/**
 * Log cash collected by hand (brief §10): a pending 'cash' donation that
 * hits the leaderboard only once an admin confirms the hand-in. Insert is
 * service-role (donations take no client writes) after verifying the
 * session owns a page; anonymous — hand collections have no single donor.
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
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!mine) return { ok: false, error: "server" };
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

/** Create a team on the runner's event and join it as captain. */
export async function createTeamAndJoin(
  input: unknown,
): Promise<DashboardActionResult> {
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "server" };

  const { data: mine } = await supabase
    .from("fundraisers")
    .select("id, event_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mine) return { ok: false, error: "server" };

  try {
    const service = createServiceClient();
    const base = slugify(parsed.data.name, "tim");
    let teamId: string | null = null;
    for (let attempt = 0; attempt < 5 && !teamId; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`;
      const { data, error } = await service
        .from("teams")
        .insert({
          event_id: mine.event_id,
          name: parsed.data.name,
          slug,
          captain_id: user.id,
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

    const { error: joinError } = await supabase
      .from("fundraisers")
      .update({ team_id: teamId })
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (joinError) return { ok: false, error: "server" };

    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[dashboard] team create failed:", error);
    return { ok: false, error: "server" };
  }
}
