"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; supporters_staff_all and sponsors_staff_all
// enforce. A supporter is the organisation; a sponsorship is one deal
// (money or in kind, on a cause or an event); an offer lives on a
// challenge event (see the events hub).

export interface SupporterActionResult {
  ok: boolean;
  error?: "invalid" | "slug" | "server";
  supporter?: { id: string; name: string };
}

const supporterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  website: z.string().trim().url().max(300).nullable(),
  contactName: z.string().trim().max(120).nullable(),
  contactEmail: z.string().trim().email().max(120).nullable(),
  contactPhone: z.string().trim().max(40).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  isActive: z.boolean(),
  /** Object path in the supporter-logos bucket; undefined leaves it as is. */
  logoPath: z.string().trim().max(300).nullable().optional(),
});

export async function saveSupporter(input: unknown): Promise<SupporterActionResult> {
  const parsed = supporterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const supabase = await createClient();
  const row = {
    name: data.name,
    website: data.website,
    contact_name: data.contactName,
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone,
    notes: data.notes,
    is_active: data.isActive,
    ...(data.logoPath !== undefined ? { logo_path: data.logoPath } : {}),
  };
  const { data: saved, error } = data.id
    ? await supabase.from("supporters").update(row).eq("id", data.id).select("id, name").single()
    : await supabase
        .from("supporters")
        .insert({ ...row, slug: slugify(data.name, "podrska") })
        .select("id, name")
        .single();
  if (error || !saved) {
    if (error?.code === "23505") {
      // Slug taken: retry once with a suffix, names may legitimately repeat.
      const { data: retry, error: retryError } = await supabase
        .from("supporters")
        .insert({ ...row, slug: `${slugify(data.name, "podrska")}-${Math.random().toString(36).slice(2, 6)}` })
        .select("id, name")
        .single();
      if (!retryError && retry) {
        revalidatePath("/[locale]/admin", "layout");
        return { ok: true, supporter: retry };
      }
    }
    console.error("[admin] supporter save failed:", error?.code);
    return { ok: false, error: "server" };
  }
  // Keep the denormalised names on offers in step with the organisation.
  if (data.id) {
    await supabase.from("perk_challenges").update({ partner_name: data.name }).eq("supporter_id", data.id);
    await supabase.from("sponsors").update({ name: data.name }).eq("supporter_id", data.id);
  }
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]/partneri", "page");
  return { ok: true, supporter: saved };
}

const sponsorshipSchema = z.object({
  id: z.string().uuid().optional(),
  supporterId: z.string().uuid(),
  tier: z.string().trim().max(60).nullable(),
  chapterId: z.string().uuid().nullable(),
  campaignId: z.string().uuid().nullable(),
  eventId: z.string().uuid().nullable(),
  amountCents: z.number().int().min(0).max(MAX_CENTS).nullable(),
  isInKind: z.boolean(),
  status: z.enum(["prospect", "negotiating", "signed", "active", "ended"]),
});

/**
 * One sponsorship deal. Money is Operations Fund (brief §11): it never
 * mixes with donations, and only signed/active cash rows count.
 */
export async function saveSponsorship(input: unknown): Promise<SupporterActionResult> {
  const parsed = sponsorshipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const supabase = await createClient();
  const { data: supporter } = await supabase
    .from("supporters")
    .select("name, website")
    .eq("id", data.supporterId)
    .maybeSingle();
  if (!supporter) return { ok: false, error: "invalid" };
  const row = {
    supporter_id: data.supporterId,
    name: supporter.name,
    website: supporter.website,
    tier: data.tier,
    chapter_id: data.chapterId,
    campaign_id: data.campaignId,
    event_id: data.eventId,
    amount_cents: data.amountCents,
    is_in_kind: data.isInKind,
    status: data.status,
  };
  const { error } = data.id
    ? await supabase.from("sponsors").update(row).eq("id", data.id).select("id").single()
    : await supabase.from("sponsors").insert(row).select("id").single();
  if (error) {
    console.error("[admin] sponsorship save failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/transparentnost", "page");
  return { ok: true };
}

/** Show or hide several supporters on the public Partners page. */
export async function setSupportersActive(input: unknown): Promise<SupporterActionResult> {
  const parsed = z
    .object({ ids: z.array(z.string().uuid()).min(1).max(200), active: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("supporters")
    .update({ is_active: parsed.data.active })
    .in("id", parsed.data.ids);
  if (error) return { ok: false, error: "server" };

  revalidatePath("/[locale]/admin/podrska", "page");
  revalidatePath("/[locale]/partneri", "page");
  return { ok: true };
}
