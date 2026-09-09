"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";
import { generatePaymentReference } from "@/lib/references";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; campaigns_staff_* RLS policies (migration 0008)
// are the enforcement. The payment reference — the SEPA matching key — is
// minted server-side on creation and never changes afterwards.

export interface CampaignActionResult {
  ok: boolean;
  error?: "invalid" | "slug" | "server";
}

const isoDate = z.string().datetime({ offset: true });
const amounts = z.array(z.number().int().min(100).max(MAX_CENTS)).min(1).max(6);

const campaignSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(1).max(100),
  chapterId: z.string().uuid(),
  description: z.string().trim().max(2000).nullable(),
  goalCents: z.number().int().min(0).max(MAX_CENTS).nullable(),
  startsAt: isoDate.nullable(),
  endsAt: isoDate.nullable(),
  beneficiarySummary: z.string().trim().max(1000).nullable(),
  isPublic: z.boolean(),
  oneoffCents: amounts,
  oneoffDefaultIndex: z.number().int().min(0),
  monthlyCents: amounts,
  monthlyDefaultIndex: z.number().int().min(0),
});

// The donate flow reads {oneoff, monthly} with an optional impact_key per
// amount; the keys exist in messages/*.json for the three launch amounts.
const IMPACT_KEYS: Record<number, string> = { 1000: "impact10", 2500: "impact25", 5000: "impact50" };

function buildSet(cents: number[], defaultIndex: number, withImpact: boolean) {
  return cents.map((amount, index) => ({
    amount_cents: amount,
    ...(index === defaultIndex ? { default: true } : {}),
    ...(withImpact && IMPACT_KEYS[amount] ? { impact_key: IMPACT_KEYS[amount] } : {}),
  }));
}

export async function saveCampaign(input: unknown): Promise<CampaignActionResult> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const slug = slugify(data.slug, "");
  if (!slug) return { ok: false, error: "invalid" };
  if (
    data.oneoffDefaultIndex >= data.oneoffCents.length ||
    data.monthlyDefaultIndex >= data.monthlyCents.length
  ) {
    return { ok: false, error: "invalid" };
  }

  const row = {
    title: data.title,
    slug,
    chapter_id: data.chapterId,
    description: data.description,
    goal_cents: data.goalCents,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    beneficiary_summary: data.beneficiarySummary,
    is_public: data.isPublic,
    suggested_amounts: {
      oneoff: buildSet(data.oneoffCents, data.oneoffDefaultIndex, true),
      monthly: buildSet(data.monthlyCents, data.monthlyDefaultIndex, false),
    },
  };

  const supabase = await createClient();
  if (data.id) {
    const { error } = await supabase
      .from("campaigns")
      .update(row)
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { ok: false, error: "slug" };
      console.error("[admin] campaign update failed:", error.code);
      return { ok: false, error: "server" };
    }
  } else {
    // Reference collisions (23505 on the unique key, P0001 from the
    // cross-table trigger) warrant a fresh mint; a slug collision does not.
    let saved = false;
    for (let attempt = 0; attempt < 5 && !saved; attempt += 1) {
      const { error } = await supabase
        .from("campaigns")
        .insert({ ...row, payment_reference: generatePaymentReference() })
        .select("id")
        .single();
      if (!error) saved = true;
      else if (error.code === "23505" && /slug/.test(error.message)) {
        return { ok: false, error: "slug" };
      } else if (error.code !== "23505" && error.code !== "P0001") {
        console.error("[admin] campaign create failed:", error.code);
        return { ok: false, error: "server" };
      }
    }
    if (!saved) return { ok: false, error: "server" };
  }

  revalidatePath("/[locale]/admin/kampanje", "page");
  revalidatePath("/[locale]/podrzi", "page");
  revalidatePath("/[locale]", "page");
  return { ok: true };
}
