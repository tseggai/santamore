"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; the events_staff_* RLS policies from migration
// 0008 are the enforcement. Events are never deleted — registrations,
// pages and donations hang off them; unpublishing is the off switch.

export interface EventActionResult {
  ok: boolean;
  error?: "invalid" | "slug" | "server";
}

const isoDate = z.string().datetime({ offset: true });

const tierSchema = z.object({
  label: z.string().trim().min(1).max(100),
  amount_cents: z.number().int().min(0).max(MAX_CENTS),
});

const eventSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().min(1).max(100),
    kind: z.enum(["race", "challenge"]),
    challengeMetric: z
      .enum(["distance_m", "moving_time_s", "activity_count", "elevation_m"])
      .nullable(),
    chapterId: z.string().uuid(),
    campaignId: z.string().uuid().nullable(),
    startsAt: isoDate,
    endsAt: isoDate.nullable(),
    venue: z.string().trim().max(200).nullable(),
    capacity: z.number().int().min(0).max(1_000_000).nullable(),
    registrationOpensAt: isoDate.nullable(),
    registrationClosesAt: isoDate.nullable(),
    distances: z.array(z.string().trim().min(1).max(40)).max(20),
    priceTiers: z.array(tierSchema).max(20),
    isPublished: z.boolean(),
  })
  .refine((data) => data.kind !== "challenge" || data.challengeMetric !== null, {
    message: "a challenge needs a metric",
  })
  .refine(
    (data) => !data.endsAt || new Date(data.endsAt) >= new Date(data.startsAt),
    { message: "ends before it starts" },
  );

/** Create or update one event. Slug collisions come back as "slug". */
export async function saveEvent(input: unknown): Promise<EventActionResult> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const slug = slugify(data.slug, "");
  if (!slug) return { ok: false, error: "invalid" };

  const row = {
    name: data.name,
    slug,
    kind: data.kind,
    challenge_metric: data.kind === "challenge" ? data.challengeMetric : null,
    chapter_id: data.chapterId,
    campaign_id: data.campaignId,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    venue: data.venue,
    capacity: data.capacity,
    registration_opens_at: data.registrationOpensAt,
    registration_closes_at: data.registrationClosesAt,
    distances: data.distances,
    price_tiers: data.priceTiers,
    is_published: data.isPublished,
  };

  const supabase = await createClient();
  const { error } = data.id
    ? await supabase.from("events").update(row).eq("id", data.id).select("id").single()
    : await supabase.from("events").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "slug" };
    console.error("[admin] event save failed:", error.code);
    return { ok: false, error: "server" };
  }

  revalidatePath("/[locale]/admin/dogadjaji", "page");
  revalidatePath("/[locale]/dogadjaji", "layout");
  revalidatePath("/[locale]", "page");
  return { ok: true };
}

/** Publish / unpublish without touching anything else. */
export async function setEventPublished(input: unknown): Promise<EventActionResult> {
  const parsed = z
    .object({ id: z.string().uuid(), published: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ is_published: parsed.data.published })
    .eq("id", parsed.data.id)
    .select("id")
    .single();
  if (error) return { ok: false, error: "server" };

  revalidatePath("/[locale]/admin/dogadjaji", "page");
  revalidatePath("/[locale]/dogadjaji", "layout");
  return { ok: true };
}
