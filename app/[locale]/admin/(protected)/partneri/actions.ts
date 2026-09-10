"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; sponsors_staff_all (migration 0006) enforces.
// Sponsorship money is Operations Fund (brief §11): it never mixes with
// donations, and only signed/active non-in-kind rows count in the total.

export interface SponsorActionResult {
  ok: boolean;
  error?: "invalid" | "server";
}

const sponsorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  tier: z.string().trim().max(60).nullable(),
  chapterId: z.string().uuid().nullable(),
  campaignId: z.string().uuid().nullable(),
  eventId: z.string().uuid().nullable(),
  amountCents: z.number().int().min(0).max(MAX_CENTS).nullable(),
  isInKind: z.boolean(),
  website: z.string().trim().url().max(300).nullable(),
  status: z.enum(["prospect", "negotiating", "signed", "active", "ended"]),
});

export async function saveSponsor(input: unknown): Promise<SponsorActionResult> {
  const parsed = sponsorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const row = {
    name: data.name,
    tier: data.tier,
    chapter_id: data.chapterId,
    campaign_id: data.campaignId,
    event_id: data.eventId,
    amount_cents: data.amountCents,
    is_in_kind: data.isInKind,
    website: data.website,
    status: data.status,
  };

  const supabase = await createClient();
  const { error } = data.id
    ? await supabase.from("sponsors").update(row).eq("id", data.id).select("id").single()
    : await supabase.from("sponsors").insert(row).select("id").single();
  if (error) {
    console.error("[admin] sponsor save failed:", error.code);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]/admin/partneri", "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/transparentnost", "page");
  return { ok: true };
}
