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
  /** The saved event, so a new one can stay open for offers. */
  id?: string;
}

const isoDate = z.string().datetime({ offset: true });

const tierSchema = z.object({
  label: z.string().trim().min(1).max(100),
  amount_cents: z.number().int().min(0).max(MAX_CENTS),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const eventSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().min(1).max(100),
    kind: z.enum(["race", "challenge", "social"]),
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
    description: z.string().trim().max(4000).nullable(),
    offersShirts: z.boolean(),
    coverPath: z.string().trim().max(300).nullable().optional(),
    hosting: z.enum(["own", "external"]).default("own"),
    externalUrl: z.string().trim().url().max(300).nullable().default(null),
    bibPolicy: z.enum(["none", "we_buy"]).default("none"),
    bibCapacity: z.number().int().min(0).max(100_000).nullable().default(null),
    maxGuests: z.number().int().min(0).max(20).default(0),
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
    price_tiers: data.priceTiers.map((tier) => ({ label: tier.label, amount_cents: tier.amount_cents, ...(tier.until ? { until: tier.until } : {}) })),
    is_published: data.isPublished,
    // Only a race can be someone else's; only a gathering brings guests.
    hosting: data.kind === "race" ? data.hosting : "own",
    external_url: data.kind === "race" && data.hosting === "external" ? data.externalUrl : null,
    bib_policy: data.kind === "race" && data.hosting === "external" ? data.bibPolicy : "none",
    bib_capacity: data.kind === "race" && data.hosting === "external" && data.bibPolicy === "we_buy" ? data.bibCapacity : null,
    max_guests: data.kind === "social" ? data.maxGuests : 0,
    description: data.description,
    offers_shirts: data.kind === "social" ? false : data.offersShirts,
    ...(data.coverPath !== undefined ? { cover_path: data.coverPath } : {}),
    // Gatherings have no distances, however the form was driven.
    ...(data.kind !== "race" ? { distances: [] } : {}),
  };

  const supabase = await createClient();
  const { data: saved, error } = data.id
    ? await supabase.from("events").update(row).eq("id", data.id).select("id").single()
    : await supabase.from("events").insert(row).select("id").single();
  if (error || !saved) {
    if (error?.code === "23505") return { ok: false, error: "slug" };
    console.error("[admin] event save failed:", error?.code);
    return { ok: false, error: "server" };
  }

  revalidatePath("/[locale]/admin/dogadjaji", "page");
  revalidatePath("/[locale]/dogadjaji", "layout");
  revalidatePath("/[locale]", "page");
  return { ok: true, id: saved.id };
}

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

/**
 * A new chapter from the event form. Fund splits are copied from the first
 * existing chapter — there is no split editor yet, and inventing ratios
 * would be exactly the kind of number we never make up.
 */
export async function createChapter(
  input: unknown,
): Promise<EventActionResult & { chapter?: { id: string; name: string } }> {
  const parsed = z.object({ name: z.string().trim().min(2).max(80) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: model } = await supabase
    .from("chapters")
    .select("split_local_bp, split_national_bp, split_solidarity_bp")
    .order("name")
    .limit(1)
    .maybeSingle();
  if (!model) return { ok: false, error: "server" };
  const slug = slugify(parsed.data.name, "");
  if (!slug) return { ok: false, error: "invalid" };
  const { data, error } = await supabase
    .from("chapters")
    .insert({ name: parsed.data.name, slug, ...model })
    .select("id, name")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "slug" };
    console.error("[admin] chapter create failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/admin", "layout");
  return { ok: true, chapter: data };
}

/** Publish / unpublish several events at once. */
export async function setEventsPublished(input: unknown): Promise<EventActionResult> {
  const parsed = z
    .object({ ids: z.array(z.string().uuid()).min(1).max(200), published: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ is_published: parsed.data.published })
    .in("id", parsed.data.ids);
  if (error) return { ok: false, error: "server" };

  revalidatePath("/[locale]/admin/dogadjaji", "page");
  revalidatePath("/[locale]/dogadjaji", "layout");
  revalidatePath("/[locale]", "page");
  return { ok: true };
}
